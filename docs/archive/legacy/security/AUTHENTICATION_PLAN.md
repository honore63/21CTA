# AUTHENTICATION_PLAN.md

> **Historical target note (2026-11-08):** Supabase Auth is described as the proposed identity provider in this Phase 1 plan. The current direction is MySQL-backed centralized authentication as specified in [`MYSQL_UNIFICATION_PLAN.md`](MYSQL_UNIFICATION_PLAN.md); the existing-state findings and account-linking cautions remain relevant.

**Project:** 21CTA
**Goal:** one identity, one login, one user record per person, safe multi-school authorization
**Decision:** use **Supabase Auth as the initial central identity provider**, behind a platform-core
authorization layer. Evaluate Keycloak only if the trigger conditions in §10 are met.

---

## 1. Current state

### 1.1 System A — custom authentication

| Aspect | Implementation |
|---|---|
| Credential store | MySQL `users.password_hash` (bcrypt, cost 10) |
| Login identifier | email **or** phone number |
| Token | JWT HS256, default 7-day expiry |
| Claims | `id` (int), `email`, `role` |
| Secret | `JWT_SECRET`, with a hardcoded fallback |
| Issuer/audience | not set or validated |
| Refresh | none; user re-authenticates when expired |
| Storage | browser `localStorage` |
| Social | Google OAuth 2.0 via Passport |
| Reset | emailed token stored in `reset_password_token` / expiry |
| Roles | `admin`, `teacher` only |
| Suspension | `users.is_suspended` |
| Other | device fingerprint checks, IP logging, welcome email |

**Weaknesses:** long-lived bearer token, fallback secret, no issuer/audience, no refresh/revocation,
client-side role trust after decode, role model too coarse for schools, no verified email requirement
observed in the registration path.

### 1.2 System B — Supabase Auth

| Aspect | Implementation |
|---|---|
| Identity store | `auth.users` (managed by Supabase) |
| Profile | `public.users.id = auth.uid()` |
| Token | Supabase access token + refresh token |
| Authorization | PostgreSQL RLS using `auth.uid()` and helper functions |
| Roles | `dos`, `teacher`, `headteacher` (CHECK constraint) |
| Verification | Supabase email confirmation capability |
| Reset | Supabase password recovery |
| MFA | available in Supabase, not observed as enforced |
| Scope | education level (Primary/Secondary), **not school** |
| Anomaly | client infers roles from email substrings and can self-insert a `teacher` profile |

**Strengths:** mature identity provider, refresh/revocation, email verification, MFA support, RLS
integration, one canonical UUID per user.

**Weaknesses:** authorization is still single-school and partly client-driven; no cross-system link
table; parent role is inconsistent with the table constraint.

---

## 2. Conflicts to resolve

| Conflict | Consequence | Resolution |
|---|---|---|
| Two independent credential stores | same person could have two accounts | `identity_links` + verified linking |
| Different role vocabularies | `admin` ≠ `school_admin` automatically | explicit role mapping table and approval |
| No shared UUID | records cannot be joined safely | `auth.users.id` becomes canonical; legacy ids stored in links |
| JWT formats differ | System A cannot validate Supabase tokens today | gateway mints a short-lived internal token |
| Token lifetime differs | inconsistent session UX | platform session policy; internal tokens ≤ 15 min |
| Different email verification | account takeover risk | require verified email before any school access |
| Client-assigned roles | privilege escalation attempts | remove; roles assigned only server-side |
| Parent accounts | current `users.role` CHECK rejects `parent` | parents live in `platform_users` + memberships, not staff `users` |
| Multi-school not modelled | no way to scope a session | memberships + `X-School-Id` verified server-side |
| Legacy passwords | cannot export Supabase hashes; A uses bcrypt | invite/reset, or one-time verified migration |

---

## 3. Target identity model

```
auth.users (Supabase)            ← one row per human, canonical UUID
   │
   ├── platform_users            ← cross-system profile (name, status, locale)
   │
   ├── school_memberships        ← user ↔ school ↔ role ↔ status
   │        └── platform_roles → role_permissions → permissions
   │
   ├── identity_links            ← platform UUID ↔ legacy A/B account
   │
   └── parent_student_links      ← verified guardian ↔ learner
```

