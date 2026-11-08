# SYSTEM_AUDIT.md

> **Historical recommendation note (2026-11-08):** The source findings below remain a static audit baseline. The former PostgreSQL control-plane recommendation is superseded by [`MYSQL_UNIFICATION_PLAN.md`](MYSQL_UNIFICATION_PLAN.md). No live system was inspected by this audit.

**Project:** 21st Century Teacher Assistant (21CTA)
**Document type:** Technical integration audit — Phase 1 deliverable
**Date:** 2026-11-08
**Auditor role:** Architecture / full-stack / database / DevOps / security review
**Audit method:** Static inspection of both source snapshots
**Status:** Complete for available source. Live databases, hosting consoles and DNS were not accessible.

---

## 1. Executive summary

Both applications exist, are substantial, and contain working functionality that must be preserved.
They are **not architecturally compatible today**:

| Dimension | System A — Lesson Plan Generator | System B — RMS-MIS |
|---|---|---|
| Frontend | React 18 + Vite SPA | Vanilla HTML/CSS/JS SPA, no build step |
| Backend | Node.js/Express REST API | **No application server** — browser talks directly to Supabase |
| Database | MySQL 8/MariaDB | PostgreSQL (Supabase) |
| Identity | Custom JWT (HS256) + bcrypt + Google OAuth | Supabase Auth (GoTrue) + RLS |
| Tenant model | Single implicit school via free-text `school_name` | Single school (Rukara Model School) — **zero `school_id` columns** |
| Automated tests | None (`npm test` exits 1) | 3 `node:test` suites |
| Deployment | Render (backend) + optional Vercel (frontend) | Vercel + managed Supabase |

**Verdict:** 21CTA can be built safely as a **strangler-style platform around the two systems**, with a new
NestJS/PostgreSQL control plane and an anti-corruption layer in front of System A. It **cannot** be exposed
as a multi-school platform until System B receives a real tenant model and System A stops its destructive
startup migration.

**Recommended first move:** Phase 1 remediation and foundation only — rotate secrets, make System A
non-destructive, freeze schema dumps, create verified backups, then add additive identity/school tables.
Do **not** start with a UI redesign.

### Blocking findings (resolve before any production integration)

| # | Finding | System | Why it blocks |
|---|---|---|---|
| B-1 | `backend/.env.example` contains what appear to be **live Gemini and Groq API keys** | A | Credentials are compromised by being in source control. Rotate now. |
| B-2 | Server startup can **drop every non-view table** if seed user `id = 2` is absent | A | A routine restart could destroy the lesson-plan database. Must be removed/replaced before any deployment. |
| B-3 | No `school_id` / tenant column anywhere; RLS is single-school | B | Opening `/marks` to a second school would leak learner and marks data. |
| B-4 | No verified backups or restore test were provided | A + B | Every migration step is unsafe until this exists. |
| B-5 | Duplicate identities with no verified linking model | A + B | Merging by name/email risks attaching one teacher's records to another person. |

---

## 2. Scope, method and limitations

### Inspected

- Full file inventory of both snapshots (excluding `node_modules`).
- Package manifests, entry points, route definitions, controllers, middleware, config.
- MySQL schema dump and runtime DDL in System A.
- PostgreSQL master schema, RLS policies, helper functions and feature SQL in System B.
- Authentication code in both systems.
- Deployment descriptors (`vercel.json`, `supabase/config.toml`, Vite config, README claims).
- Existing tests.

### Not inspected / not verified

- Live production data, row counts, indexes actually deployed, or migration drift.
- Supabase project settings, Auth providers, email templates, JWT expiry, RLS enabled state in production.
- Environment variable values (only variable **names** in `.env.example` were reviewed).
- Hosting dashboards, DNS, TLS, billing, uptime.
- Git history and remotes: **neither snapshot contains a `.git` directory**, so branches, authorship and
  provenance could not be verified. The READMEs claim remotes (`honore63/RMS-MMS`, a Render deployment,
  a Vercel deployment) — treat these as claims, not confirmed facts.
- Actual browser/runtime behaviour. No application was started.

### Inventory

