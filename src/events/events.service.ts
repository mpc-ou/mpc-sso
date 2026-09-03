import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/config';
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

/** e.g. "department.created" -> "created" — lets the audit log show a default action when a caller didn't pass one */
function inferActionFromEvent(event: string): string | undefined {
  const suffix = event.split('.').pop();
  return suffix === 'created' || suffix === 'updated' || suffix === 'deleted'
    ? suffix
    : undefined;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async record(input: RecordEventInput): Promise<void> {
    // If the caller didn't supply changedFields or extra detail, fall back to
    // whatever the event name itself implies (e.g. "client.created" -> action: "created")
    // so the audit log never shows a bare "—" for a routine create/update/delete.
    const inferredAction = input.changedFields?.length
      ? undefined
      : inferActionFromEvent(input.event);
    const extra =
      input.extra ?? (inferredAction ? { action: inferredAction } : undefined);

    try {
      const actorLabel =
        input.actorLabel ?? (await this.lookupUsername(input.actorId));
      const targetLabel =
        input.targetLabel ?? (await this.lookupUsername(input.targetId));

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
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for ${input.event}`,
        err as Error,
      );
    }

    if (!isPublicEvent(input.event)) return;

    const webhooks = await this.prisma.webhook.findMany({
      where: { event: input.event, isActive: true },
    });
    if (webhooks.length === 0) return;

    const payload = JSON.stringify({
      event: input.event,
      timestamp: new Date().toISOString(),
      data: {
        actorId: input.actorId,
        targetId: input.targetId,
        changedFields: input.changedFields,
        ...extra,
      },
    });

    for (const webhook of webhooks) {
      void this.deliver(webhook, input.event, payload);
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
        // Never follow redirects — a compromised/malicious target could 302
        // to an internal address, bypassing the SSRF check done at write time.
        redirect: 'manual',
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      statusCode = res.status;
      ok = res.ok;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown delivery error';
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

  private async lookupUsername(userId?: string): Promise<string | undefined> {
    if (!userId) return undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    return user?.username;
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