Rules:

1. **`auth.users.id` is the only central user identifier.** No integer IDs in tokens.
2. A person may belong to multiple schools through multiple memberships.
3. A person has **one** platform role per school membership. Platform-wide roles are separate.
4. Roles are never taken from the request body, query string or client-decoded token.
5. School context is resolved from active memberships, not from an arbitrary header alone.
6. Legacy accounts remain addressable through `identity_links`; they are never renumbered.
7. Deleting a platform user does not delete academic history; it deactivates access and preserves audit.

---

## 4. Role model

### 4.1 Platform roles

| Role | Scope | Description |
|---|---|---|
| `super_admin` | platform | full platform administration, school onboarding, global settings |
| `national_admin` | platform | read-only or limited national analytics and oversight |

### 4.2 School roles

| Role | Scope | Typical capabilities |
|---|---|---|
| `school_admin` | one school | users, classes, subjects, years, settings, school reports |
| `dos` | one school | academic monitoring, lesson review, marks approval, exams |
| `headteacher` | one school | school oversight, reports, approvals where configured |
| `teacher` | one school | own classes, lesson plans, marks entry, diary, attendance, library |
| `student` | one school | own results, timetable, resources, authorized assessments |
| `parent` | one school | linked learners only: results, attendance, announcements |
| `support_staff` | one school | optional; no academic record access by default |

### 4.3 Legacy mapping (requires approval, never automatic)

| Legacy | Candidate target | Approval requirement |
|---|---|---|
| A `admin` | `school_admin` or `national_admin` | platform owner review |
| A `teacher` | `teacher` | school admin confirms employment |
| B `dos` | `dos` | platform owner review; confirm school |
| B `teacher` | `teacher` | school admin confirms |
| B `headteacher` | `headteacher` | platform owner review |
| B parent portal user | `parent` | verified learner link |
| Learner | `student` | verified learner code + school |

A mapping table is stored in configuration so the decision is explicit and auditable.

### 4.4 Permissions

Permissions are stable codes such as:

```
school.read, school.manage
user.read, user.invite, user.suspend, user.assign_role
lesson.read, lesson.generate, lesson.approve, lesson.share
marks.read, marks.enter, marks.submit, marks.approve, marks.lock, marks.reopen
library.read, library.upload, library.approve, library.delete
assessment.read, assessment.create, assessment.take, assessment.mark, assessment.release
diary.read, diary.create, diary.review
attendance.read, attendance.record, attendance.excuse
timetable.read, timetable.manage, timetable.publish
cpd.read, cpd.manage, cpd.record
analytics.school, analytics.national
admin.audit, admin.settings, admin.integrations
```

`role_permissions` seeds the matrix. The platform can add school-specific overrides later without
changing code.

---

## 5. Authentication flows

### 5.1 Registration

1. User registers with email + password through the platform.
2. Supabase sends a verification email.
3. Account is `invited`/`unverified`; no school data is accessible.
4. If self-registration, the user requests a school or accepts an invitation.
5. A school administrator (or platform admin for the first user) activates the membership.
6. Audit event: `user.registered`, `membership.activated`.

### 5.2 Invitation

1. Admin invites an email with a role and school.
2. Store only a **hash** of the invitation token; expiry 7 days; single use.
3. Invitee verifies email, sets a password, accepts.
4. Membership is created atomically; the invitation is marked accepted.
5. Re-inviting invalidates prior tokens.

### 5.3 Login

1. Email + password to Supabase Auth.
2. If MFA is enrolled, require the second factor.
3. Access token (short-lived) + refresh token returned.
4. Platform fetches `/auth/me`: profile, memberships, roles, permissions.
5. If the user has one school, select it; if several, require an explicit school choice.
6. If the user has zero active memberships, show a "pending access" screen — not a dashboard.

### 5.4 Password reset

