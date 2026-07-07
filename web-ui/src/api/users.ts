import { api } from './client';
import type { Paginated, User, WebRole } from './types';

export interface CreateUserPayload {
  username: string;
  email?: string;
  password?: string;
  webRole?: WebRole;
  isDisabled?: boolean;

  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  address?: string;
  className?: string;
  mssv?: string;
  faculty?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
}

export interface UpdateUserPayload {
  email?: string;
  webRole?: WebRole;
  isDisabled?: boolean;
  password?: string;

  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  address?: string;
  className?: string;
  mssv?: string;
  faculty?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
}

export const usersApi = {
  list: (page = 1, limit = 20, search = '', webRole = '', status = '', sortBy = '', sortOrder = '') => {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (webRole) url += `&webRole=${webRole}`;
    if (status) url += `&status=${status}`;
    if (sortBy) url += `&sortBy=${sortBy}`;
    if (sortOrder) url += `&sortOrder=${sortOrder}`;
    return api.get<Paginated<User>>(url);
  },
  get: (id: string) => api.get<User>(`/admin/users/${id}`),
  create: (payload: CreateUserPayload) => api.post<User>('/admin/users', payload),
  update: (id: string, payload: UpdateUserPayload) =>
    api.patch<User>(`/admin/users/${id}`, payload),
  remove: (id: string) =>
    api.delete<{ id: string; deleted: boolean }>(`/admin/users/${id}`),
  bulkRemove: (ids: string[]) =>
    api.delete<{ count: number }>('/admin/users/bulk', { ids }),
  uploadAvatar: (file: File, oldUrl?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    let url = '/admin/users/upload-avatar';
    if (oldUrl) {
      url += `?oldUrl=${encodeURIComponent(oldUrl)}`;
    }
    return api.post<{ url: string }>(url, formData);
  },
};