| Repo | Files | Source lines (JS/JSX/TS/HTML/CSS/SQL) | Package manifests |
|---|---:|---:|---|
| System A (`digital_lesson_plan-main`) | 184 | 40,338 | `backend/package.json`, `frontend/package.json` |
| System B (`RMS-MMS-main`) | 113 | 53,545 | root `package.json` (PDF server only) |

---

## 3. System A — 21st Century Lesson Plan Generator

### 3.1 Stack and entry points

| Layer | Detail |
|---|---|
| Frontend | React 18, React Router 6, Vite 5, Axios, Chart.js, jsPDF, docx, JSZip, Socket.IO client |
| Backend | Node.js, Express 4, `mysql2`, JWT, bcryptjs, Multer, Helmet, CORS, rate limiting, Socket.IO |
| Data | MySQL (`lessonplan_db`), 12 base tables + at least 14 runtime-created tables |
| AI | Google Gemini and Groq; provider fallback chain implemented in `backend/src/services/aiService.js` |
| Files | Cloudinary (optional) + local `backend/uploads` fallback |
| Async | Redis + in-process email queue |
| Auth | Custom JWT, email/phone + password, Google OAuth 2.0 |
| Entry points | `backend/src/server.js`, `frontend/src/main.jsx` → `App.jsx` |

### 3.2 Functional modules observed

- Classes, subjects, class-subject assignment.
- Units, lessons, lesson plans with versions and history.
- AI generation (single lesson, unit batch), syllabus analysis and import.
- 5E / 3P / UDL lesson structures, special-needs provisions.
- Teaching materials, reference materials, file upload/download.
- Syllabuses and structured syllabus extraction.
- Teacher schedules (`teacher_schedules`), term settings, holidays.
- AI chat assistant with sessions, context and file upload.
- Notifications, visitor analytics, contact messages.
- Subscription plans and payment-proof workflow.
- Admin user management, suspensions, password reset, backup endpoint.
- Client-side PDF, Word and ZIP export.
- Multilingual/Kinyarwanda handling in prompts and UI.

### 3.3 Route surface (observed)

Mounted under `/api`: `auth`, `classes`, `subjects`, `units`, `lessons`, `lesson-plans`, `materials`,
`reference-materials`, `admin`, `syllabuses`, `schedules`, `chat`, `contact`, `notifications`,
`visitors`, `subscription`, `dashboard`, `agent`, plus `/api/health`.

Approximately **110 route handlers** were counted across `backend/src/routes/*.js`.

### 3.4 Data model characteristics

- Integer primary keys (`int(11) AUTO_INCREMENT`).
- `users` has `role ENUM('admin','teacher')`, free-text `school_name`, `is_suspended`.
- Classes belong to a single `teacher_id`; there is no school entity.
- `class_subjects` links classes and subjects; units hang off class-subject; lessons hang off units.
- 16 foreign keys and 27 secondary/unique indexes in the dump.
- The schema dump includes sample production-like rows: named users with bcrypt hashes, classes,
  AI prompts, chat content. **Treat the dump as sensitive data.**

### 3.5 Critical System A behaviours

1. **Destructive auto-migration.** `backend/src/server.js` (startup block) checks for `users.id = 2`.
   If missing — or if a query fails — it enumerates all tables, excludes names starting with `V_`,
   and executes `DROP TABLE`. It then rebuilds from `database/schema.sql`. This is the single most
   dangerous behaviour found in either system.
2. **Unsigned fallback JWT secret.** `config/jwt.js` falls back to a literal default secret if
   `JWT_SECRET` is unset. Anyone who knows the default can mint tokens.
3. **Schema drift is repaired at boot.** Additional `ALTER TABLE` and `CREATE TABLE` statements run at
   every startup. There is no migration ledger, checksum or version table.
4. **No tests.** The backend `test` script is a placeholder that exits with an error.
5. **Committed credentials.** `.env.example` is not a placeholder file for at least two AI providers.
6. **Schema/code mismatch.** `authController.js` writes `fingerprint`, `last_ip` and `user_devices`, but
   the committed schema does not define them; `init_new_features.sql` does, and is not executed by the
   startup path. Registration/login with a fingerprint can therefore fail depending on the live schema.

---

## 4. System B — RMS-MIS

### 4.1 Stack and entry points

