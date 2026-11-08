# API_INTEGRATION_MAP.md

> **Historical target note (2026-11-08):** The existing-interface inventory remains useful, but any target design that relies on Supabase PostgreSQL/Auth is superseded by [`MYSQL_UNIFICATION_PLAN.md`](MYSQL_UNIFICATION_PLAN.md). The target API must be the sole relational-data access path.

**Project:** 21CTA
**Scope:** Existing interfaces, target `/api/v1` contract, adapter design, authorization, versioning
**Non-negotiable:** the browser never connects to MySQL and never holds database or provider secrets.

---

## 1. Existing interfaces

### 1.1 System A — Express REST API (MySQL)

Base path: `/api`. Authentication: `Authorization: Bearer <custom JWT>`.

| Area | Routes observed | Auth |
|---|---|---|
| Health | `GET /api/health` | public |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET/PUT /api/auth/profile`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | mixed |
| Classes | `GET /api/classes`, `GET /api/classes/stats`, `GET /api/classes/:id`, `POST/PUT/DELETE /api/classes/:id`, `POST/DELETE /api/classes/:id/subjects` | JWT + role |
| Subjects | `GET/POST/PUT/DELETE /api/subjects` | JWT + role |
| Units | `GET/POST/PUT/DELETE /api/units/...` | JWT + role |
| Lessons | `GET/POST/PUT/DELETE /api/lessons/...` | JWT + role |
| Lesson plans | `GET /api/lesson-plans/recent`, `/all`, `/units/:unitId/plans`, `/lessons/:lessonId/plan`, `/lessons/:lessonId/plan/history`; `POST .../generate`, `.../batch-generate`; `PUT/DELETE /api/lesson-plans/:id` | JWT + role |
| Materials | `GET/POST/DELETE /api/materials`, `GET /api/materials/:id/download` | JWT |
| Reference materials | `GET/POST/DELETE /api/reference-materials`, `POST /attach`, `GET /lesson/:lesson_id` | JWT |
| Syllabuses | `GET/POST/PATCH/DELETE /api/syllabuses`, `POST /import`, `POST /process-pdf`, `GET /match` | JWT + admin for writes |
| Schedules | `GET/POST /api/schedules/:classSubjectId`, `POST .../populate-dates` | JWT |
| AI agent | `POST /api/agent/syllabus/:id/analyze`, `/lesson/:id/process-materials`, `/lesson/:id/generate-plan`, `/unit/:id/batch-generate-plans`; `GET /status`, `/result`, `/capabilities`, `/tasks`; task complete/delete | JWT |
| AI chat | `POST /api/chat/query`, `/public-query`, `/upload`; `GET /history`, `/sessions`; session update/delete | mixed |
| Notifications | `GET /api/notifications`, `/unread-count`, `/all`; `PUT /mark-read`; `POST /send`; `DELETE /:id` | JWT + admin |
| Admin | users list/details/update/delete, suspension, password reset, email, cleanup, backup | JWT + admin |
| Subscription | status, payment proof, promo, admin plan management, email queue | JWT + admin |
| Visitors | `POST /track`, `GET /public-stats`, `GET /` (admin), `DELETE /` | mixed |
| Dashboard | `GET /api/dashboard/stats` | JWT |
| Contact | `POST /`, list/read/delete | mixed |

**Observations**

- Route naming is inconsistent (`/lesson-plans` vs `/lessonPlans` not used, but role middleware varies).
- No API version prefix.
- Responses are a mix of `{ success, data }` and bare objects.
- File upload uses `multipart/form-data` with 50 MB JSON limits and Multer.
- The `/api/auth/google` flow redirects through the frontend and stores a JWT.
- Admin "backup" endpoint exists — it must be reviewed before exposure; it may dump sensitive data.

### 1.2 System B — Supabase interface (PostgreSQL)

System B has **no custom application API**. The browser uses the Supabase client and RLS directly.

Key server-side surfaces observed:

| Type | Examples |
|---|---|
| Tables (RLS) | `learners`, `classes`, `subjects`, `assessments`, `marks`, `teacher_assignments`, `notifications`, `documents`, `digital_library_resources`, `examinations`, `exam_attempts` |
| RPC — academic | `rms_register_teacher`, `rms_create_teacher_user_profile`, `rms_delete_teacher`, `rms_account_*` helpers |
| RPC — library | `rms_library_track_event`, `rms_library_ai_match_chunks`, `rms_library_ai_replace_chunks` |
| RPC — exams | `rms_exam_start`, `rms_exam_save_answer`, `rms_exam_save_written_answer`, `rms_exam_submit`, `rms_exam_mark_written_answer`, `rms_exam_review_payload`, `rms_exam_learner_review`, `rms_exam_my_results` |
| RPC — guest exams | `rms_exam_guest_list`, `rms_exam_guest_start`, `rms_exam_guest_save_answer`, `rms_exam_guest_submit` |
| RPC — parent portal | `student_marks_portal_options`, `get_student_marks_portal` |
| RPC — linking | `rms_link_learner_account` |
| Edge Functions | `digital-library-ai`, `digital-library-index`, `rms-create-learner-account`, `welcome-teacher` |
| Serverless | `POST /api/reports/pdf` (Vercel, Puppeteer) |

**Observations**

- Direct-to-database is acceptable for the existing single-school app but is not the model for new
  privileged platform modules.
- Guest and parent RPCs need edge throttling and abuse monitoring.
- PDF generation is a serverless endpoint outside the main app; it must be reachable from 21CTA or
  replaced by a platform PDF service.

---

## 2. Target API contract

### 2.1 Conventions

| Item | Standard |
|---|---|
| Base path | `/api/v1` |
| Auth | `Authorization: Bearer <Supabase access token>` |
| Tenant context | `X-School-Id: <uuid>` (optional if the user has exactly one active school) |
| Request ID | `X-Request-Id` echoed in response |
| Content type | `application/json`; uploads `multipart/form-data` |
| Success envelope | `{ "data": ..., "meta": { ... } }` |
| Error envelope | `{ "error": { "code": "...", "message": "...", "details": [...], "requestId": "..." } }` |
| Pagination | `?page=1&pageSize=25`; response `meta.page`, `meta.pageSize`, `meta.total` |
| Filtering | explicit query params, validated with DTOs |
| Timestamps | ISO 8601 UTC |
| IDs | UUID strings |

### 2.2 Status codes

`200` success, `201` created, `204` no content, `400` validation, `401` unauthenticated, `403`
forbidden, `404` not found, `409` conflict, `422` business rule violation, `429` rate limited,
`500` unexpected, `503` dependency unavailable.

### 2.3 Security requirements on every endpoint

1. Verify the Supabase JWT signature using the project JWKS (`iss`, `aud`, `exp`, `nbf`, algorithm).
2. Resolve the user and active memberships **server-side**.
3. Reject any `X-School-Id` that is not an active membership (unless platform admin).
4. Load roles/permissions from the database; never trust a role in the token or body.
5. Enforce object-level checks (school, class, learner, ownership) in the service layer.
6. Write an audit record for every state-changing privileged action.
7. Validate and normalise all input; reject unknown fields where practical.
8. Apply per-user and per-IP rate limits; stricter limits on AI, uploads and exam submission.
9. Never return another tenant's existence details (use 404 rather than 403 where appropriate).
10. Redact secrets and personal data from logs.

---

## 3. Target endpoint map

### 3.1 Platform core

| Path | Purpose | Backing store |
|---|---|---|
| `POST /api/v1/auth/register` | Self-registration (teacher/parent/student request) | Supabase Auth + platform |
| `POST /api/v1/auth/accept-invite` | Accept school invitation | `school_invitations` |
| `POST /api/v1/auth/forgot-password` | Password reset | Supabase Auth |
| `POST /api/v1/auth/refresh` | Refresh session (if server-managed) | Supabase Auth |
| `POST /api/v1/auth/logout` | Revoke session | Supabase Auth |
| `GET /api/v1/auth/me` | Profile, schools, roles, permissions | platform |
| `GET /api/v1/schools` | Directory (public fields) / admin list | `schools` |
| `POST /api/v1/schools` | Super admin onboarding | `schools` |
| `GET/PATCH /api/v1/schools/:id` | School profile/settings | `schools`, `school_settings` |
| `GET/POST /api/v1/users` | User management | `platform_users`, memberships |
| `PATCH /api/v1/users/:id/status` | Suspend/reactivate | platform + audit |
| `POST /api/v1/users/invite` | Invite to school | `school_invitations` |
| `GET/POST/DELETE /api/v1/users/:id/roles` | Role assignment | memberships |
| `GET /api/v1/admin/health` | System health | checks |
| `GET /api/v1/admin/audit` | Audit search | `audit_logs` |
| `GET/PATCH /api/v1/admin/settings` | Global configuration | settings |

### 3.2 Academic modules

| Path | Purpose | Backing store / adapter |
|---|---|---|
| `GET/POST/PATCH/DELETE /api/v1/lessons/...` | Lesson plans, units, generation, exports metadata | **System A adapter** |
| `POST /api/v1/lessons/generate` | AI generation | System A adapter |
| `GET /api/v1/lessons/:id/export?format=pdf\|docx\|zip` | Export | System A / client-side fallback |
| `GET/POST/PATCH /api/v1/marks/...` | Assessments, marks, submit, approve, lock | PostgreSQL (existing logic) |
| `GET/POST/PATCH /api/v1/students/...` | Learners, promotion, transfer | PostgreSQL |
| `GET/POST/PATCH /api/v1/teachers/...` | Teachers, assignments | PostgreSQL |
| `GET/POST/DELETE /api/v1/library/...` | Resources, search, upload, download URL, approval | PostgreSQL + Storage |
| `GET/POST/PATCH /api/v1/assessment/...` | Exams, questions, attempts, marking | PostgreSQL |
| `GET/POST/PATCH /api/v1/class-diary/...` | Diary entries, review, corrections, coverage | PostgreSQL (new) |
| `GET/POST/PATCH /api/v1/attendance/...` | Registers, records, summaries | PostgreSQL (new) |
| `GET/POST/PATCH /api/v1/timetable/...` | Slots, conflicts, publication | PostgreSQL (new) |
| `GET/POST /api/v1/cpd/...` | Activities, records, certificates, observations | PostgreSQL (new) |
| `GET/POST /api/v1/portfolio/...` | Teacher portfolio | PostgreSQL (new) |
| `POST /api/v1/ai/...` | Teaching assistant, generation, quotas | provider service |
| `GET /api/v1/analytics/...` | School/national aggregates | reporting tables |
| `GET /api/v1/notifications` | Inbox, preferences, read state | PostgreSQL |
| `GET /api/v1/parents/...` | Linked learners, reports, attendance | PostgreSQL + verified links |
| `GET /api/v1/students/me/...` | Self-service results, timetable, resources | PostgreSQL |

Names are indicative; the OpenAPI document is the source of truth once implementation begins.

---

## 4. System A adapter (anti-corruption layer)

### 4.1 Why an adapter

System A's API is stable but not designed for multi-tenant or platform identity. Rewriting it now would
violate the preservation rule. The adapter isolates the differences.

### 4.2 Flow

```
Browser
  │  Authorization: Bearer <Supabase JWT>
  ▼
