# 21CTA — Deployment Plan

## 1. Current deployments
| Component | Host | Notes |
|---|---|---|
| LPG backend (Express + Socket.IO) | Render (`digital-lesson-plan.onrender.com`) | Long-running Node process. Local `uploads/` disk is ephemeral on Render |
| LPG frontend | Vercel and/or Netlify (`vercel.json`, `_redirects`) or served by Express | `VITE_API_URL` |
| LPG DB | Aiven MySQL (SSL) | Credentials leaked in the repo; rotate |
| RMS-MIS frontend + PDF function | Vercel (`vercel.json` rewrites to `/frontend`) | Puppeteer in a serverless function |
| RMS DB/Auth/Storage/Functions | Supabase project `ztlfidglxfwjpxkqfviy` | Manual SQL migrations |

## 2. Target topology (one domain: `21cta.com`, placeholder until ownership is confirmed)
```
                 ┌──────────────────── 21cta.com (Vercel project "21cta") ────────────────────┐
 Browser ──────► │ /                → apps/portal (static)                                   │
                 │ /lesson-planner/* → apps/lesson-planner (static, base=/lesson-planner/)    │
                 │ /marks/*          → apps/marks (static RMS frontend)                       │
                 │ /api/v1/reports/pdf → Vercel function (from RMS, with auth added)          │
                 │ /api/v1/*, /api/* → rewrite → gateway + LPG backend (Render/VM)           │
                 └────────────────────────────────────────────────────────────────────────────┘
                              │                                   │
                       Supabase (Postgres, Auth,           Render service: gateway + LPG Express
                       Storage, Realtime, Functions)        └── Aiven MySQL, Redis (optional), Cloudinary
```
* **WebSockets:** Vercel rewrites do not proxy WebSocket upgrades. Socket.IO either (a) falls back to HTTP long-polling through the rewrite (works, but adds latency), or (b) uses `rt.21cta.com` pointed straight at Render. That is a sub-domain of the same registered domain, so it is still "one domain" for users. **Recommendation: (b)** for production, (a) for staging.
* **Alternative (single host):** one VPS / Render web service running Nginx that serves the three static builds and proxies `/api` to Node. Simpler WebSockets and one bill, but no edge CDN and more ops work. Recommended only if the Vercel limits on function size or duration become a problem (the Puppeteer PDF function is the main risk).

## 3. Environments and branches
| Branch | Environment | Databases |
|---|---|---|
| `main` | production `21cta.com` | Production Supabase + production Aiven MySQL |
| `staging` | `staging.21cta.com` | **Separate** Supabase project + separate MySQL database (restored from an anonymised backup) |
| `development` / `feature/*` | Vercel preview URLs | Staging DBs or local (Supabase CLI + MySQL in Docker) |

Pre-condition for staging: **LPG's destructive auto-migration must be disabled first.** A fresh staging MySQL would otherwise trigger DROP+reimport, and a misconfigured `DB_HOST` could point it at production.

## 4. Configuration
* One root `.env.example` documenting every variable per app (names in SYSTEM_AUDIT §4, plus new ones: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` / JWKS URL, `SUPABASE_SERVICE_ROLE_KEY` (server only), `GATEWAY_HMAC_SECRET`, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`).
* Secrets live in the Vercel, Render and Supabase dashboards only. The RMS Supabase URL and anon key move from `config.js` to a build-time or runtime config file per environment.
* CORS: exact origins only (`https://21cta.com`, `https://staging.21cta.com`). Remove the wildcard `*.vercel.app` / `*.onrender.com` patterns.

## 5. CI/CD
* GitHub Actions on every PR: install, lint, `vite build` (portal + LPG), `node --check` backend, RMS `node --test` (after the 10 failing tests are triaged), and SQL migrations applied to an ephemeral Postgres and MySQL (Docker) to prove they apply cleanly and are idempotent.
* Deploy: Vercel Git integration (portal / static apps), Render auto-deploy for gateway and LPG. Supabase migrations go through `supabase db push` from CI, gated by manual approval for production. MySQL migrations go through a versioned runner with a ledger table (replacing boot-time DDL).
* Rollback: Vercel instant rollback, Render previous deploy, and DB migrations written as additive / expand-contract, so rollback rarely needs DDL.

## 6. Domain cut-over
1. Confirm domain ownership. Configure DNS (Vercel apex + `www`, `rt.` CNAME to Render).
2. Deploy staging and run the smoke and E2E suite.
3. Production deploy with the old URLs still live. Add 301 redirects from `digital-lesson-plan.onrender.com` and the RMS Vercel URL to the matching 21CTA paths once auth linking is live.
4. Update the Google OAuth callback URLs, Supabase Site URL / redirect allow-list, and email templates.

## 7. Operations
Health checks (`/api/health`, Supabase status). Uptime monitoring. Error tracking (e.g. Sentry; to be approved). Daily backups: Supabase PITR or daily backups, Aiven automated backups, with restore drills each quarter. Remove the in-app "download full DB backup" endpoint once managed backups are verified.