| Layer | Detail |
|---|---|
| Frontend | Static HTML + CSS + vanilla ES6 modules, hash router, no build step |
| Data access | `@supabase/supabase-js` v2 loaded from CDN; browser calls Supabase directly |
| Backend | Supabase (PostgreSQL, Auth, RLS, Realtime, Storage, Edge Functions) |
| Serverless | `api/reports/pdf.js` on Vercel (Puppeteer PDF) |
| Entry point | `frontend/index.html` → `js/app.js` |
| Auth | Supabase Auth with `auth.users`; profile rows in `public.users` keyed by `auth.uid()` |
| Deployment | Vercel (`vercel.json` rewrites all paths to `frontend/`) + managed Supabase |

### 4.2 Functional modules observed

- Staff login, profile bootstrap, teacher self-provisioning.
- Academic years, terms, classes, class-subjects, subjects catalogue.
- Teachers, learners (manual + Excel import), teacher assignments.
- Assessments, assessment types, weights, mark entry, auto-save, submit.
- DOS/headteacher approval workflow, lock/reopen, audit logs.
- Grading scales and performance comments.
- Report Center: report cards, class lists, mark sheets, analytics, Excel/PDF export.
- Notifications, announcements, acknowledgements, private messages + attachments.
- Digital Library with AI indexing/retrieval (`digital_library_*`).
- Examination Centre: exams, classes, question bank, attempts, answers, guest attempts, grading.
- Parent/student marks portal via narrowly scoped RPCs.
- Principal/headteacher dashboard, communication centre.
- PWA manifest and service worker.

### 4.3 Data model characteristics

- UUID primary keys, extensive RLS, many `SECURITY DEFINER` helper functions.
- **No tenant column at all**: 0 matches for `school_id` or `tenant` in the master schema.
- Global uniqueness that blocks multi-school use:
  - `academic_years.name` UNIQUE, plus a single-current-year rule enforced by a partial unique index.
  - `subjects.code` UNIQUE.
  - `assessment_types.name` and `assessment_types.code` UNIQUE.
  - `teachers.teacher_code`, `learners.learner_code` UNIQUE.
  - `teachers.phone`, `users.phone` UNIQUE.
- `school_settings` is a single settings record, not per-school.
- 37 tables observed across master + feature SQL, including library and examination tables.
- Over 60 functions and well over 100 policies/triggers.

### 4.4 Critical System B behaviours

1. **Direct browser-to-database architecture.** All reads/writes use the anon key and RLS. This is a
   legitimate Supabase pattern, but it means the security boundary is RLS, not an application server.
   New platform modules that require privileged logic must not follow this pattern blindly.
2. **Client-side role inference.** `frontend/js/auth.js` creates a missing profile with a role inferred
   from email substrings (`admin`, `dos`, `principal`, `parent`, etc.). A user whose email contains
   `admin` can attempt to self-assign a privileged role. Existing RLS limits self-insert to
   `role = 'teacher'`, which mitigates but does not make the pattern acceptable.
3. **Role check inconsistency.** `public.users.role` CHECK allows only `dos`, `teacher`, `headteacher`,
   while the client inserts `parent` for some accounts. Those inserts will fail. Parent access is
   currently served by the separate RPC portal, not by `public.users`.
4. **Global DOS scope.** DOS isolation is by education level (Primary/Secondary), not by school.
5. **Public lookup surfaces.** Learner-code + class lookup and guest examinations are intentionally
   public-ish. They need rate limiting and abuse monitoring before national exposure.
6. **CSP permits `unsafe-inline` and `unsafe-eval`.** Acceptable for the current vanilla app, not for the
   new platform shell.

---

## 5. Module-by-module inventory against the 21CTA target

Legend: **Exists** = working code observed; **Partial** = some data/UI exists but not the required scope;
**Missing** = no implementation found.

