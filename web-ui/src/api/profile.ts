import { api } from './client';
import type { User } from './types';

export interface UpdateProfilePayload {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  className?: string;
  mssv?: string;
  faculty?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

export const profileApi = {
  me: () => api.get<User>('/profile'),
  update: (payload: UpdateProfilePayload) => api.patch<User>('/profile', payload),
  logout: () => api.post<{ message: string }>('/login/self/logout'),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ url: string }>('/profile/upload-avatar', form);
  },
};

export const discordApi = {
  enabled: () => api.get<{ enabled: boolean }>('/connect/discord/enabled'),
  unlink: () => api.delete<User>('/connect/discord'),
};