- Use Supabase recovery; never reveal whether an email exists.
- Single-use, time-limited token; invalidate all sessions after reset.
- Notify the user of the change.
- Rate-limit by IP and account.

### 5.5 Logout

- Revoke the refresh token/session server-side.
- Clear client caches and school context.
- Redirect to `/login`.

### 5.6 Account states

`invited → active → suspended → deactivated`

| State | Can log in | Can access school data |
|---|---|---|
| invited | after verification | no |
| active | yes | yes, within memberships |
| suspended | no (or limited) | no |
| deactivated | no | no |

Suspension is immediate: revoke sessions and reject tokens on the next request, not only at refresh.

---

## 6. Token validation

### 6.1 Supabase access token

Validate on every platform request:

- Signature via the project's JWKS (preferred: asymmetric signing keys, ES256/RS256).
- `iss` equals the project auth issuer.
- `aud` equals `authenticated`.
- `exp` / `nbf` with small clock skew.
- `sub` is a UUID and exists in `auth.users`.
- Token is not revoked (session validity check for sensitive operations).
- `aal` is sufficient for the requested action (e.g. admin actions require `aal2` if MFA enforced).

**Never** authorize from `user_metadata`, `app_metadata` alone, or a client-decoded `role`.

### 6.2 Internal token for System A

The adapter mints a short-lived token (5–15 minutes) with:

```json
{
  "iss": "https://api.21cta.com",
  "aud": "lesson-api",
  "sub": "<platform uuid>",
  "legacy_user_id": 4,
  "school_id": "<uuid>",
  "scope": ["lesson.read","lesson.generate"],
  "iat": 0,
  "exp": 0,
  "jti": "<unique>"
}
```

System A must:

- Verify with the platform public key (no shared symmetric secret in source).
- Validate issuer, audience, expiry and algorithm.
- Reject if `school_id` is not mapped to the legacy user.
- Use `legacy_user_id` for legacy foreign keys; never trust a body-supplied user id.

### 6.3 Browser storage

- Prefer Supabase's recommended storage; avoid persisting long-lived credentials in `localStorage`
  where a secure cookie/BFF pattern is feasible.
- If tokens are held client-side, keep access tokens short and refresh tokens rotating.
- Never store database passwords, service-role keys or AI keys in the browser.

---

## 7. Account linking workflow

### 7.1 Principles

- No automatic merge by name.
- No automatic merge by email alone.
- One legacy account ↔ at most one active platform user.
- All links are auditable and revocable.

### 7.2 Process

```
1. Platform user registers and verifies email.
2. System searches for candidate legacy accounts by exact email (case-insensitive).
3. Candidates are shown to an administrator with: legacy system, legacy id, name,
   masked email/phone, created date, last activity. No automatic selection.
4. Admin chooses one of:
   a. Verified email challenge: send a one-time code to the legacy email; user proves control.
   b. Admin approval after identity checks (staff ID, school confirmation).
   c. Reject and create a clean account with no legacy history.
5. On approval:
   - insert identity_links(status='verified', verified_by, verified_at)
   - set legacy users.central_user_id / school_id
   - write audit_logs entries in both systems
6. If two platform users claim the same legacy account, block both and escalate.
7. Revocation marks the link 'revoked' and does not delete history.
```

### 7.3 Passwords

Supabase cannot import System A's bcrypt hashes, and System A cannot read Supabase hashes.

Recommended:

- Send a secure invitation/reset to verified users; they set a new password.
- For a limited pilot, implement a one-time verified migration: user proves the old password to System A
  through a controlled endpoint, then the platform creates the Supabase account and immediately forces a
  new password. Log the event and disable the old credential.
- Never email a permanent password. Never log passwords.

### 7.4 Conflict examples

| Case | Action |
|---|---|
| Same email, different names | manual review; do not link |
| Same name, different emails | no link |
| Shared school email | no link; create individual accounts |
| Teacher moved schools | new membership; keep one identity |
| Duplicate legacy rows for one person | link both to one platform user only after review |
| Deceased/former staff | deactivate; preserve records |