| Target module | System A | System B | Integration position |
|---|---|---|---|
| 01 AI Lesson Plan Generator | **Exists** (core) | — | Wrap, preserve, add school-aware sharing/approval/analytics |
| 02 Marks Information System | — | **Exists** (core) | Preserve calculations, approvals, locks, reports; add tenant model |
| 03 Digital Library | Partial (materials/reference files) | **Exists** (`digital_library_resources` + AI) | Extend System B library; unify with A materials |
| 04 Assessment Portal | — | **Partial/Exists** (Examination Centre + question bank + attempts) | Harden, add school scoping, integrate marks |
| 05 Digital Class Diary | Partial (`lessons.is_completed`, reflection) | Missing | Build new module in PostgreSQL, link to A lesson plans |
| 06 Attendance | Missing | Missing | Build new module |
| 06 Timetable | Partial (`teacher_schedules`, `term_settings`, `holidays`) | **Partial** (5 references only) | Build canonical timetable in PostgreSQL; optionally import A schedules |
| 07 AI Teaching Assistant | **Exists** (chat/agent + providers) | Partial (library AI) | Centralize provider access; add quotas/logging |
| 08 CPD / Teacher Portfolio | Missing | Missing | Build new module |
| 09 Student/Parent Portals | Missing | **Partial/Exists** (marks portal, principal/parent pages) | Extend with verified parent–learner links |
| 10 Analytics | Partial (teacher/admin stats) | **Exists** (analytics engine + SQL) | New reporting layer over both DBs |
| Notifications | **Exists** | **Exists** | One platform notification service; adapters to both |
| Administration | **Exists** (single admin) | **Exists** (DOS/headteacher) | New super-admin/school-admin control plane |
| Central auth | Custom JWT | Supabase Auth | Supabase Auth as central IdP (see auth plan) |
| Multi-school | Missing | Missing | New core; largest schema change |

**Implication:** Modules 03, 04, 07 and parts of 09/10 already exist in System B and must be **extended,
not rebuilt**. The 21CTA prompt's assumption that these are greenfield is only partly true.

---

## 6. Duplication and conflicts

| Concern | System A | System B | Conflict / decision |
|---|---|---|---|
| Users | MySQL `users` (int id, bcrypt) | `auth.users` + `public.users` (UUID) | Two identities per person possible. Need `identity_links`. |
| Roles | `admin`, `teacher` | `dos`, `teacher`, `headteacher` (+ broken `parent`) | Need platform role enum + per-school membership roles. |
| Schools | Free-text `school_name` | Single-school settings row | Need canonical `schools` table owned by PostgreSQL. |
| Classes/subjects | MySQL tables with int ids | PostgreSQL tables with UUIDs | Do **not** sync blindly. Cross-reference by platform UUID + legacy id. |
| Lesson plans | MySQL | None | System A remains owner until approved migration. |
| Marks | None | PostgreSQL | System B remains owner. Link assessments to lesson plans via platform UUID only when needed. |
| Library | `teaching_materials`, `reference_materials` | `digital_library_resources` | Consolidate metadata in PostgreSQL; files stay in their current stores initially. |
| Timetable | `teacher_schedules` (MySQL) | Minimal references | New canonical timetable; import A rows later. |
| Notifications | MySQL notifications + Socket.IO | PostgreSQL notifications + Realtime | One dispatcher; channel adapters; do not double-send. |
| AI | Gemini/Groq in Express | Library AI in Edge Functions | Central provider service with quotas, server-side keys. |
| File storage | Cloudinary + local disk | Supabase Storage | Keep both initially; new platform uses private object storage with signed URLs. |
| Design system | Glassmorphism CSS + `design-system.css` | `styles.css` design system | Build one 21CTA shell; embed legacy modules in their own route shells. |

---

## 7. Security findings

Severity is based on exploitability and blast radius in the intended multi-school deployment.

