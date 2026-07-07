import { api } from './client';

export interface LoginInfo {
  clientName?: string;
  googleEnabled: boolean;
}

export interface OidcLoginPayload {
  login: string;
  password: string;
  request_id: string;
}

export const oidcAuthApi = {
  getInfo: (requestId: string) =>
    api.get<LoginInfo>(`/login/info?request_id=${encodeURIComponent(requestId)}`),
  login: (payload: OidcLoginPayload) =>
    api.post<{ redirectUrl: string }>('/login', payload),
};
