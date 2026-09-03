import { api } from './client';
import type { DashboardStats } from './types';

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/admin/dashboard'),
};