| ID | Severity | Finding | Evidence | Required action |
|---|---|---|---|---|
| SEC-01 | **Critical** | AI provider API keys committed in `.env.example` | System A backend env template | Rotate both providers immediately; purge from history; add secret scanning. |
| SEC-02 | **Critical** | Startup can drop all tables | `server.js` destructive migration block | Remove before any deployment; replace with versioned migrations. |
| SEC-03 | **Critical** | No tenant isolation in RMS-MIS | 0 `school_id` matches in master schema | Add tenant columns + RLS before multi-school exposure. |
| SEC-04 | High | JWT secret has a hardcoded fallback | `config/jwt.js` | Fail startup if `JWT_SECRET` missing/weak; rotate. |
| SEC-05 | High | Client infers privileged roles from email substrings | `frontend/js/auth.js` | Remove inference; server/admin assigns roles only. |
| SEC-06 | High | Public learner-code lookup and guest exams | RPCs in parent/exam SQL | Rate limit, add monitoring, consider parent OTP, review privacy. |
| SEC-07 | High | Long-lived JWT (7 days) in browser storage | System A auth | Short access token, refresh rotation, revocation, secure storage strategy. |
| SEC-08 | High | 400+ RLS policies but no cross-school tests | System B SQL | Add automated tenant-isolation tests before onboarding school #2. |
| SEC-09 | Medium | CSP allows `unsafe-inline`/`unsafe-eval` | System B `index.html` | Tighten for the new shell; legacy app can keep temporary exception. |
| SEC-10 | Medium | Committed schema dump contains named users, bcrypt hashes, AI prompts | System A `database/schema.sql` | Remove from repo or replace with a sanitized schema-only dump. |
| SEC-11 | Medium | Supabase URL/anon key hardcoded in frontend | System B `config.js` | Inject at build time; anon key is public by design, but configuration should be environment-driven. |
| SEC-12 | Medium | CORS implicitly trusts any `*.vercel.app`/`*.onrender.com` origin | System A `config/cors.js` | Restrict to the actual platform domains in production. |
| SEC-13 | Medium | No rate limiting on direct Supabase RPC surfaces | System B | Gateway/edge throttling and abuse alerts. |
| SEC-14 | Medium | No automated secret/dependency scanning | Both | Add CI checks (gitleaks, npm audit, Dependabot). |
| SEC-15 | Low/Medium | No git history in snapshots | Both | Import real histories; do not treat snapshots as authoritative releases. |

**No credentials found in this report.** The compromised values must be treated as secrets even if they
appear to be examples.

---

## 8. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-01 | Destructive migration wipes lesson data | Medium | Catastrophic | Remove auto-drop; versioned migrations; backups | Backend lead |
| R-02 | Cross-school data leak | High if launched early | Catastrophic | Tenant columns + RLS + tests; stage rollout | DB/security lead |
| R-03 | Account mis-linking attaches records to wrong person | Medium | High | Verified linking; admin approval; audit | Identity lead |
| R-04 | Marks calculations change silently | Medium | High | Freeze logic; golden tests; regression suite | Academic lead |
| R-05 | Two frontends diverge / duplicated work | High | Medium | One shell; reuse modules; design tokens | Frontend lead |
| R-06 | MySQL/Postgres drift during dual operation | High | High | Ownership map; one writer per record; reconciliation jobs | Data lead |
| R-07 | AI cost/abuse | Medium | Medium | Quotas, logging, provider abstraction, kill switch | Platform lead |
| R-08 | Supabase project ownership/credentials unavailable | Medium | High | Confirm ownership before Phase 3 | Product owner |
| R-09 | No restore-tested backups | Medium | Catastrophic | Backup + restore drill before migration | DevOps |
| R-10 | Parent/learner privacy exposure via public RPCs | Medium | High | Throttle, monitor, add OTP, review | Security lead |
| R-11 | Legacy `school_settings` collision across schools | High | Medium | Per-school settings table + migration | Data lead |
| R-12 | File storage migration breaks downloads | Medium | Medium | Keep both stores; signed URL adapter; checksum verification | Backend lead |

---

## 9. Integration strategy evaluation

### Option A — Big-bang rewrite into one stack (rejected)

Rebuild both systems in NestJS/React. Highest fidelity to the target architecture, but violates the rule
"do not rebuild working systems unnecessarily", discards validated RLS and academic logic, and has the
largest regression surface. **Rejected.**

### Option B — Iframe/portal aggregation (rejected)

Place both apps behind one login and embed them in iframes. Fast, but poor UX, difficult responsive
behaviour, duplicated navigation, weak cross-module workflows, and authentication still splits.
**Rejected as a destination; acceptable only as a temporary internal demo.**

### Option C — Strangler facade + anti-corruption layer (recommended)

- New **platform-core** (NestJS, TypeScript, PostgreSQL) owns identity, schools, memberships,
  permissions, new modules, and the `/api/v1` contract.
- **System A** stays on MySQL. The facade calls its Express API with a short-lived internal token.
  Lesson-plan data remains in MySQL.
- **System B** stays on Supabase for now. Marks, library and examinations are reached through
  service-layer adapters and/or scoped RPCs; the browser stops being the only boundary for new flows.
