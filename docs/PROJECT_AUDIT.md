# 21CTA — Project Audit

Full detail: [docs/audit/SYSTEM_AUDIT.md](audit/SYSTEM_AUDIT.md). This file summarises what works, what is incomplete and what needs improvement, in priority order.

## 1. Repository contents
| Path | System | Stack |
|---|---|---|
| `apps/lesson-planner` | 21st Century Lesson Plan Generator | React 18 + Vite 5 / Express 4 / MySQL (Aiven) / Gemini + Groq |
| `apps/marks` | RMS-MIS (Marks Information System) | Vanilla JS SPA / Supabase (Postgres, Auth, RLS, Storage, Edge Functions) / Vercel PDF function |
| `docs/` | Audit and planning documents | — |

## 2. What works (verified)
| Item | Evidence |
|---|---|
| Lesson Planner frontend builds | `vite build` succeeds (bundle-size warnings only) |
| Lesson Planner backend parses | `node --check` passes on every backend file. All `require()`d packages are declared in `package.json` |
| RMS-MIS static references | Every `src`/`href` asset in `frontend/index.html` exists |
| RMS-MIS calculation tests (part) | 7 of 17 `node --test` cases pass |
| Feature set (code-level review) | LPG: CBC lesson plans (5E, 3P, UDL), batch generation, syllabus import, schedules, materials, AI chat, PDF/Word/ZIP export, subscriptions, admin. RMS: academic setup, teachers, learners, mark entry, DOS approval and locking, report cards, Excel/PDF export, analytics, digital library, examination centre, parent/principal portals |

Note: neither app was run against a live database in this audit, because no credentials were provided. "Works" here means it builds or passes tests. Real end-to-end checks are scheduled for Phases 6–7.

## 3. Incomplete or broken
| # | Item | Location |
|---|---|---|
| 1 | Agent "syllabus analysis" and "material processing" return canned results after `setTimeout` | `apps/lesson-planner/backend/src/services/agentService.js` |
| 2 | `GET /api/lessons/` is a stub that returns `[]` | `apps/lesson-planner/backend/src/routes/lessonRoutes.js` |
| 3 | `contactRoutes` checks `super-admin`, `system-admin`, `reb-admin`, but the MySQL `users.role` ENUM only allows `admin`, `teacher` | LPG |
| 4 | 10 of 17 RMS tests fail (tests and source have drifted apart) | `apps/marks/tests` |
| 5 | No automated tests for the Lesson Planner (`npm test` is a placeholder). No CI in the repo | LPG, repo root |
| 6 | SMS notifications are logged to `sms_notifications`, but no SMS gateway is wired | RMS |
| 7 | Schema changes are applied at runtime (LPG) or pasted by hand into the Supabase SQL editor (RMS). No migration ledger | both |
| 8 | No multi-school support in either system | both |

## 4. Duplicated code and functionality
* Two of everything core: users/auth, classes, subjects, notifications, AI assistants, admin dashboards, email senders (see SYSTEM_AUDIT §6).
* Edge functions are split across two folders. `apps/marks/backend/functions/` holds `rms-create-learner-account` and `welcome-teacher`. `apps/marks/supabase/functions/` holds `digital-library-ai`, `digital-library-index` and `_shared`. They should all live under `supabase/functions/` so the Supabase CLI can deploy them.
* `apps/marks/archive/sql/combined-database.sql` is a historical combined dump. Keep it as a reference only and never apply it.
* There are two email paths in LPG (nodemailer SMTP and EmailJS REST) and a third in RMS (browser EmailJS plus an edge function).

## 5. Configuration and dependency problems
* LPG `.env.example` is missing 15 variables that the code reads (listed in SYSTEM_AUDIT §4).
* The RMS Supabase URL and anon key are hardcoded in `frontend/js/config.js`, so staging and production cannot be separated.
* `lucide@latest` is loaded unpinned from unpkg.
* LPG frontend: main chunk is 947 kB, mermaid ELK 1.4 MB. Code-splitting is needed.

## 6. Security
See [SECURITY_AUDIT.md](SECURITY_AUDIT.md). One P0 item is already fixed (destructive startup migration, PR #1). Five open P0/P1 items are scheduled as the next PRs.

## 7. Prioritised plan
See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).
