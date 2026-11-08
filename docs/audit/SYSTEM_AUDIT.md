# 21CTA — System Audit (Phase 1)

Scope: inspection of the two codebases delivered in `21CTA.zip` (snapshot dated 2026-11-08):

| Code | Folder in zip | Upstream |
|---|---|---|
| **System A — Lesson Plan Generator (LPG)** | `digital_lesson_plan-main/` | Not in the `honore63` GitHub account (owner unknown). Live: `digital-lesson-plan.onrender.com` |
| **System B — RMS-MIS** | `RMS-MMS-main/` | `github.com/honore63/RMS-MMS` (public). Live on Vercel, Supabase project `ztlfidglxfwjpxkqfviy` |

No source code was changed. No database was connected. Secrets are never quoted in these documents.

---

## 1. Executive summary

* Both systems work on their own, but they share **no** identity, school model, IDs or hosting. LPG uses MySQL with integer IDs and its own JWT. RMS-MIS uses Supabase Postgres with UUIDs, Supabase Auth and RLS.
* **Neither system is multi-school.** RMS-MIS stores one school (`school_settings` singleton, defaulting to "Rukara Model School"). No RMS table has a `school_id`. LPG stores `school_name` as free text on `users` and `lessons`.
* **Safest strategy:** keep both apps and both databases. Put them behind one domain and a new 21CTA shell. Use **Supabase Auth as the single identity provider**. Make LPG's Express API accept Supabase tokens through an additive account-link table. Add `schools` / `school_memberships` in Postgres, then roll `school_id` into RMS tables step by step. Details: MIGRATION_PLAN.md and AUTHENTICATION_PLAN.md.
* **Fix 4 blockers before any integration work** (see §7):
  1. LPG drops every table on startup if one condition fails.
  2. A hardcoded production database password is committed in LPG.
  3. Real user emails and password hashes are committed in LPG's `schema.sql`.
  4. The LPG Socket.IO rooms have no authentication.

---

## 2. System A — Lesson Plan Generator (LPG)

### 2.1 Stack and entry points
| Layer | Technology | Entry point |
|---|---|---|
| Frontend | React 18 + Vite 5, React Router 6, Axios, socket.io-client, jsPDF, docx, JSZip, mermaid, chart.js | `frontend/src/main.jsx` → `App.jsx` (BrowserRouter) |
| Backend | Node.js + Express 4 (CommonJS), Passport (Google OAuth), JWT, Multer, Helmet, express-rate-limit, Socket.IO, nodemailer | `backend/src/server.js` (port `PORT`, default 5000) |
| Database | MySQL / MariaDB (`mysql2/promise` pool). Hosted on Aiven, or XAMPP locally | `backend/src/config/database.js` |
| AI | Google Gemini (`@google/genai`) and Groq (key rotation, model fallback) | `services/aiService.js`, `geminiService.js`, `agentService.js` |
| Queue / cache | Redis (optional), in-DB email queue | `config/redis.js`, `services/emailQueueService.js` |
| Files | Local disk via Multer (`backend/uploads`), plus Cloudinary | `config/upload.js`, `config/cloudinary.js` |
| Email | Gmail SMTP via nodemailer, EmailJS REST fallback | `services/emailService.js` |

### 2.2 Functional modules
* Auth: email/phone + password, Google OAuth, forgot/reset password, device fingerprint limit on multiple accounts.
* Classes → class_subjects → units → lessons → lesson_plans (versioned JSON), with history.
* AI generation: single lesson, batch per unit, "agent" jobs. Models: 5E, 3P, UDL / special needs, Kinyarwanda.
* Syllabuses: PDF upload, AI extraction to units and lessons, import into a class.
* Schedules: teacher schedules, term settings, holidays, auto-populate teaching dates.
* Materials: teaching materials, reference materials, attaching materials to lessons.
* AI chat assistant (public and authenticated), chat sessions, file upload.
* Notifications (DB plus Socket.IO push), contact messages, visitor analytics.
* Subscriptions: free/paid plans, payment-proof upload, admin activation, promo.
* Admin: users (suspend, reset password, email), stats, cleanup, DB backup download.
* Exports run client-side: PDF (jsPDF), Word (docx), ZIP (JSZip).

