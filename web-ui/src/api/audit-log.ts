import { api } from './client';
import type { AuditLogEntry, Paginated } from './types';

export const auditLogApi = {
  list: (page = 1, limit = 30, event = '') => {
    let url = `/admin/audit-log?page=${page}&limit=${limit}`;
    if (event) url += `&event=${encodeURIComponent(event)}`;
    return api.get<Paginated<AuditLogEntry>>(url);
  },
};
