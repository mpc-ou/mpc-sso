# Self-Service Profile & Default Login — Design (Phase 1)

Status: Approved for implementation (2026-09-03)
Scope: Phase 1 of 2. Phase 2 (webhooks, dashboard metrics, audit log) is a
separate follow-up spec.

## Goal

- `GET https://auth.mpclub.dev/login` with no `client_id` logs the user
  directly into a self-service profile UI (password or Google), instead of
  failing with "missing request_id".
- Non-admin users only ever get `/profile`. Admins additionally get a link
  into the existing `/admin/ui` SPA. (Non-admins are already rejected at
  admin login time — no new restriction needed there.)
- Users can edit their own personal info (phone, address, dob, avatar, MSSV,
  class, faculty, bio) and link a Discord account, through a zone/modal UI.
- Certain fields become immutable once first set. Admins can additionally
  lock a user's profile entirely from `/admin/ui/users`.

## Why the login flow isn't a plain SPA PKCE flow

`TokenService.exchangeAuthorizationCode` requires `client_secret` even when
PKCE (`code_verifier`) is present — this codebase has no "public client"
concept. A browser SPA cannot hold a client secret safely. Rather than
weakening the token endpoint's security model for all clients, Phase 1 uses
a **BFF (backend-for-frontend) pattern**: the code→token exchange for the
profile's own first-party client happens server-side, in-process, and the
browser only ever receives an HttpOnly session cookie. This still reuses
100% of the existing login/Google/AuthCode machinery end-to-end — only the
final exchange step moves server-side.

## A. Self-login flow

1. Seed a first-party `Client` row at deploy time:
   - `clientId` = `SELF_CLIENT_ID` env var, `clientSecretHash` = hash of
     `SELF_CLIENT_SECRET` env var (same provisioning pattern as
     `ADMIN_SECRET`/`SERVICE_API_KEY`).
   - `name`: "Hồ sơ MPC SSO", `redirectUris`: `["<ISSUER>/login/self/callback"]`,
     `allowedScopes`: `"openid profile email"`.
2. `GET /login` with no `?request_id`:
   - If a valid `sso_session` cookie already exists → 302 to `/profile`.
   - Else → 302 to `GET /login/self`.
3. `GET /login/self` (new, `AuthController`):
   - Generates a PKCE `code_verifier`/`code_challenge` (S256) server-side.
   - Stashes the verifier in a short-lived HttpOnly cookie `mpc_pkce_v`
     (Secure, SameSite=Lax, Path=`/login`, TTL matching
     `PENDING_AUTH_TTL_MS`).
   - Calls `authService.authorize(...)` against the self client with
     `redirect_uri = <ISSUER>/login/self/callback`, gets back a
     `PendingAuthorization`.
   - 302 to `/login?request_id=<pending.id>` — **the existing
     `OidcLoginPage` renders unchanged**; password and Google login both
     just work.
4. On success, `completeAuthorization` redirects to
   `/login/self/callback?code=&state=` (a backend route, not a static
   page).
5. `GET /login/self/callback` (new, `AuthController`):
   - Reads `mpc_pkce_v` cookie (400 if missing — expired flow).
   - Calls the token-exchange logic in-process (extract the body of
     `TokenService.exchangeAuthorizationCode` into a method callable
     without going over HTTP, using `SELF_CLIENT_ID`/`SELF_CLIENT_SECRET`
     from config) to get an access/refresh token pair.
   - Creates a `UserSession` row: `sessionId` (random token),
     `userId`, `ip` (from request), `userAgent`, `expiresAt` (7 days,
     matching `AdminSession` TTL).
   - Sets `sso_session` HttpOnly cookie (Secure, SameSite=Lax, Path=`/`),
     clears `mpc_pkce_v`.
   - 302 to `/profile`.
6. `POST /login/self/logout`: clears `sso_session` cookie, deletes the
   `UserSession` row, revokes the underlying refresh token.
7. `ProfileController` gets a new `SelfAuthGuard`: tries the `sso_session`
   cookie first (looks up `UserSession` → `userId`), falls back to the
   existing `Bearer` token check (unchanged behavior for any other API
   consumer). `/userinfo` (the real OIDC third-party claims endpoint) is
   untouched.

## B. Database schema (Prisma)

