# 21CTA — API Integration Map

## 1. Existing APIs

### LPG Express (`/api/*`, Bearer JWT unless marked public)
| Mount | Endpoints |
|---|---|
| `/api/auth` | POST `register`, `login` (public). GET `google`, `google/callback`. GET/PUT `profile`. POST `change-password`. POST `forgot-password`, `reset-password` (public) |
| `/api/classes` | GET `/`, `/stats`, `/:id`. POST `/`. PUT/DELETE `/:id`. POST `/:id/subjects`. DELETE `/:id/subjects/:subjectId` |
| `/api/subjects` | GET `/`, `/:id`. POST `/`. PUT/DELETE `/:id` (admin) |
| `/api/units` | GET/POST `/classes/:classId/subjects/:subjectId/units`. GET/PUT/DELETE `/:id` |
| `/api/lessons` | GET `/` (stub). GET/POST `/units/:unitId/lessons`. GET/PUT/DELETE `/:id` |
| `/api/lesson-plans` | GET `/recent`, `/all`, `/units/:unitId/plans`, `/lessons/:lessonId/plan`, `/lessons/:lessonId/plan/history`. POST `/units/:unitId/plans/batch-generate`, `/lessons/:lessonId/plan/generate`. PUT/DELETE `/:id` |
| `/api/syllabuses` | GET `/`, `/match`, `/subject/:subjectId`, `/:id`. POST `/import`. Admin: POST `/`, `/process-pdf`. PATCH `/:id/structured-data`. DELETE `/:id` |
| `/api/schedules` | GET/POST `/:classSubjectId`. POST `/:classSubjectId/populate-dates` |
| `/api/materials` | GET `/`, `/:id`, `/:id/download`. POST `/upload`. DELETE `/:id` |
| `/api/reference-materials` | GET `/`, `/subject/:subject_id`, `/lesson/:lesson_id`. POST `/upload`, `/attach`. DELETE `/:id` |
| `/api/chat` | POST `/public-query` (public), `/query`, `/upload`. GET/DELETE `/history`. GET `/sessions`. PUT/DELETE `/sessions/:id` |
| `/api/agent` | POST syllabus analyze, lesson process-materials / generate-plan, unit batch-generate. GET `status`, `status/:jobId`, `result/:jobId`, `capabilities`, `tasks`, `summary`. PUT/DELETE `tasks/:id` |
| `/api/notifications` | GET `/`, `/unread-count`. PUT `/mark-read`. Admin: POST `/send`, GET `/all`, DELETE `/:id` |
| `/api/subscription` | GET `promo-status` (public), `status`. POST `payment-proof`. Admin: pending/all/activate/plan/promo/email-queue |
| `/api/admin` | users CRUD, suspension, reset password, send email, stats, cleanup, backup |
| `/api/dashboard` | GET `/stats` |
| `/api/contact`, `/api/visitors` | public submit/track. Admin read |
| `/api/health` | public |
| Socket.IO | `join_user` → room `user_<id>` (unauthenticated, see audit) |

Rate limiters: global `/api/`, stricter on `/api/auth`, AI limiter on `/api/agent`, `/api/chat`, `/api/lesson-plans/generate`.

### RMS-MIS
| Interface | Details |
|---|---|
| Supabase PostgREST (from the browser, anon key + user JWT) | Table CRUD under RLS (all tables in DATABASE_MAP §3) |
| Supabase RPC | `rms_register_teacher`, `rms_delete_teacher`, `send_message`, `create_notification`, `rms_publish_notification`, `link_auth_user`, … Anonymous: `student_marks_portal_options`, `get_student_marks_portal`, `rms_exam_guest_list/start/save_answer/save_written_answer/submit`, `rms_library_track_event` |
| Supabase Realtime | one channel (`realtime.js`) with table subscriptions from `sync-registry.js` |
| Edge Functions (verify_jwt) | `rms-create-learner-account`, `digital-library-ai`, `digital-library-index`, `welcome-teacher` |
| Vercel | POST `/api/reports/pdf` (HTML → PDF; unauthenticated) |

## 2. Target public API surface `/api/v1/*`
The `/api/v1` gateway is a thin routing layer. At first it **proxies** to the existing services and does not reimplement them.

| 21CTA route | Phase | Backed by |
|---|---|---|
| `/api/v1/auth/*` | 3 | Supabase Auth (client SDK) + gateway endpoints `session`, `me`, `link-legacy-account` |
| `/api/v1/schools/*`, `/api/v1/users/*`, `/api/v1/admin/*` | 4 | New platform service on Postgres (`schools`, `school_memberships`) |
| `/api/v1/lessons/*` | 6 | Proxy → LPG Express `/api/*` (path rewrite `/api/v1/lessons/<x>` → `/api/<x>`). Supabase JWT accepted |
| `/api/v1/marks/*`, `/students/*`, `/teachers/*` | 7 | Supabase PostgREST/RPC (the browser keeps calling Supabase directly). The gateway exposes only aggregated, read-only endpoints for cross-module dashboards |
| `/api/v1/library/*`, `/assessment/*` | 8–9 | Existing RMS tables, edge functions and examination RPCs |
| `/api/v1/class-diary/*`, `/attendance/*`, `/timetable/*`, `/cpd/*`, `/analytics/*` | 10–14 | New services on Postgres |
| `/api/v1/ai/*` | 11 | Gateway → LPG `aiService` (generation/chat) and Supabase `digital-library-ai` (RAG). Quotas are enforced in one place |

### Gateway implementation choice
**Option A (recommended):** add an `apps/gateway` Express service, the same stack as LPG, on the same host as the LPG backend. It verifies the Supabase JWT once and resolves `school_id` and role from `school_memberships`. It forwards the request with signed internal headers (`X-21CTA-User`, `X-21CTA-School`, HMAC). LPG trusts these headers only when their signature is valid.

**Option B:** each service verifies the Supabase JWT itself. Fewer moving parts, but the authorisation logic is duplicated.

## 3. Path collision resolution
| Path | LPG today | RMS today | 21CTA |
|---|---|---|---|
| `/`, `/login`, `/register`, `/dashboard`, `/profile` | LPG SPA | RMS SPA (`/` = public school portal) | **Portal shell** |
| `/admin/*` | LPG admin | `#admin/*` hash routes | Portal `/admin`. Module admin stays inside its module |
| `/lesson-planner/*` | — | — | LPG SPA (Vite `base: '/lesson-planner/'`, `BrowserRouter basename`) |
| `/marks/*` | — | — | RMS SPA served from `/marks/` (hash routes continue to work. `sw.js` scope, manifest and `/public/*` absolute paths need a prefix) |
| `/api/*` (legacy) | LPG API | `/api/reports/pdf` | Kept during the transition for old clients. `/api/reports/pdf` → `/api/v1/reports/pdf` |
| `/uploads/*` | LPG static | — | `/lesson-planner/uploads/*` or Cloudinary URLs |

## 4. Cross-system calls needed (initial)
1. Portal dashboard → LPG `GET /api/dashboard/stats` and RMS counts (RPC). Real data only. Widgets show "unavailable" on error and never use placeholder numbers.
2. LPG lesson plan → optional "link to RMS class/subject" (Phase 6+). It reads the RMS classes the teacher is assigned to through the gateway.
3. Notifications centre → merges LPG `/api/notifications` with RMS `notifications` (read-only fan-in).
