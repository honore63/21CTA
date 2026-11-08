# 21CTA — API Documentation

Full endpoint inventory of both existing systems and the `/api/v1` mapping: [audit/API_INTEGRATION_MAP.md](audit/API_INTEGRATION_MAP.md).

## Conventions for `/api/v1`
* Auth: `Authorization: Bearer <Supabase access token>`. School context: `X-21CTA-School: <school uuid>` (validated against memberships).
* Responses: `{ "success": true, "data": … }` or `{ "success": false, "error": { "code": "…", "message": "…" } }` (LPG already uses `success`/`message`).
* Errors: 400 validation, 401 unauthenticated, 403 forbidden/other school, 404, 409 conflict, 429 rate limited, 500 (logged with request id, no stack in production).
* Pagination: `?page=&limit=` (max 100). Filtering by query params. Dates in ISO 8601.
* Versioning: breaking changes go in `/api/v2`. Legacy `/api/*` (LPG) stays during the transition.

## Namespaces and status
| Namespace | Backed by | Status |
|---|---|---|
| `/api/v1/auth` | Supabase Auth + gateway (`me`, `link-legacy-account`) | Planned (Phase 3) |
| `/api/v1/schools`, `/users`, `/admin` | Gateway → Postgres | Planned (Phase 4) |
| `/api/v1/lessons` | Gateway → LPG Express `/api/*` | Planned (Phase 6). Today: `/api/*` on the LPG backend |
| `/api/v1/marks`, `/students`, `/teachers` | Supabase PostgREST/RPC under RLS. Gateway aggregates only | Planned (Phase 7). Today: browser → Supabase |
| `/api/v1/library`, `/assessment` | RMS tables, edge functions, RPCs | Planned (Phase 8) |
| `/api/v1/class-diary`, `/attendance`, `/timetable`, `/cpd`, `/portfolio`, `/analytics`, `/notifications` | New services on Postgres | Planned (Phase 8–9) |
| `/api/v1/ai` | Gateway → Gemini / Groq / library RAG | Planned (Phase 9) |
| `/api/v1/reports/pdf` | PDF renderer (from RMS `api/reports/pdf.js`) | Planned. Auth added in the next PR |

An OpenAPI file (`docs/openapi.yaml`) will be generated with each `/api/v1` endpoint as it is built.