```prisma
model UserSession {
  id        String   @id @default(cuid())
  sessionId String   @unique
  userId    String
  ip        String?
  userAgent String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@map("user_sessions")
}
```

On `User`, add:
- `isProfileLocked Boolean @default(false)`
- `discordId String? @unique`
- `discordUsername String?`
- `discordAvatar String?`
- `discordLinkedAt DateTime?`

Config additions (`src/config/config.ts`, all optional/empty-string-default
like the existing `google` block):
- `selfClient: { clientId, clientSecret }`
- `discord: { clientId, clientSecret, callbackUrl }`

Seed script (`prisma/seed.ts`) upserts the self `Client` row using
`SELF_CLIENT_ID`/`SELF_CLIENT_SECRET` from env, matching the existing admin
user upsert pattern.

## C. Field-lock business rules

Enforced in `ProfileService.updateProfile`, two independent checks:

1. **Immutable-once-set**: for `phone`, `dob`, `className`, `mssv`,
   `faculty`, `address` — if the current DB value is non-null/non-empty and
   the incoming value would be empty/null, reject with a bilingual 400.
   First-time fill, or non-empty→non-empty change, is allowed.
2. **Admin lock** (`isProfileLocked`): if true, reject the entire PATCH
   with a bilingual 403 before touching any field. Does not affect admin
   edits via `UsersController`/`UpdateUserDto`.

`UpdateUserDto` (admin) gains `isProfileLocked?: boolean`.

## D. Discord account linking

Requires an active `sso_session` (uses `SelfAuthGuard`).

- `GET /connect/discord` → redirect to Discord OAuth consent (only exposed
  in `/profile` UI when `discord.clientId` is configured, same pattern as
  `isGoogleEnabled()`).
- `GET /connect/discord/callback` → verifies `state` ties back to the
  logged-in session, sets `discordId`/`discordUsername`/`discordAvatar`/
  `discordLinkedAt`. 409 if that Discord account is already linked to a
  different user (`discordId` is `@unique`).
- `DELETE /connect/discord` → clears the four fields.

This is account-linking, not login — it never touches
`PendingAuthorization`/`AuthCode`.

## E. Profile UI (`web-ui`)

New Vite entry `profile.html` → `profile-main.tsx`, served by a new
`GET /profile` route (same `res.sendFile` pattern as
`StaticUiController`). Single page (no client-side sub-routing needed),
zone cards each with a pencil-icon button opening a `Dialog` (reusing
`ui/dialog.tsx`) scoped to that zone's fields only:

- **Cá nhân** — first/middle/last name, avatar upload. Always editable.
- **Sinh viên** — MSSV, lớp, khoa. Immutable-once-set; filled fields render
  read-only with a "đã khóa sau khi điền" hint.
- **Liên hệ** — phone, address, ngày sinh. Immutable-once-set.
- **Tiểu sử** — bio. Always editable.
- **Tài khoản liên kết** — Google (status indicator only), Discord
  (connect/disconnect button, hidden if not configured).
- **Bảo mật** — change password.

If `isProfileLocked` is true, every edit button across all zones is
disabled with a tooltip explaining an admin has locked the profile.
Admins additionally see a persistent "Vào trang quản trị" link to
`/admin/ui`.

## F. Admin UI

`UserEditPage`/`UserDetailPage` gains a lock/unlock switch calling
`PATCH /admin/users/:id` with `isProfileLocked`.

## G. i18n

New `profile` namespace added to `web-ui/src/i18n/locales/{vi,en}.json`,
following the existing `oidcLogin`/`adminLogin` namespace convention.

## Out of scope (Phase 1)

Webhooks, audit log, dashboard login/activity/IP metrics — Phase 2, separate
spec, built after this one ships since they hook into the same event
points (login, profile update) this phase introduces.

## Testing notes

- `AuthService`/`TokenService` exchange-in-process refactor: unit test the
  extracted method directly (no HTTP layer) plus the existing
  authorization-code exchange test coverage should keep passing unchanged.
- `SelfAuthGuard`: unit test both the cookie path and the Bearer fallback.
- `ProfileService.updateProfile`: unit test both lock rules independently
  (immutable-once-set per field, and the global `isProfileLocked` gate).
- E2E: full `/login` → `/login/self` → password submit → `/login/self/callback`
  → `/profile` redirect chain, and the same via the Google branch.
