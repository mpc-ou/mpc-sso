import { api } from './client';
import type { Webhook, WebhookDelivery, WebhookEvent, WebhookWithSecret } from './types';

export interface CreateWebhookPayload {
  events: WebhookEvent[];
  url: string;
}

export interface UpdateWebhookPayload {
  url?: string;
  isActive?: boolean;
  events?: WebhookEvent[];
}

export const webhooksApi = {
  events: () => api.get<WebhookEvent[]>('/admin/webhooks/events'),
  list: () => api.get<Webhook[]>('/admin/webhooks'),
  create: (payload: CreateWebhookPayload) =>
    api.post<WebhookWithSecret>('/admin/webhooks', payload),
  update: (id: string, payload: UpdateWebhookPayload) =>
    api.patch<Webhook>(`/admin/webhooks/${id}`, payload),
  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/admin/webhooks/${id}`),
  deliveries: (id: string) => api.get<WebhookDelivery[]>(`/admin/webhooks/${id}/deliveries`),
};
