import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Webhook, WebhookDelivery } from '@prisma/client';
import type { AppConfig } from '../../config/config';
import { EventsService } from '../../events/events.service';
import { encryptSecret, generateToken } from '../../lib/crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateWebhookDto } from './dto/create-webhook.dto';
import type { UpdateWebhookDto } from './dto/update-webhook.dto';

function toSafe(webhook: Webhook & { deliveries?: WebhookDelivery[] }) {
  const { secretEnc: _secretEnc, deliveries, ...safe } = webhook;
  return { ...safe, lastDelivery: deliveries?.[0] ?? null };
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly events: EventsService,
  ) {}

  async list() {
    const webhooks = await this.prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
      include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return webhooks.map(toSafe);
  }

  /** Returns the plaintext secret exactly once — it is never retrievable again */
  async create(dto: CreateWebhookDto, actorId?: string) {
    const secret = generateToken();
    const secretEnc = encryptSecret(
      secret,
      this.configService.get('sessionSecret', { infer: true }),
    );

    const webhook = await this.prisma.webhook.create({
      data: {
        event: dto.event,
        url: dto.url,
        secretEnc,
        createdBy: actorId ?? 'system',
      },
    });

    await this.events.record({
      event: 'webhook.created',
      actorId,
      targetId: webhook.id,
      targetLabel: webhook.url,
    });

    return { ...toSafe(webhook), secret };
  }

  async update(id: string, dto: UpdateWebhookDto, actorId?: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const updated = await this.prisma.webhook.update({
      where: { id },
      data: { url: dto.url, isActive: dto.isActive },
    });

    await this.events.record({
      event: 'webhook.updated',
      actorId,
      targetId: id,
      targetLabel: updated.url,
    });

    return toSafe(updated);
  }

  async remove(id: string, actorId?: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    await this.prisma.webhook.delete({ where: { id } });

    await this.events.record({
      event: 'webhook.deleted',
      actorId,
      targetId: id,
      targetLabel: webhook.url,
    });

    return { id, deleted: true };
  }

  async deliveries(id: string) {
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
