# Key rotation runbook — Phase 2

**Date opened:** 2026-11-08
**Severity:** Critical
**Status:** code-side removal complete; **provider-side rotation is pending owner access.**

Removing a secret from a file does **not** revoke it. Until each credential below
is revoked or rotated at its provider, it must be treated as compromised and
usable by anyone who has seen the repository, a fork, a backup or a build log.

---

## 1. Exposed credentials

| ID | Credential | Where it was exposed | Provider action | Status |
|---|---|---|---|---|
| KEY-01 | Google Gemini API key | `digital_lesson_plan-main/backend/.env.example` | Revoke + regenerate in Google AI Studio | **Pending** |
| KEY-02 | Groq API key (single) | same file | Revoke + regenerate in Groq Console | **Pending** |
| KEY-03 | Groq API key (multi-key list) | same file | Revoke + regenerate | **Pending** |
| KEY-04 | Aiven MySQL user password (`avnadmin`) | `digital_lesson_plan-main/backend/scripts/import_db.js` | Reset password in Aiven Console; review service users | **Pending** |
| KEY-05 | JWT signing secret (weak/default fallback) | `digital_lesson_plan-main/backend/src/config/jwt.js` | Generate a strong secret; replace deployment value | **Pending** |

The actual values are deliberately **not** reproduced here.

### Additional detail on KEY-04

The same script also committed the managed database hostname, port, username and
database name. Those are not secrets on their own, but combined with the password
they granted full access. Treat the database as potentially accessed by an
unauthorised party until the provider's connection and audit logs are reviewed.

## 2. Do this first (containment)

1. **Revoke, do not just replace.** Deleting the old key and creating a new one is
   required; changing only the deployed value leaves the old key valid.
2. **Review usage.** Check provider dashboards for unexpected calls, spend spikes,
   new IPs or regions since the repository was created.
3. **Check for forks/clones.** Any public fork, CI log, screenshot or archive with
   the old values keeps them alive.
4. **Rotate the database password** and review active sessions/connections.
5. **Record the rotation** in the table in §8 with time, operator and evidence.

## 3. Gemini (KEY-01)

1. Sign in to Google AI Studio with the project owner account.
2. Open **API keys**, locate the key matching the old value prefix, and **delete**
   it (do not merely restrict it).
3. Create a new key restricted to the required API(s) and, where supported, to the
   server's egress IPs.
4. Put the new value only in the deployment secret store and the local `.env`:

   ```dotenv
   GEMINI_API_KEY=<new value>
   ```

5. Redeploy/restart the backend.
6. Verify with a server-side generation request. Never test from the browser and
   never paste the key into a shell that records history.
7. Confirm the old key now returns `403`/`API key not valid`.
8. Set a budget alert and quota for the project.

## 4. Groq (KEY-02, KEY-03)

1. Sign in to the Groq Console with the owner account.
2. **Revoke** the old key(s).
3. Create a new key per environment (development, staging, production). Do not
   share one key across environments.
4. Update `GROQ_API_KEY` and `GROQ_API_KEYS` in the deployment secret store.
   `GROQ_API_KEYS` is comma-separated; keep the same rotation semantics for each.
5. Restart and verify a server-side request.
6. Confirm the revoked key is rejected.
7. Configure usage alerts.

## 5. Aiven MySQL (KEY-04)

1. Sign in to the Aiven Console for the service in question.
2. Open **Users** and reset the password for the affected user, or create a new
   application user and delete the old one.
3. Prefer least privilege:
   - runtime user: `SELECT, INSERT, UPDATE, DELETE` on the application schema;
   - migration user: DDL, used only during deploys;
   - backup user: read/lock privileges.
4. Restrict **IP allow-list** to the application and operator egress addresses.
5. Enable/verify service logging and review connections around the exposure window.
6. Update the deployment secret store.
7. Restart the backend and confirm connectivity.
8. Confirm the old password fails.
9. If the provider supports it, enable MFA on the console account.

> Do not run `backend/scripts/import_db.js` until this rotation is complete. The
> script now requires explicit `--confirm` and reads credentials from `.env`, but
> the database itself is still exposed until the password changes.

## 6. JWT secret (KEY-05)

The audit found a hardcoded fallback in `backend/src/config/jwt.js`:

```js
secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key'
```

Two separate actions are required:

1. **Rotate the deployed value** to a 32-byte random secret:
   `openssl rand -hex 32` (or a password manager generator).
2. **Remove the fallback** so the server refuses to start without a secret.

Action 2 is **not yet applied** because it can stop an existing deployment that
relies on the fallback. Schedule it with a maintenance window:

- Set `JWT_SECRET` in every environment.
- Change `jwt.js` to throw at startup when the variable is missing.
- Deploy.
- Accept that all existing sessions are invalidated; users must sign in again.
- Confirm `/api/health` is up and login works.

Rotating the secret invalidates every issued token. Announce the window.

## 7. Supabase keys

- The **anon key** is public by design and was hardcoded in
  `RMS-MMS-main/frontend/js/config.js`. It is not a secret, but it should be
  injected at build time so projects can be switched without editing source.
- No **service-role key** was found committed. If one ever existed outside the
  current tree, rotate it immediately and check Supabase logs.
- After the central IdP is confirmed (Phase 3), switch the project to asymmetric
  JWT signing keys and validate tokens via JWKS. This makes key rotation possible
  without redeploying every service.

## 8. Rotation record

Fill this in as each item is completed. Evidence means a screenshot or console
log reference, not a password.

| ID | Rotated at (UTC) | Operator | Old credential revoked? | Verification evidence |
|---|---|---|---|---|
| KEY-01 Gemini | | | [ ] | |
| KEY-02 Groq primary | | | [ ] | |
| KEY-03 Groq list | | | [ ] | |
| KEY-04 Aiven MySQL | | | [ ] | |
| KEY-05 JWT secret | | | [ ] | |

## 9. Prevention

- [ ] Enable GitHub secret scanning and push protection (or equivalent).
- [ ] Add `gitleaks` to CI and fail on detection.
- [ ] Add a pre-commit hook that blocks `.env`, dumps and key patterns.
- [ ] Keep `.env.example` placeholders only; add a CI check for `AIza…`, `gsk_…`,
      `AVNS_…`, `-----BEGIN`, `service_role` and long JWT-like strings.
- [ ] Purge the secrets from git history **after** rotation. History rewriting is
      a separate, approved operation; it does not replace revocation.
- [ ] Store production secrets in a managed secret store, not in host files.
- [ ] Restrict who can read production environment variables; log access.
- [ ] Review all credentials quarterly and on staff departure.

## 10. What was done in this phase

| Action | Status |
|---|---|
| Removed the real Gemini key from `.env.example` | Done |
| Removed the real Groq keys from `.env.example` | Done |
| Removed the hardcoded Aiven password from `import_db.js` | Done |
| Made `import_db.js` read env vars and require `--confirm` | Done |
| Replaced the JWT example with a generation instruction | Done (example only) |
| Provider-side revocation/rotation | **Not done — owner access required** |
| Git history purge | **Not done — requires approval and a real remote** |
| CI secret scanning | **Not configured** |