### 2.3 Frontend routes (`App.jsx`)
* Public: `/ /login /register /about-us /faq /privacy-policy /contact /pricing /docs /auth/success /forgot-password /reset-password`
* Teacher: `/dashboard /classes /classes/:classId /classes/:classId/subjects/:subjectId/units /units/:unitId/lessons /units/:unitId/batch-generate /lessons/:lessonId/plan /lesson-plans /materials /reference-materials /profile /classes/:classId/subjects/:subjectId/schedule`
* Admin: `/admin/users /admin/users/:userId /admin/subjects /admin/syllabuses /admin/syllabuses/:id/structure /admin/visitors /admin/subscriptions /admin/notifications`

The API base URL comes from `VITE_API_URL`. Without it, the app falls back to `localhost:5000/api` on localhost and to `https://digital-lesson-plan.onrender.com/api` everywhere else. The token and user are kept in `localStorage` (`token`, `user`).

### 2.4 Roles
MySQL `users.role` ENUM is `('admin','teacher')`. `contactRoutes` also checks `super-admin`, `system-admin` and `reb-admin`, but the ENUM cannot store those values. Registration only allows `teacher`.

### 2.5 Hosting (observed)
* Backend: Render (`*.onrender.com`). Express also serves the built frontend when `frontend/dist` exists.
* Frontend: Vercel (`frontend/vercel.json` SPA rewrite) and Netlify-style `_redirects`.
* DB: Aiven MySQL with SSL (`DB_SSL=true`).

### 2.6 Verification run
* `node --check` passed on every backend JS file.
* `vite build` of the frontend **succeeds**. It warns about large chunks: main bundle 947 kB, mermaid ELK 1.4 MB.
* No automated tests exist. `npm test` is a placeholder.

---

## 3. System B — RMS-MIS

### 3.1 Stack and entry points
| Layer | Technology | Entry point |
|---|---|---|
| Frontend | Vanilla JS SPA (no build), hash router, Supabase JS v2 from CDN, Lucide, SheetJS, EmailJS | `frontend/index.html` → `js/app.js` |
| Backend | No app server. Supabase (Postgres, Auth, RLS, Realtime, Storage, Edge Functions) | `backend/sql/*.sql`, `backend/functions/*`, `supabase/functions/*` |
| Serverless | Vercel function: HTML → PDF with Puppeteer | `api/reports/pdf.js` |
| AI | Gemini through Supabase Edge Functions (digital library RAG) | `supabase/functions/digital-library-ai`, `digital-library-index` |
| Offline | Service worker and web manifest | `frontend/sw.js` |

### 3.2 Functional modules
* Academic setup: academic years, terms, education levels (Primary/Secondary), classes, subjects, class_subjects, teacher assignments.
* Teachers: registration via an RPC, welcome email/SMS (edge function and EmailJS), teacher codes.
* Learners: CRUD and Excel import. Learner accounts are created by an edge function that uses the service role.
* Assessments: configurable assessment types and weights, mark entry with auto-save, submit → DOS approve → lock/reopen, marks conversion and import.
* Reports: report cards, class lists, mark sheets, ranking, subject/teacher/school reports, Excel/PDF export.
* Analytics: dashboards and an analytics engine.
* Communication: announcements, messages with attachments, notifications, realtime.
* Digital library: resources, AI chunks, AI usage limits, and a public preview.
* Examination centre: question bank, examinations, attempts, answers, guest exams (anonymous RPCs).
* Portals: principal dashboard, parent portal, standalone `parent-marks.html` (lookup by class + learner code), learner exams.
* Audit logs and import history.

