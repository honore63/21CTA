# 21CTA — Migration and Implementation Plan

Rules applied: no data deletion, no MySQL → Postgres replacement, every migration additive (expand → migrate → contract), tested on staging first, original repos preserved.

## Phase 0 — Safety hotfixes (in the original repos, before integration)
| # | Change | Repo |
|---|---|---|
| 0.1 | Remove the destructive bootstrap from `server.js` entirely. Startup now performs a read-only health check and never drops tables | LPG |
| 0.2 | Rotate the Aiven password. `import_db.js` reads env vars. Purge the secret from git history | LPG |
| 0.3 | Replace `database/schema.sql` with schema-only + anonymised seed | LPG |
| 0.4 | Socket.IO handshake auth. `JWT_SECRET` fail-fast. Exact-origin CORS | LPG |
| 0.5 | Auth + origin restriction + network blocking for `/api/reports/pdf` | RMS |
| 0.6 | Triage the 10 failing RMS tests | RMS |

## Phase 1 — Audit ✅ (this document set)

## Phase 2 — Integration repo and infrastructure
* Create the `21CTA` repo: `apps/portal`, `apps/lesson-planner` (git subtree of LPG), `apps/marks` (git subtree of RMS-MMS), `apps/gateway`, `db/mysql/migrations`, `db/postgres/migrations`, `docs/`.
* Root `.env.example`, CI workflow, staging Supabase project + staging MySQL.
* Module sub-paths: Vite `base` + router `basename` for LPG. Path prefixing for RMS assets, `sw.js` scope and manifest.
* **Exit criteria:** both apps run unchanged under `/lesson-planner` and `/marks` on staging. Existing logins still work.

## Phase 3 — Central authentication (AUTHENTICATION_PLAN)
* MySQL: `identity_links` table.
* LPG dual-mode `authMiddleware`. Portal `/login`.
* Migration dry-run → link existing accounts (no deletes).
* **Exit criteria:** a teacher with accounts in both systems logs in once and reaches both modules. Legacy LPG tokens still accepted.

## Phase 4 — Multi-school data model
Postgres (expand):
1. Create `schools`, `school_memberships`, `platform_admins`, `module_settings`, `platform_audit_log`.
2. Insert the existing school (from `school_settings`) as school #1 (Rukara Model School).
3. `ALTER TABLE <each RMS table> ADD COLUMN school_id uuid NULL REFERENCES schools(id)`, then backfill to school #1 in batches, then `SET NOT NULL` + index. Covers: users, teachers, learners, classes, subjects, academic_years, terms, assessments, assessment_types, marks, grading_scales, teacher_assignments, announcements, messages, notifications, documents, digital_library_*, examinations, question_bank, audit_logs, school_settings, …
4. Add `school_id` triggers/defaults from the caller's active membership.
5. **RLS hardening (contract):** add a RESTRICTIVE policy per table, `school_id IN (select school_id from school_memberships where user_id = auth.uid())`. Restrictive policies are AND-ed with the existing ones, so current role logic is preserved and cross-school isolation is added without rewriting the 250 policies. Update the anonymous RPCs to require a school code.
6. Uniqueness changes: `learner_code`, `teacher_code` and class/subject names become unique **per school** (`UNIQUE(school_id, learner_code)`). The global unique constraints are dropped only after the backfill is verified.

MySQL (expand): `users.school_id CHAR(36) NULL`, filled from `school_memberships` for linked users. `school_name` is kept.
* **Exit criteria:** an automated isolation test suite (extending RMS `verify_dos_isolation.sql`) proves that a user from school B cannot read or write school A rows through PostgREST, RPC, Storage, Realtime or the gateway.

## Phase 5 — Unified frontend and dashboard
Portal shell: sidebar navigation across modules, role-aware dashboard widgets with real data only, school switcher, notifications drawer, profile and settings. The RMS and LPG UIs keep running inside their sub-paths, with a shared header injected (or a link back to the portal).

## Phase 6 — Lesson Planner integration
Supabase-token-only mode, `/api/v1/lessons` via the gateway, optional link of planning classes/subjects to RMS classes/subjects, school-scoped subject catalogue, subscription model moved to per school (decision needed).

## Phase 7 — Marks (RMS-MIS) integration
Supabase config injected per environment, `school_settings` per school, report headers per school, PDF function behind auth, RMS admin pages exposed under `/school-management`.

## Phases 8–15
Library (from RMS digital library + LPG materials), Assessment portal (from the examination centre), Class Diary + Attendance + Timetable (new; can reuse LPG `teacher_schedules` and RMS `teacher_assignments`), AI assistant gateway, CPD and Portfolio (new), Student/Parent portals (from the RMS parent and learner portals, with proper parent accounts in place of code-only lookup), Analytics, then security assessment, load testing and the national rollout.

## Data-preservation controls
* Full backups of Aiven MySQL and Supabase before each production migration. Restore tested on staging.
* Each migration has a dry-run, row-count reconciliation (before/after per table and per school), and a written rollback.
* No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` or destructive `DELETE` without explicit written approval from the owner.

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| LPG boot-time DROP triggered on a new or misconfigured DB | Total data loss | Phase 0.1 before anything else |
| RLS changes lock out users or leak across schools | High | Restrictive-policy approach, isolation tests, staging soak |
| bcrypt hash import behaves differently than expected | Users must reset passwords | Validate on staging. Fallback: the link flow verifies the LPG password once |
| Duplicate or conflicting emails across systems | Wrong account linking | Verified-email-only auto-link, manual review queue |
| Vercel limits (Puppeteer size/time, no WebSocket proxy) | PDF or realtime failures | `rt.` sub-domain for sockets. Move PDF to the Render service if needed |
| Unpinned CDN scripts in RMS | Supply-chain risk | Pin versions + SRI or bundle locally |
| Upstream LPG repo ownership unknown | Cannot preserve or update the original | Confirm the repo URL and access |
| Manual Supabase migrations drift between environments | Broken deploys | Move to `supabase/migrations` + CI |

## Open decisions for the owner
1. Where should the `21CTA` repo live: `honore63/21CTA`, public or private?
2. What is the upstream GitHub URL of the Lesson Plan Generator, and who has access to its Render, Aiven and Vercel accounts?
3. Should subscriptions/payments be per teacher (current LPG) or per school?
4. Hosting: Vercel + Render (recommended), or a single VPS?
5. Is `21cta.com` confirmed?
