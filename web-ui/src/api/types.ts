export type WebRole = 'ADMIN' | 'COLLABORATOR' | 'MEMBER' | 'GUEST';

export type ClubPosition =
  | 'PRESIDENT'
  | 'VICE_PRESIDENT'
  | 'DEPARTMENT_LEADER'
  | 'DEPARTMENT_VICE_LEADER'
  | 'DEPARTMENT_MEMBER'
  | 'COLLABORATOR'
  | 'ADVISOR';

export interface User {
  id: string;
  username: string;
  email: string | null;
  googleId: string | null;
  webRole: WebRole;
  isDisabled: boolean;
  isProfileLocked?: boolean;

  // Profile fields (merged from Member)
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  address?: string | null;
  className?: string | null;
  mssv?: string | null;
  faculty?: string | null;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;

  // Discord account link
  discordId?: string | null;
  discordUsername?: string | null;
  discordAvatar?: string | null;
  discordLinkedAt?: string | null;

  createdAt: string;
  updatedAt: string;
  clubRoles?: ClubRole[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClubRole {
  id: string;
  userId: string;
  departmentId: string | null;
  department?: Department | null;
  position: ClubPosition;
  term: number | null;
  note: string | null;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWithSecret extends Client {
  clientSecret: string;
}

export type WebhookEvent = 'profile.updated' | 'member.changed' | 'auth.login';

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number | null;
  ok: boolean;
  error: string | null;
  durationMs: number;
  createdAt: string;
}

export interface Webhook {
  id: string;
  event: string;
  url: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastDelivery: WebhookDelivery | null;
}

export interface WebhookWithSecret extends Webhook {
  secret: string;
}

export interface AuditLogEntry {
  id: string;
  event: string;
  actorId: string | null;
  actorLabel: string | null;
  targetId: string | null;
  targetLabel: string | null;
  changedFields: string[];
  ip: string | null;
  createdAt: string;
}

export interface RecentLogin {
  id: string;
  username: string;
  avatar: string | null;
  method: string;
  ip: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalLogins: number;
  loginsToday: number;
  activeNow: number;
  recentLogins: RecentLogin[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