### 3.3 Routes (hash router)
`admin/*` (dashboard, academic, classes, subjects, teachers, learners, assignments, assessments, assessment-types, marks, reports/*, analytics, audit-logs, settings, messages, notifications, digital-library, examinations), `teacher/*` (dashboard, my-classes, my-subjects, enter-marks, submitted-marks, convert-marks, import-marks, reports, analytics, library, examinations, messages, notifications, account), `principal/dashboard`, `parent/*` (dashboard, performance, reports, notifications), `learner/examinations`.

### 3.4 Roles
The `users.role` CHECK constraint is widened by the upgrade scripts to `dos, teacher, headteacher, principal, parent, learner`. `education_level` scopes DOS users to Primary or Secondary. RLS has about 250 policies across all scripts, plus `SECURITY DEFINER` helper functions (`rms_account_role`, `rms_is_dos`, `rms_dos_can_*`, `rms_teacher_can_*`, …).

### 3.5 Hosting (observed)
Vercel with static rewrites to `/frontend/*` and `/api/*`. Supabase project `ztlfidglxfwjpxkqfviy`. Schema changes are applied by hand in the Supabase SQL editor. The README states: "Database changes are NOT automatic".

### 3.6 Verification run
`node --test tests/*.test.js` → **7 passed, 10 failed** (pre-existing). The failures include `Utils.normalizedMark is not a function` and `Utils.matchesSubjectForClass is not a function` inside the vm sandboxes, and status-label expectations such as `'PENDING APPROVAL'` vs `'SUBMITTED'`. This looks like drift between the tests and the current source. It needs triage before the tests can be used as a CI gate.

---

## 4. Environment variables (names only)

**LPG backend.** Declared in `.env.example`: `PORT NODE_ENV DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME JWT_SECRET JWT_EXPIRES_IN GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_CALLBACK_URL GEMINI_API_KEY GEMINI_MODELS GROQ_API_KEY GROQ_API_KEYS GROQ_MODELS DEFAULT_AI_PROVIDER MAX_FILE_SIZE UPLOAD_DIR CORS_ORIGIN EMAIL_USER EMAIL_PASS ADMIN_EMAIL FRONTEND_URL REDIS_HOST REDIS_PORT RATE_LIMIT_* HELMET_* ENABLE_*`.
Used in code but **missing from `.env.example`**: `DATABASE_URL DB_URL DB_SSL ALLOWED_ORIGINS CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET EMAILJS_SERVICE_ID EMAILJS_TEMPLATE_ID EMAILJS_PUBLIC_KEY EMAILJS_PRIVATE_KEY EMAIL_FROM_NAME GEMINI_MODEL REDIS_URL REDIS_PASSWORD RENDER_EXTERNAL_URL`.

**LPG frontend:** `VITE_API_URL`.

**RMS-MIS.** The Vercel `.env.example` says no variables are required. The Supabase URL and the anon key are hardcoded in `frontend/js/config.js`. The anon key is public by design, and RLS protects the data. The EmailJS public key is a placeholder in `index.html` (`window.RMS_EMAILJS_PUBLIC_KEY`).
Edge-function secrets (set in Supabase, not in git): `SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY SCHOOL_NAME SCHOOL_EMAIL SCHOOL_PHONE SCHOOL_WEBSITE SCHOOL_LOGO_URL`.

---

## 5. Third-party integrations
| Service | LPG | RMS-MIS |
|---|---|---|
| Google Gemini | ✔ (generation, chat, syllabus) | ✔ (library AI via edge functions) |
| Groq | ✔ | — |
| Google OAuth | ✔ | — |
| Supabase (Auth, DB, Storage, Realtime, Functions) | — | ✔ |
| Aiven MySQL | ✔ | — |
| Redis | optional | — |
| Cloudinary | ✔ | — |
| Gmail SMTP / nodemailer | ✔ | — |
| EmailJS | ✔ (server REST fallback) | ✔ (browser) |
| SMS | — | welcome SMS logged in `sms_notifications` (no gateway configured in code) |
| Puppeteer PDF | — | ✔ (Vercel function) |
| CDNs | npm bundle | unpkg (`lucide@latest`, unpinned), jsDelivr (supabase-js@2, emailjs) |
| FingerprintJS | ✔ (anti multi-account) | — |

---

## 6. Duplicated functionality and conflicts
| Area | LPG | RMS-MIS | Resolution proposal |
|---|---|---|---|
| Users / auth | MySQL `users`, own JWT, Google OAuth | Supabase Auth + `public.users` | Supabase Auth becomes the identity provider. LPG links its users through `identity_links` |
| Roles | admin, teacher | dos, teacher, headteacher, principal, parent, learner | One platform role catalogue, mapped per module (AUTHENTICATION_PLAN §4) |
| School | free text `school_name` | singleton `school_settings` | New `schools` + `school_memberships` in Postgres |
| Classes / subjects | per teacher (`classes.teacher_id`), global subjects + custom | school-wide classes and subjects with education level | Keep both. RMS is the school's official record. LPG classes stay the teacher's planning space. Add an optional `rms_class_id` / `rms_subject_id` link later |
| Notifications | MySQL `notifications` + Socket.IO | Postgres `notifications` + Realtime | Unified notification API in phase 20 that reads both. No merge yet |
| AI assistant | Gemini + Groq, chat history in MySQL | Gemini library RAG | One `/api/v1/ai` gateway that keeps both back ends |
| Library / materials | `teaching_materials`, `reference_materials` (Cloudinary/disk) | `digital_library_resources` (Supabase Storage) | RMS digital library becomes the 21CTA Library. LPG reference materials stay attached to lessons |
| Admin dashboards | LPG admin | DOS / principal dashboards | New 21CTA admin shell that links to both |
| PDF export | client-side jsPDF | Puppeteer function + print | Keep both |
| Email | SMTP / EmailJS | EmailJS / edge function | Consolidate later. Not blocking |
| Path collisions | `/login /register /dashboard /profile /admin/*` and `/api/*` | `/api/reports/pdf`, `/public/*`, `/sw.js`, `/manifest.*` | Every module gets a sub-path (`/lesson-planner`, `/marks`). API_INTEGRATION_MAP §3 |

---

## 7. Security and data-integrity findings

**P0 — fix before any integration or deployment change**

1. **Destructive auto-migration (LPG `backend/src/server.js`, startup block after `createTablesIfNotExist`).** If `SELECT id FROM users WHERE id = 2` returns no row, or the `lessons` / `lesson_materials` tables are missing, the server runs `DROP TABLE` on every non-view table. It then re-imports `database/schema.sql`, which contains demo data. Pointing the backend at a new, staging or partially migrated database, or deleting user #2, **wipes the database**. This directly breaks rule 2 ("Do not delete existing data"). Disable it, or put it behind an explicit `ALLOW_DESTRUCTIVE_BOOTSTRAP=true` flag that is only allowed on an empty database.
2. **Hardcoded production DB credentials** in `digital_lesson_plan-main/backend/scripts/import_db.js` (Aiven host, port, user and password in source). Rotate the Aiven password now. Move the values to env vars and purge them from git history.
3. **Personal data in `database/schema.sql`:** real names, emails and bcrypt password hashes of users, including the owner. Replace it with a schema-only dump plus anonymised seed data.
4. **Unauthenticated Socket.IO rooms** (`services/socketService.js`). Any client can `emit('join_user', <id>)` and receive another user's notifications. Verify the JWT in the socket handshake.

**P1**

5. JWT secret falls back to a hardcoded default (`config/jwt.js`) when `JWT_SECRET` is unset. Fail fast instead.
6. LPG CORS allows **any** `*.vercel.app` and `*.onrender.com` origin with `credentials: true`. Any project on those platforms counts as trusted.
7. RMS `api/reports/pdf.js`: no authentication, `Access-Control-Allow-Origin: *`, and arbitrary HTML is rendered in headless Chrome with `networkidle0`. This allows SSRF (fetching internal or metadata URLs) and lets anyone use the endpoint for compute. Require a Supabase JWT, restrict the origin, and block network requests except allow-listed assets.
8. Public anonymous RPCs: the marks portal (class + learner code) and guest exams. The README already says learner codes are not passwords. Add rate limiting and stronger codes before going national.
9. RMS CSP allows `'unsafe-inline' 'unsafe-eval'`. `lucide@latest` is unpinned (supply-chain risk).
10. LPG body limit is 50 MB on every JSON route, which invites DoS. Admin "DB backup" downloads the whole database over HTTP.

**P2 (functional honesty, rules 6/13/15)**

11. `services/agentService.js` `analyzeSyllabus` / `processMaterials` simulate work with `setTimeout` ("In a real implementation, this would call AI service…") and return canned results.
12. `GET /api/lessons/` is a stub that returns `[]`.
13. `contactRoutes` checks roles that the users ENUM cannot hold.
14. RMS client infers a role from email substrings when a profile is missing (`auth.js fetchOrCreateProfile`). RLS (`rms_account_users_insert`) blocks self-assigning anything except `teacher`, so this is a UX bug, not a privilege escalation.
15. RMS test suite: 10 of 17 failing.

---

## 8. Recommended integration strategy (summary)
1. **Phase 0 (hotfix in the original repos):** P0 items 1–4.
2. Create the **21CTA integration repo**. Bring both apps in as `apps/lesson-planner` and `apps/marks`, preserving history (git subtree). Add a new `apps/portal` shell (React + Vite, matching LPG's stack) for `/`, `/login`, `/dashboard`, `/schools`, `/admin` and the new modules.
3. **One domain** through an edge router (Vercel rewrites or Nginx), with module sub-paths (DEPLOYMENT_PLAN).
4. **Identity:** Supabase Auth. LPG accepts Supabase JWTs and keeps its legacy JWT during the transition (AUTHENTICATION_PLAN).
5. **Tenancy:** `schools`, `school_memberships` in Postgres. RMS gets a backfilled `school_id` column. LPG gets a nullable `school_id` (DATABASE_MAP, MIGRATION_PLAN).
6. New modules (Class Diary, Attendance, Timetable, CPD, Portfolio, Analytics) are built on Postgres, under `/api/v1/*`, with RLS by `school_id`.
