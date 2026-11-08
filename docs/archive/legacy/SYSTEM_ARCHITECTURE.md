# 21CTA — System Architecture

Detail: [audit/API_INTEGRATION_MAP.md](audit/API_INTEGRATION_MAP.md), [audit/DEPLOYMENT_PLAN.md](audit/DEPLOYMENT_PLAN.md), [audit/AUTHENTICATION_PLAN.md](audit/AUTHENTICATION_PLAN.md).

## 1. Target layout
```
21cta.com
└── Reverse proxy (Nginx in Docker, or Vercel edge rewrites), HTTPS
    ├── /                     apps/portal          (new: React + Vite; public site, login, dashboard, school admin, new modules)
    ├── /lesson-planner/*     apps/lesson-planner  (existing React SPA, base path /lesson-planner/)
    ├── /marks/*              apps/marks           (existing RMS SPA, served from /marks/)
    ├── /api/v1/*             apps/gateway         (new: Express; auth, school context, routing, AI gateway)
    │     ├── /api/v1/lessons/*  → lesson-planner backend (Express, MySQL)
    │     ├── /api/v1/reports/pdf → PDF renderer (from RMS, with auth)
    │     └── new module services → Supabase Postgres (service role, server-side only)
    └── /socket.io/*          lesson-planner backend (WebSocket)

Data: MySQL lessonplan_db (lesson planning) · Supabase Postgres (identity, schools, marks, all new modules)
```

## 2. Components
| Component | Responsibility | Tech (no new frameworks) |
|---|---|---|
| `apps/portal` | Public homepage, `/login`, `/register`, dashboard, school/user admin, new modules UI, light/dark theme | React 18 + Vite (same as LPG) |
| `apps/gateway` | Verifies Supabase JWT, resolves `school_id` + permissions, enforces rate limits, `/api/v1` versioning, central error handling, audit logging, AI provider config | Express 4 (same as LPG) |
| `apps/lesson-planner` | Lesson planning domain, unchanged apart from accepting gateway auth | Express + MySQL |
| `apps/marks` | Marks domain, unchanged apart from per-environment config and the school model | Supabase + vanilla JS |
| Supabase | Identity provider, Postgres, Storage, Realtime, Edge Functions | existing project |

## 3. Identity, roles and permissions
* **Single identity provider:** Supabase Auth. LPG users are linked through `identity_links` (MySQL). See AUTHENTICATION_PLAN.
* **Roles** (per school membership): `super_admin` (platform), `school_admin`, `headteacher`, `dos`, `teacher`, `librarian`, `staff`, `student`, `parent`.
* **Permissions:** `permissions(key)` such as `marks.enter`, `marks.approve`, `library.manage`, `lessons.generate`. `role_permissions(school_id NULL|uuid, role, permission_key)` holds platform defaults (school_id NULL) plus per-school overrides managed by school admins. The gateway checks permissions. RLS checks school membership and, for the RMS tables, the existing role logic.
* Mapping to legacy roles: `dos`→RMS `dos`, `headteacher`/`school_admin`→RMS `principal`/`headteacher`, `student`→RMS `learner`, `librarian`→library permissions only. LPG `admin` = `super_admin`.

## 4. Multi-school isolation
Every school-owned row carries `school_id`. Isolation is enforced at three layers: the gateway (membership check on `X-21CTA-School`), Postgres RLS (restrictive `school_id` policy on every table), and LPG query scoping through `users.school_id`. Phase 4 adds an isolation test suite that must pass in CI.

## 5. Deployment (Docker + reverse proxy)
* `docker-compose.yml` (Phase 2) with services `proxy` (Nginx), `portal` (static), `lesson-planner-frontend` (static), `marks` (static), `gateway`, `lesson-planner-api`, `pdf-renderer` (Puppeteer). The databases stay managed (Aiven, Supabase) and are not containerised in production. Local dev adds `mysql` + Supabase CLI.
* Environments: development (local compose), staging (separate Supabase project + MySQL DB), production. Health checks `/api/health` per service, JSON logs, automated managed backups.
* Hosting target to confirm: one Docker host (VPS/Render/Railway) behind Nginx, **or** Vercel (static) + Render (containers).

## 6. AI service
The gateway exposes `/api/v1/ai/*` with configurable providers (Gemini, Groq) and per-school quotas. Every AI output carries `generated_by_ai` and requires teacher review before it is published. No AI output makes final decisions about students.
