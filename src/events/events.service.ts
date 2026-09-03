import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/config';
import { buildDiscordEmbed, isDiscordWebhookUrl } from './discord-embed';
import { decryptSecret, hmacSha256Hex } from '../lib/crypto';
import { PrismaService } from '../prisma/prisma.service';

export const PUBLIC_EVENTS = [
  'profile.updated',
  'member.changed',
  'auth.login',
] as const;
export type PublicEvent = (typeof PUBLIC_EVENTS)[number];

export interface RecordEventInput {
  event: string;
  actorId?: string;
  actorLabel?: string;
  targetId?: string;
  targetLabel?: string;
  changedFields?: string[];
  extra?: Record<string, unknown>;
  ip?: string;
}

const DELIVERY_TIMEOUT_MS = 5000;
const MAX_DELIVERIES_PER_WEBHOOK = 50;

function isPublicEvent(event: string): event is PublicEvent {
  return (PUBLIC_EVENTS as readonly string[]).includes(event);
}

function inferActionFromEvent(event: string): string | undefined {
  const suffix = event.split('.').pop();
  return suffix === 'created' || suffix === 'updated' || suffix === 'deleted'
    ? suffix
    : undefined;
}

/**
 * undici wraps the real network failure in `err.cause` (e.g. a bare "fetch
 * failed" hides a ConnectTimeoutError/ETIMEDOUT underneath) — walk the cause
 * chain so the delivery record is self-diagnosable without reproducing it.
 */
function formatDeliveryError(err: unknown): string {
  if (!(err instanceof Error)) return 'Unknown delivery error';

  const parts = [err.message];
  let cause: unknown = err.cause;
  for (let depth = 0; depth < 3 && cause instanceof Error; depth++) {
    if (cause.message) parts.push(cause.message);
    cause = cause.cause;
  }
  return parts.join(': ').slice(0, 300);
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /** Always writes an audit log row; additionally dispatches webhooks for public events. Never throws. */
  async record(input: RecordEventInput): Promise<void> {
    try {
      // If the caller didn't supply changedFields or extra detail, fall back to
      // whatever the event name itself implies (e.g. "client.created" -> action: "created")
      // so the audit log never shows a bare "—" for a routine create/update/delete.
      const inferredAction = input.changedFields?.length
        ? undefined
        : inferActionFromEvent(input.event);
      const extra =
        input.extra ??
        (inferredAction ? { action: inferredAction } : undefined);

      const [actor, target] = await Promise.all([
        this.lookupUser(input.actorId),
        this.lookupUser(input.targetId),
      ]);
      const actorLabel = input.actorLabel ?? actor?.username;
      const targetLabel = input.targetLabel ?? target?.username;

      await this.prisma.auditLog.create({
        data: {
          event: input.event,
          actorId: input.actorId,
          actorLabel,
          targetId: input.targetId,
          targetLabel,
          changedFields: input.changedFields?.length
            ? JSON.stringify(input.changedFields)
            : undefined,
          metadata: extra ? JSON.stringify(extra) : undefined,
          ip: input.ip,
        },
      });

      if (!isPublicEvent(input.event)) return;

      const webhooks = await this.prisma.webhook.findMany({
        where: { event: input.event, isActive: true },
      });
      if (webhooks.length === 0) return;

      const customPayload = JSON.stringify({
        event: input.event,
        timestamp: new Date().toISOString(),
        data: {
          actorId: input.actorId,
          actorDiscordId: actor?.discordId ?? undefined,
          targetId: input.targetId,
          targetDiscordId: target?.discordId ?? undefined,
          changedFields: input.changedFields,
          ...extra,
        },
      });

      const discordPayload = buildDiscordEmbed({
        event: input.event,
        actorLabel,
        actorDiscordId: actor?.discordId ?? undefined,
        targetLabel,
        targetDiscordId: target?.discordId ?? undefined,
        changedFields: input.changedFields,
        extra,
        ip: input.ip,
      });

      for (const webhook of webhooks) {
        void this.deliver(
          webhook,
          input.event,
          isDiscordWebhookUrl(webhook.url) ? discordPayload : customPayload,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to record event ${input.event}`, err as Error);
    }
  }

  private async deliver(
    webhook: { id: string; url: string; secretEnc: string },
    event: string,
    payload: string,
  ): Promise<void> {
    const start = Date.now();
    let ok = false;
    let statusCode: number | undefined;
    let error: string | undefined;

    try {
      const secret = decryptSecret(
        webhook.secretEnc,
        this.configService.get('sessionSecret', { infer: true }),
      );
      const signature = hmacSha256Hex(secret, payload);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MPC-Signature': `sha256=${signature}`,
          'X-MPC-Event': event,
        },
        body: payload,
        redirect: 'manual',
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      statusCode = res.status;
      ok = res.ok;
    } catch (err) {
      error = formatDeliveryError(err);
    }

    const durationMs = Date.now() - start;
    const webhookId = webhook.id;

    try {
      await this.prisma.webhookDelivery.create({
        data: { webhookId, event, statusCode, ok, error, durationMs },
      });
      await this.pruneDeliveries(webhookId);
    } catch (err) {
      this.logger.error(
        `Failed to record webhook delivery for ${webhookId}`,
        err as Error,
      );
    }
  }

  private async lookupUser(
    userId?: string,
  ): Promise<{ username: string; discordId: string | null } | undefined> {
    if (!userId) return undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, discordId: true },
    });
    return user ?? undefined;
  }

  private async pruneDeliveries(webhookId: string): Promise<void> {
    const toKeep = await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: MAX_DELIVERIES_PER_WEBHOOK,
      select: { id: true },
    });
    if (toKeep.length < MAX_DELIVERIES_PER_WEBHOOK) return;

    await this.prisma.webhookDelivery.deleteMany({
      where: {
        webhookId,
        id: { notIn: toKeep.map((d) => d.id) },
      },
    });
  }
}
