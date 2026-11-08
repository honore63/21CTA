# 21CTA — Security Audit

Status key: ✅ fixed in 21CTA · 🔧 next PR · 📋 planned phase · ⚠️ owner action

| ID | Sev | Finding | Location | Status |
|---|---|---|---|---|
| S1 | P0 | On startup, LPG dropped every table and reloaded `schema.sql` if user `id=2` was missing | `lesson-planner/backend/src/server.js` | ✅ PR #1 (opt-in flag + empty `users` only) |
| S2 | P0 | Hardcoded Aiven MySQL credentials | original `backend/scripts/import_db.js` | ✅ removed in 21CTA · ⚠️ **rotate the password**, purge the upstream repo |
| S3 | P0 | Real Gemini / Groq API keys in `.env.example` | original `backend/.env.example` | ✅ removed in 21CTA · ⚠️ **rotate the keys** |
| S4 | P0 | Real emails, names and bcrypt hashes in the seed dump | original `database/schema.sql` | ✅ anonymised in 21CTA |
| S5 | P0 | Socket.IO `join_user` has no authentication, so anyone can read anyone's notifications | `lesson-planner/backend/src/services/socketService.js` | 🔧 |
| S6 | P1 | `JWT_SECRET` falls back to a hardcoded default | `lesson-planner/backend/src/config/jwt.js` | 🔧 fail-fast in production |
| S7 | P1 | CORS trusts every `*.vercel.app` / `*.onrender.com` origin, with credentials | `lesson-planner/backend/src/config/cors.js` | 🔧 exact origins |
| S8 | P1 | PDF endpoint has no auth, `Access-Control-Allow-Origin: *`, and renders arbitrary HTML in headless Chrome (SSRF, abuse) | `marks/api/reports/pdf.js` | 🔧 |
| S9 | P1 | Anonymous marks-portal and guest-exam RPCs depend on guessable learner codes | `marks/backend/sql/parent_student_marks_portal.sql`, `examination_centre.sql` | 📋 Phase 4/8 (rate limit, school code, parent accounts) |
| S10 | P1 | JWT stored in `localStorage` for 7 days | LPG frontend | 📋 Phase 3 (Supabase session, 1 h access token) |
| S11 | P2 | CSP allows `'unsafe-inline' 'unsafe-eval'`. Unpinned `lucide@latest` | `marks/frontend/index.html` | 📋 Phase 7 |
| S12 | P2 | 50 MB JSON body limit on every route | LPG `server.js` | 📋 |
| S13 | P2 | Admin "download full DB backup" over HTTP | LPG `/api/admin` | 📋 replace with managed backups |
| S14 | P2 | Client infers a role from the email when the profile is missing (RLS still blocks escalation) | `marks/frontend/js/auth.js` | 📋 Phase 3 |
| S15 | Info | No school isolation yet: every RMS row belongs to the single school | RMS schema | 📋 Phase 4 |

## Browser → database access (design decision)
The master prompt says: *"Never allow the browser to connect directly to private databases."*

* **LPG** already complies. The browser talks only to Express.
* **RMS-MIS** calls Supabase PostgREST from the browser with the public anon key and the user's JWT. Postgres RLS (about 260 policies) authorises every row. This is Supabase's intended model: the database is not reachable with a privileged credential from the browser, and the service-role key stays server-side.

Options:
1. **Keep the RMS direct access under RLS (recommended for now).** Harden it with the Phase 4 school-isolation policies, the Data API exposed only for needed schemas, and rate limits.
2. **Route RMS through the 21CTA API.** Every RMS page and all of `db.js` would call `/api/v1/*`, and RLS becomes defence in depth. This is a large rewrite (48 JS modules) with high regression risk.

Owner decision needed. Option 1 is assumed until then.

## Controls required for every future PR
No secrets in git (CI secret scan). Parameterised queries only. Input validation on every new endpoint. A school-isolation test for every new table. Audit log for admin actions.
