# Admin Ops: Webhooks, Audit Log, Dashboard Metrics — Design (Phase 2)

Status: Approved for implementation (2026-09-04)
Scope: Phase 2 of 2. Builds on the self-service profile/login work in
`2026-09-03-self-service-profile-design.md`.

## Goal

Give admins visibility and integration points for the self-service profile
system built in Phase 1:
- Webhooks so external tools (starting with a future Discord bot) can react
  to profile changes, member management, and logins.
- A compact audit log covering the same events plus the admin actions that
  produce them.
- Dashboard stats: login counts, recent activity, and access IPs.

## A. Event vocabulary

Three webhook-facing events, matching what was asked for:

| Event | Fires on | Payload `data` |
|---|---|---|
| `profile.updated` | Any User field change — self-service `PATCH /profile` or admin `PATCH /admin/users/:id` | `{ userId, changedFields: string[] }` |
| `member.changed` | Admin User create/update/delete via `/admin/users` | `{ userId, action: 'created'\|'updated'\|'deleted', changedFields?: string[] }` |
| `auth.login` | Any successful login — password, Google, or admin panel | `{ userId, method: 'password'\|'google'\|'admin', ip }` |

Scope decision: `member.changed` covers `User` CRUD only, not `ClubRole`
(department/position assignments) — keeps the event surface small for this
pass; straightforward to add a `role.changed` event later if needed.

`changedFields` is a list of field *names* only (e.g. `["phone","bio"]`),
never values — keeps rows small and never risks logging PII/secrets in a
log or a webhook payload the admin didn't explicitly ask for.

## B. Shared event/audit foundation

A single service, `EventsService.record(input)`, called from every
trigger point:

```ts
interface RecordEventInput {
  event: string; // 'profile.updated' | 'member.changed' | 'auth.login' | 'webhook.created' | 'webhook.updated' | 'webhook.deleted'
  actorId?: string;
  actorLabel?: string; // denormalized username, survives actor deletion
  targetId?: string;
  targetLabel?: string;
  changedFields?: string[];
  extra?: Record<string, unknown>; // small values only (action, method, ip) — merged into webhook `data`
  ip?: string;
}
```

Behavior:
1. Always writes one `AuditLog` row.
2. If `event` is one of the 3 public events, looks up active `Webhook`
   rows where `webhook.event === event`, and dispatches each
   fire-and-forget (see D).

Trigger points:
- `ProfileService.updateProfile` → `profile.updated` (actor = target = self)
- `UsersService.update` → `profile.updated` **and** `member.changed`
  (action: `updated`) — both fire; a subscriber picks whichever
  granularity it cares about
- `UsersService.create` → `member.changed` (action: `created`)
- `UsersService.delete` / `bulkDelete` → `member.changed` (action:
  `deleted`), one event per id
- `AuthService.completeAuthorization` (covers self-login flow, Google
  login, and any third-party OIDC client login) → `auth.login`
- `AdminSessionService.login` → `auth.login` (method: `admin`)
- `WebhooksService.create/update/remove` → `webhook.created` /
  `webhook.updated` / `webhook.deleted` (audit-only, not webhook-dispatched
  — dispatching on webhook-config-change would be pointless/recursive)

## C. Database schema

```prisma
model Webhook {
  id         String   @id @default(cuid())
  event      String   // one of the 3 public events
  url        String
  secretHash String   // HMAC secret is hashed at rest, like Client.clientSecretHash; plaintext returned once at creation
  isActive   Boolean  @default(true)
  createdBy  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  deliveries WebhookDelivery[]

  @@index([event])
  @@map("webhooks")
}

model WebhookDelivery {
  id         String   @id @default(cuid())
  webhookId  String
  event      String
  statusCode Int?
  ok         Boolean
  error      String?
  durationMs Int
  createdAt  DateTime @default(now())

  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
  @@map("webhook_deliveries")
}

model AuditLog {
  id            String   @id @default(cuid())
  event         String
  actorId       String?
  actorLabel    String?
  targetId      String?
  targetLabel   String?
  changedFields String?  // JSON string array, nullable
  ip            String?
  createdAt     DateTime @default(now())

  @@index([event])
  @@index([actorId])
  @@index([createdAt])
  @@map("audit_logs")
}

model LoginEvent {
  id        String   @id @default(cuid())
  userId    String
  method    String   // "password" | "google" | "admin"
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@map("login_events")
}
```

On `User`, add `lastActiveAt DateTime?` and `lastActiveIp String?`.

`WebhookDelivery` rows are pruned to the most recent 50 per webhook on
insert (single extra delete query) — keeps the delivery log from growing
unbounded without needing a cron job.

## D. Webhook delivery

On a public event, for each active matching `Webhook`:
- Build payload: `{ event, timestamp, data }` (JSON).
- Sign: `X-MPC-Signature: sha256=<hex hmac>` where the HMAC key is the
  webhook's plaintext secret (never stored) and the message is the raw
  JSON body — same convention as GitHub webhooks, documented in the tips
  popover.
- `fetch(url, { method: 'POST', body, headers, signal: AbortSignal.timeout(5000) })`,
  fire-and-forget (not awaited by the request that triggered it).
- Record one `WebhookDelivery` row: `ok` (2xx response), `statusCode`,
  `error` (network/timeout message if any), `durationMs`.
- No retries — matches the earlier "simplest thing that works" call.

## E. Dashboard metrics

- `User.lastActiveAt`/`lastActiveIp` touched by `BearerAuthGuard`,
  `SelfAuthGuard`, `AdminGuard`, and `AdminSessionGuard` on every
  authenticated request — throttled: skip the write if `lastActiveAt` is
  already within the last 60 seconds (checked against the already-fetched
  user row, no extra query).
- `GET /admin/dashboard` (new, `AdminGuard`) returns:
  - `totalLogins`, `loginsToday` (`LoginEvent` counts)
  - `activeNow` (`User` count where `lastActiveAt` within last 15 minutes)
  - `recentLogins`: last 20 `LoginEvent` rows joined with username/ip/method/time
- `DashboardPage.tsx` gains two new stat cards (Tổng lượt đăng nhập, Đang
  hoạt động) alongside the existing Users/Departments/Clients cards, plus
  a "Đăng nhập gần đây" table below.

## F. Admin UI

- **Webhooks page** (`/webhooks`, new sidebar entry): table of webhooks
  (event, URL, active toggle, last delivery status, delete); "Thêm
  webhook" dialog (event select of the 3 types, URL input) that shows the
  plaintext secret once on creation, matching the existing OAuth Client
  creation flow (`ClientWithSecret` pattern). A tips icon next to the
  table header opens a popover explaining: the 3 event types and their
  payload shape, the `X-MPC-Signature` HMAC verification steps, and that
  there are no retries.
- **Audit Log page** (`/audit-log`, new sidebar entry): paginated table
  (time, event, actor, target, changed fields, ip), with an event-type
  filter dropdown.

## Out of scope

- `ClubRole` change events (see scope decision in A).
- Webhook retries/queueing.
- Per-user IP history (only last-known IP is tracked, per the earlier
  decision in Phase 1 brainstorming).
- Failed-login tracking (only successful logins are recorded).

## Testing notes

- `EventsService.record`: unit test that it always writes an `AuditLog`
  row and only dispatches webhooks for the 3 public events.
- Webhook dispatch: unit test the HMAC signature computation and the
  delivery-log pruning (keep 50 most recent).
- `GET /admin/dashboard`: unit test the aggregation queries against a
  seeded set of `LoginEvent`/`User` rows.
