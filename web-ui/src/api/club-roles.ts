import { api } from './client';
import type { ClubPosition, ClubRole, Paginated } from './types';

export interface CreateClubRolePayload {
  userId: string;
  departmentId?: string;
  position: ClubPosition;
  term?: number;
  note?: string;
  startAt: string;
  endAt?: string;
}

export interface UpdateClubRolePayload {
  departmentId?: string;
  position?: ClubPosition;
  term?: number;
  note?: string;
  startAt?: string;
  endAt?: string;
}

export const clubRolesApi = {
  list: (page = 1, limit = 20) =>
    api.get<Paginated<ClubRole>>(`/admin/club-roles?page=${page}&limit=${limit}`),
  create: (payload: CreateClubRolePayload) => api.post<ClubRole>('/admin/club-roles', payload),
  update: (id: string, payload: UpdateClubRolePayload) =>
    api.patch<ClubRole>(`/admin/club-roles/${id}`, payload),
  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/admin/club-roles/${id}`),
};
