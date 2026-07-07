import { api } from './client';
import type { Client, ClientWithSecret } from './types';

export interface CreateClientPayload {
  name: string;
  redirectUris: string[];
  allowedScopes?: string;
}

export interface UpdateClientPayload {
  name?: string;
  redirectUris?: string[];
  allowedScopes?: string;
  isActive?: boolean;
}

export const clientsApi = {
  list: () => api.get<Client[]>('/admin/clients'),
  create: (payload: CreateClientPayload) =>
    api.post<ClientWithSecret>('/admin/clients', payload),
  update: (id: string, payload: UpdateClientPayload) =>
    api.patch<Client>(`/admin/clients/${id}`, payload),
  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/admin/clients/${id}`),
  bulkRemove: (ids: string[]) => api.delete<{ count: number }>('/admin/clients/bulk', { ids }),
};
