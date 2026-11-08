# 21CTA — Development Roadmap

Phases follow the master prompt §13. Each phase ends with tests, a report and an update to [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md). Detailed sequencing and risks: [audit/MIGRATION_PLAN.md](audit/MIGRATION_PLAN.md).

## Priority 0 — Safety (now, small PRs)
1. ✅ Disable the destructive startup migration (PR #1).
2. LPG: Socket.IO handshake auth, `JWT_SECRET` fail-fast, exact-origin CORS.
3. RMS: auth + origin + network restrictions on the PDF endpoint.
4. RMS: bring the test suite back to green.
5. CI: build, syntax check, tests, secret scan on every PR.
6. ⚠️ Owner: rotate the Aiven password and the Gemini/Groq keys.

## Phases
| Phase | Scope | Exit criteria |
|---|---|---|
| 1 | Inspection and audit | ✅ docs merged |
| 2 | Architecture: `apps/portal`, `apps/gateway` skeletons, Docker compose + Nginx, per-environment config, staging environment | Both apps run unchanged under `/lesson-planner` and `/marks` behind the proxy locally and on staging |
| 3 | Central auth: Supabase identity provider, LPG dual-token middleware, `identity_links`, account-link dry run | One login reaches both apps. Legacy LPG tokens still accepted |
| 4 | Multi-school + permissions: `schools`, memberships, `role_permissions`, `school_id` rollout, restrictive RLS | Isolation test suite passes |
| 5 | Unified frontend: homepage, dashboard (real data only), navigation, themes, school switcher | Responsive and accessibility checks. No dead buttons |
| 6 | Lesson Planner integration via `/api/v1/lessons` | Existing LPG features pass regression tests |
| 7 | Marks integration: per-school settings and reports, PDF behind auth | RMS tests + E2E mark entry → approval → report |
| 8 | New modules: Library, Assessment portal, Class Diary, Attendance, Timetable, CPD, Portfolio, Student/Parent portals, Notifications | Each module: CRUD + permission + isolation tests |
| 9 | AI gateway and analytics | Provider config, quotas, teacher review flow |
| 10 | Testing, security review, optimisation, production deployment | Load test, security checklist, backup restore drill |

## Open owner decisions
1. Upstream Lesson Planner repo and hosting-account access (Render, Aiven, Vercel).
2. Fix the originals too, or only 21CTA?
3. Hosting: single Docker host vs Vercel + Render. Is `21cta.com` confirmed?
4. Subscriptions per teacher or per school?
5. RMS browser → Supabase access: keep under RLS (recommended) or route through the gateway (SECURITY_AUDIT).