---

## 8. Session and device policy

| Setting | Recommendation |
|---|---|
| Access token lifetime | 1 hour (Supabase default) |
| Refresh token | rotating, reuse detection enabled |
| Idle timeout | 8 hours for staff, 30 minutes for admin consoles (configurable) |
| Absolute session | 12 hours for admins, 7 days for teachers |
| Concurrent sessions | allowed, listed in account settings, revocable |
| Sensitive actions | re-authentication or MFA step-up |
| Suspension | revoke all sessions immediately |
| School switch | re-resolve permissions server-side |

Optional device fingerprinting from System A may be retained as a risk signal, **not** as an
authentication factor. Remove the "one account per device" hard block, which harms shared school
computers.

---

## 9. MFA and recovery

- TOTP MFA available to all users; **required** for `super_admin`, `national_admin`, `school_admin` and
  `dos` before production.
- Recovery codes generated once, hashed at rest, single use.
- Admin can reset MFA only with audit and identity verification.
- Optional future: SMS OTP for parents (cost and SIM-swap risk considered).

---

## 10. Keycloak / OIDC evaluation

Keycloak is **not required for the initial platform**. Supabase Auth satisfies email/password,
verification, reset, refresh, MFA and OIDC-compatible tokens.

Adopt Keycloak (or another OIDC provider) only if one or more of these becomes true:

1. The Government of Rwanda or a national agency requires SAML/OIDC federation with a national IdP.
2. Schools require on-premises or self-hosted identity for data-residency reasons.
3. The platform must support complex enterprise SSO, group sync or fine-grained federation.
4. Supabase Auth limits are reached or its pricing/availability becomes unacceptable.
5. A single logout/session policy across many independent applications is mandated.

Migration path: keep `auth.users.id` as `platform_users.user_id`; add `external_issuer` and `external_sub`
columns so an OIDC subject can be linked without changing business keys. Never change primary keys.

---

## 11. Security controls checklist

- [ ] Remove hardcoded JWT fallback in System A.
- [ ] Rotate all exposed credentials.
- [ ] Enforce email verification before any school data access.
- [ ] Remove client-side role inference.
- [ ] Enforce authorization server-side on every endpoint and RLS policy.
- [ ] Add tenant isolation tests for two synthetic schools.
- [ ] Require MFA for administrative roles.
- [ ] Rate-limit login, reset, invitation and public lookups.
- [ ] Hash invitation and reset tokens; single use; expiry.
- [ ] Log authentication events (success, failure, lockout, MFA change, role change).
- [ ] Alert on repeated failures, impossible travel (optional), and mass role changes.
- [ ] Disable or gate the legacy database-backup endpoint.
- [ ] Do not expose service-role keys to the browser.
- [ ] Keep AI keys server-side only.
- [ ] Review Supabase Auth email templates and sender domain.
- [ ] Configure SPF/DKIM/DMARC for the sending domain.
- [ ] Document incident response and account-recovery procedures.
- [ ] Verify Rwanda data-protection compliance for identity data.

---

## 12. Rollout sequence

| Step | Action | Exit criteria |
|---|---|---|
| A1 | Create/confirm the 21CTA Supabase project; enable asymmetric JWT keys | JWKS reachable; old project untouched |
| A2 | Add `platform_users`, roles, permissions, memberships, `identity_links` | migrations applied; RLS tested |
| A3 | Build `/auth/me` and school selection | one login returns correct memberships |
| A4 | Add invitation and admin approval UI | invite → verify → active works |
| A5 | Adapt System B login to the platform session | existing RMS users can sign in without duplicate accounts |
| A6 | Add System A token exchange adapter | pilot teacher opens lesson planner without re-login |
| A7 | Link pilot accounts with audit | zero unapproved links |
| A8 | Enable MFA for admins/DOS | enforced and tested |
| A9 | Onboard school #2 in staging | isolation tests pass |
| A10 | Production onboarding | rollback plan exercised |

**Do not proceed to A9 until every cross-school test in `DATABASE_MAP.md` §6.3 passes.**
