import type { Request } from 'express';
import type { AdminSessionUser } from '../auth/guards/admin-session.guard';

/** userId of the admin acting via the admin_session cookie, or undefined for X-Admin-Secret (service/system) calls */
export function actorIdFrom(req: Request): string | undefined {
  return (req as Request & { adminUser?: AdminSessionUser }).adminUser?.userId;
}
