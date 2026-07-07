import { api } from './client';
import type { User } from './types';

export interface LoginPayload {
  login: string;
  password: string;
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<{ message: string }>('/admin/ui/login', payload),
  logout: () => api.post<{ message: string }>('/admin/ui/logout'),
  me: () => api.get<User>('/admin/ui/me'),
  forgotPassword: (email: string) => api.post<{ message: string }>('/password/forgot', { email }),
  resetPassword: (payload: { token: string; newPassword: string }) => api.post<{ message: string }>('/password/reset', payload),
};
