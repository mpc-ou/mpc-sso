import { api } from './client';
import type { Department } from './types';

export interface CreateDepartmentPayload {
  name: string;
  code: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export const departmentsApi = {
  list: () => api.get<Department[]>('/admin/departments'),
  create: (payload: CreateDepartmentPayload) =>
    api.post<Department>('/admin/departments', payload),
  update: (id: string, payload: UpdateDepartmentPayload) =>
    api.patch<Department>(`/admin/departments/${id}`, payload),
  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/admin/departments/${id}`),
  bulkRemove: (ids: string[]) => api.delete<{ count: number }>('/admin/departments/bulk', { ids }),
};