- New 21CTA React shell mounts legacy experiences under `/lesson-planner`, `/marks`, `/library`,
  `/assessment` without forcing a second login.
- Each legacy module can be internally modernized later behind the same contract.

**Why this wins:** preserves data and working workflows, allows incremental delivery, keeps blast radius
small, and gives a credible path to consolidate later. It also matches the explicit instruction to keep
MySQL and PostgreSQL initially.

### Option D — New unified DB and immediate consolidation (deferred)

Migrate MySQL into PostgreSQL and rebuild System A on the new schema. Only viable after Option C is
stable, and only with explicit authorization. **Deferred to a separate approved project.**

---

## 10. Recommended target architecture (summary)

```
                         https://21cta.com
                                │
                     Caddy / Nginx (TLS, WAF, rate limit)
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
   21CTA Web              21CTA API                 Legacy adapters
   (React/TS)            (NestJS/TS)               (server-side only)
        │                       │                        │
        │            ┌──────────┼──────────┐       ┌─────┴──────┐
        │            │          │          │       │            │
        │      Redis/BullMQ  PostgreSQL   Object  System A    System B
        │      (jobs/quota)  (Supabase)   storage (MySQL API) (Supabase)
        │                       │
        └──── Supabase Auth ────┘
```

- One domain, path-based routing.
- Supabase Auth is the initial central identity provider.
- PostgreSQL is the system of record for schools, memberships, new modules and audit.
- MySQL remains the system of record for legacy lesson plans until an approved migration.
- No database port is exposed publicly; no browser connection to MySQL.

Detailed schema, API, auth, deployment and migration plans are in the companion documents.

---

## 11. Phase plan and gates

| Phase | Deliverable | Gate to advance |
|---|---|---|
| 1 | This audit and six plans | Product owner accepts findings and scope |
| 2 | Hosting/infrastructure baseline | Secrets rotated; backups restore-tested; staging reachable over TLS |
| 3 | Central authentication | One login works for A + B test accounts; linking audited; no auto-merge |
| 4 | Multi-school data model + permissions | Tenant isolation tests pass for at least 2 synthetic schools |
| 5 | Unified shell + dashboard | Role dashboards use real queries; no dead buttons |
| 6 | Lesson generator integration | All existing A features reachable; exports unchanged; regression suite green |
| 7 | RMS-MIS integration | Marks calculations and approval workflow regression-tested |
| 8 | Digital Library | Upload/download/search/permissions tested |
| 9 | Assessment Portal | Exam timing, autosave, submission, marking tested |
| 10 | Class Diary + Attendance + Timetable | Conflict detection and correction workflows tested |
| 11 | AI Teaching Assistant | Quotas, logging, provider failover, review workflow |
| 12 | CPD + Portfolio | Records, certificates, observation workflow |
| 13 | Student/Parent portals | Verified relationships; no cross-learner exposure |
| 14 | Analytics | Real queries only; school-scoped; no fabricated figures |
| 15 | Security/performance/national readiness | Pen-test, load test, restore drill, runbooks |

**No phase may be marked complete without evidence** (tests, screenshots/logs, migration records).

---

## 12. Decisions required from the product owner

1. Confirm ownership and admin access to the Supabase project (`ztlfidglxfwjpxkqfviy`).
2. Confirm ownership of the MySQL instance and permission to add columns/tables.
3. Confirm the production domain (`21cta.com`) and DNS control.
4. Approve Supabase Auth as the initial central IdP.
5. Approve the rule that RMS-MIS remains single-school until tenant isolation is complete.
6. Provide the school onboarding list and the first pilot schools.
7. Approve rotation of all AI keys and email/SMS credentials.
8. Decide whether legacy AI prompt logs and schema dumps may be retained (they contain PII).
9. Name the academic authority who signs off on marks-calculation preservation.
10. Authorize (or defer) any future MySQL→PostgreSQL consolidation in writing.

---

## 13. Audit conclusion

The integration is feasible and the existing systems are worth preserving. The correct next step is
**not** to generate the application, but to remove the destructive and exposed conditions, establish
verified backups, and build the additive identity/school foundation. The plans in this folder are
written so that each step is reversible and independently testable.

**Audit status: complete. Implementation is gated on approval of this document.**
