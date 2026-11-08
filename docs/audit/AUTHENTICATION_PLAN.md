# 21CTA — Central Authentication Plan

## 1. Current state
| | LPG | RMS-MIS |
|---|---|---|
| Identity store | MySQL `users` (INT id) | Supabase `auth.users` (UUID) + `public.users` profile |
| Credentials | bcrypt `password_hash` (cost 10). Login by email **or phone**. Google OAuth (Passport) | Supabase email + password. Accounts are created by DOS (teachers via RPC/edge function, learners via edge function) |
| Token | HS256 JWT `{id,email,role}`, default 7 days, stored in `localStorage` | Supabase session (access + refresh), managed by supabase-js |
| Self sign-up | Yes (teacher). Device fingerprint limits multiple accounts | No (only a teacher profile row is self-created after an account exists) |
| Roles | admin, teacher | dos (scoped by level), teacher, headteacher, principal, parent, learner |
| Authorisation | Express middleware (`authMiddleware`, `roleMiddleware`, `adminMiddleware`) + ownership checks in queries | Postgres RLS + SECURITY DEFINER helpers |

## 2. Conflicts
1. **Two identity stores with different ID types.** The same teacher can exist in both with the same email and different passwords.
2. **Role vocabularies differ.** `admin` (LPG platform owner) ≠ `dos` (school academic admin).
3. **Login identifiers differ.** LPG accepts phone numbers and Google. RMS accepts email only. Parents/learners use generated emails (pattern `^[0-9]{6,}@…`).
4. **Registration models differ.** LPG is open self sign-up. RMS is admin-provisioned. In a multi-school platform, school membership must be granted, never self-claimed.
5. **Token storage.** LPG keeps a long-lived JWT in `localStorage`, which is vulnerable to XSS.
6. The LPG JWT secret has an insecure default. LPG sockets are unauthenticated.

## 3. Decision: Supabase Auth is the single identity provider
Reasons: RMS RLS depends on `auth.uid()`, so replacing it would mean rewriting about 250 policies. Supabase gives sessions, refresh, email confirmation, password reset, OAuth (Google can be enabled, keeping LPG's Google login), phone OTP and MFA. LPG only needs to **verify** tokens.

### Token flow
1. The user signs in at `/login` (portal) with supabase-js. The session is shared by every module on the same origin, so `/lesson-planner` and `/marks` read the same Supabase session from storage.
2. LPG frontend: `api.js` attaches `Authorization: Bearer <supabase access_token>` in place of the legacy token, falling back to the legacy token while it exists.
3. LPG backend `authMiddleware`:
   * Verify the Supabase JWT (JWKS for asymmetric keys, or `SUPABASE_JWT_SECRET` for HS256) and check `aud=authenticated`.
   * Resolve `mysql_user_id` through `identity_links`. If there is no link, auto-link by **verified** email (`email_confirmed_at` not null) to an existing MySQL user. If no MySQL user exists either, create one with role `teacher`.
   * Populate `req.user = {id: <mysql id>, email, role, supabaseId, schoolId}`. **No controller changes are needed.**
   * Accept the legacy HS256 token until the cut-over date, then reject it.
4. Socket.IO: verify the same token in `io.use()` and join `user_<mysql id>` on the server side only.

## 4. Role mapping
| Platform role (`school_memberships.role` / `platform_admins`) | RMS `public.users.role` | LPG `users.role` |
|---|---|---|
| `super_admin` (platform_admins) | — (no school data unless also a member) | `admin` |
| `national_supervisor` (platform_admins, read-only analytics) | — | — |
| `school_admin` / `headteacher` | `principal` / `headteacher` | `teacher` |
| `dos` (scoped by education level) | `dos` | `teacher` |
| `teacher` | `teacher` | `teacher` |
| `parent` | `parent` | no access |
| `student` | `learner` | no access |

LPG `admin` keeps its current meaning, LPG platform owner, and maps to `super_admin`. School-level roles never grant LPG `admin`.

## 5. Account mapping and migration
| Case | Action |
|---|---|
| Email exists in **both** systems | Link `identity_links(mysql_id, supabase_id)`. The Supabase password stays canonical. On first 21CTA login the user signs in with the RMS password. If they only know the LPG password, the "Link existing Lesson Planner account" flow verifies the LPG password once and then links |
| Email only in **LPG** | Create a Supabase user through the Admin API, importing the existing **bcrypt hash** (`password_hash` param, supported by GoTrue for bcrypt; must be validated on a staging project first), so users keep their password. Google-only users (null hash) get a Google identity link, or sign in by magic link |
| Phone-only LPG users | Supabase phone auth, or a forced email capture on first login (`PhoneUpdateModal` already exists) |
| Only in **RMS** | Gets LPG access when it is first used (auto-provisioned MySQL `teacher` row) |
| Conflicting emails with different people | Manual review queue. Never auto-link |

Dry-run report before any write: counts per case, list of conflicts. No deletion in either store.

## 6. Session and security requirements
* Access-token TTL ≤ 1 hour, refresh-token rotation (Supabase default). The 7-day LPG JWT is retired.
* Password policy and email confirmation are enforced in Supabase. MFA is optional for staff and **required for super_admin**.
* `school_id` context: the active school is chosen at login (memberships > 1) and sent as the `X-21CTA-School` header. The gateway and RLS verify membership. A header alone never grants access.
* Login, link and role changes are written to `platform_audit_log`.
* Rate limits on `/api/v1/auth/*` (the LPG limits are reused) and Supabase auth rate limits.

## 7. Deliverables (Phase 3)
1. `identity_links` migration (MySQL, additive).
2. LPG `authMiddleware` dual-mode verification + `io.use` socket auth + the `JWT_SECRET` fail-fast fix.
3. Portal `/login`, `/register` (sign-up creates the identity only. School membership needs an invite or approval), `/profile`, `/settings`.
4. Account-linking endpoint + migration dry-run script.
5. Tests: token verification (valid, expired, wrong audience, legacy), auto-link by verified email only, cross-school denial.