21CTA API (NestJS)
  │  verify JWT → resolve user, school, role, permissions
  │  map platform user → legacy user (identity_links)
  │  mint short-lived internal token (aud=lesson-api, 5–15 min, single school)
  ▼
System A Express API
  │  verify internal token (JWKS or shared public key)
  │  enforce legacy user + school filter
  ▼
MySQL
```

### 4.3 Adapter responsibilities

- Translate platform UUIDs to legacy integer IDs where required.
- Add `X-School-Id` and `X-Actor-Id` headers; System A must enforce them, not trust body fields.
- Map legacy responses into the platform envelope.
- Map legacy errors into platform error codes.
- Enforce timeouts, retries with idempotency keys, and circuit breaking.
- Never proxy arbitrary paths; expose only an allow-list of operations.
- Log request IDs across both systems.
- Reject any attempt by the browser to set legacy identity fields directly.

### 4.4 Changes required in System A (minimal, additive)

1. Replace the destructive auto-migration with versioned migrations.
2. Require `JWT_SECRET` (no fallback) and set issuer/audience.
3. Accept platform-issued tokens: validate `iss`, `aud`, `exp`, and a `school_id` claim mapped to an
   allowed school.
4. Add `central_user_id` and `school_id` to `users`; filter queries by them.
5. Remove or gate the admin database-backup endpoint.
6. Add `/api/health` dependency details (DB, Redis) without leaking secrets.
7. Ensure CORS only allows the 21CTA domains.

### 4.5 Compatibility

- Keep existing A endpoints working for the legacy frontend during the transition.
- Add new adapter-only endpoints under `/internal/v1/...` if needed; do not break public routes.
- Feature-flag the adapter per school.

---

## 5. System B integration

### 5.1 Phase 7a — preserve the existing client

- Keep the current RMS-MIS SPA mounted at `/marks` for the pilot school.
- Do not rewrite the marks engine, RLS policies or report renderer.
- Add the 21CTA shell around it and reuse the existing Supabase session.
- Ensure the same Supabase project and `auth.users` are used, so there is one login.

### 5.2 Phase 7b — server-side service layer

For new flows (analytics, parent portal, cross-module actions), add platform endpoints that:

- Verify the platform token.
- Enforce school/role checks in the service layer.
- Use a **server-side** Supabase client with the anon key + user context where possible; use a
  service-role client only in trusted background jobs, never in the browser.
- Call narrowly scoped RPCs rather than issuing broad table queries.

### 5.3 Marks write path

- Teacher entry → platform endpoint → validation → scoped write → audit.
- DOS approval/lock → platform endpoint → existing status transition → audit.
- Never allow approved/locked marks to be edited through a generic update endpoint.
- Preserve the exact calculation logic in `frontend/js/utils.js` / `grading-engine.js`; port it to a
  shared TypeScript module with golden tests, not a new formula.

### 5.4 Exam path

- Server validates the attempt window, remaining time, attempt ownership and question set.
- Autosave is idempotent and keyed by `(attempt_id, question_id)`.
- Submission is a single transactional operation with a server timestamp.
- Client-side restrictions are advisory only; document that they are not a security boundary.
- Rate-limit start/save/submit and monitor anomalous patterns.

---

## 6. Rate limiting and quotas

| Surface | Suggested limit | Notes |
|---|---|---|
| Auth login/reset | 5–10 per 15 min per IP + per account | exponential backoff |
| General API | 120 req/min per user | burst allowance |
| AI generation | 10–20 req/hour per teacher; daily plan quota | per school plan |
| File upload | 10 req/min per user; size caps | virus scan, MIME allow-list |
| Exam start | 5 per 10 min per learner | prevent restart abuse |
| Exam save | 60 per min per attempt | autosave tolerant |
| Exam submit | 3 per attempt | idempotency key required |
| Public parent lookup | 5 per 10 min per IP + learner code | add OTP for confidential data |
| Guest exam | 3 starts per 30 min per IP | monitor abuse |

Implement at the reverse proxy and in the API. Return `429` with `Retry-After`.

---

## 7. OpenAPI and documentation

- Generate OpenAPI 3.1 from NestJS decorators.
- Publish `/api/v1/openapi.json` and a docs page restricted to authenticated staff.
- Every endpoint documents: auth requirements, required role/permission, school scope, request/response
  schema, error codes, rate limit and audit behaviour.
- CI fails if the spec is invalid or if a route lacks an auth guard annotation.
- Keep `API_DOCUMENTATION.md` as a human summary; the spec is authoritative.

---

## 8. Versioning and deprecation

- `/api/v1` is the only public version for the new platform.
- Breaking changes require `/api/v2` or a negotiated header; never silently change response shapes.
- Deprecations are announced in `CHANGELOG.md`, logged with a `Deprecation` header, and supported for
  at least one academic term.
- System A's legacy routes remain available internally until the adapter no longer needs them.

---

## 9. Error handling and observability

- Central exception filter maps domain errors to stable `error.code` values.
- Log: request ID, user ID (not email), school ID, route, status, latency, dependency timings.
- Never log tokens, passwords, full marks payloads or learner personal data.
- Emit metrics: request rate, error rate, p95 latency, DB pool saturation, queue depth, AI usage.
- Health endpoints:
  - `/api/v1/health/live` — process alive.
  - `/api/v1/health/ready` — PostgreSQL, Redis, MySQL adapter, Supabase reachable.
  - `/api/v1/health/version` — build SHA and migration version.

---

## 10. Integration test matrix

| Test | Expectation |
|---|---|
| Valid token, correct school | 200 |
| Valid token, other school header | 403/404, audit entry |
| Expired token | 401 |
| Token with tampered role claim | role ignored; DB role used |
| Teacher accessing another teacher's class | 403 |
| Parent accessing unlinked learner | 403 |
| Student accessing another student's marks | 403 |
| System A adapter with unknown legacy user | 409/422, no orphan write |
| MySQL unavailable | 503 from adapter, no partial write |
| PostgreSQL RLS bypass attempt | denied |
| AI quota exceeded | 429 |
| Duplicate exam submit | idempotent, single record |
| Cross-tenant analytics query | filtered |
| Audit log written for approve/lock/role change | present |

Automated tests must run in CI against ephemeral databases with synthetic schools.
