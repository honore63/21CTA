# Deploying 21CTA on Vercel

This guide explains exactly which parts of the repository can run on Vercel and how to
configure them. Vercel is an excellent host for the **frontends**; the main Express backend
is designed as a long-running server and needs a different host.

## What can run on Vercel

| Part of the repo | Vercel? | How |
|---|---|---|
| `apps/lesson-planner/frontend` | **Yes** | Vite static build, `vercel.json` included |
| `digital_lesson_plan-main/frontend` | **Yes** | Vite static build, `vercel.json` included |
| `RMS-MMS-main` | **Yes** | Static site + `api/reports/pdf.js` serverless function |
| `apps/marks` | **Yes** | Static site + `api/reports/pdf.js` serverless function |
| `apps/lesson-planner/backend` | **No (not as-is)** | Long-running Express server — use Render/Railway/Fly/VPS |
| `digital_lesson_plan-main/backend` | **No (not as-is)** | Same reason |

### Why the backend is not deployed to Vercel

The backend is a stateful Express 4 server. It relies on:

- a persistent MySQL connection pool (`mysql2`);
- Redis (`redis`) for queue work;
- Socket.IO (`socket.io`) for real-time updates;
- local disk uploads (`multer` + `uploads/`);
- a background email queue processor and scheduled jobs;
- long-running AI requests (Gemini/Groq) beyond typical serverless limits.

Serverless functions are short-lived and have no persistent disk or websocket server, so the
backend must run on a platform that supports a long-running Node process. The frontend talks
to it over HTTPS using `VITE_API_URL`.

> The backend CORS configuration (`apps/lesson-planner/backend/src/config/cors.js`) already
> allows `*.vercel.app` origins, so a Vercel frontend can call it without CORS changes. For a
> custom domain, add it to `CORS_ORIGIN` or `ALLOWED_ORIGINS`.

---

## 1. Deploy a frontend (recommended path)

There are two Vite frontends. Create **one Vercel project per frontend** and set the project's
**Root Directory** to the frontend folder. Do not deploy the repository root.

### Option A — Vercel dashboard (no CLI)

1. Push the repository to GitHub (already done).
2. In Vercel, choose **Add New → Project** and import `honore63/21CTA`.
3. Set **Root Directory** to:
   - `apps/lesson-planner/frontend` (main platform), or
   - `digital_lesson_plan-main/frontend` (original lesson planner).
4. Vercel auto-detects **Vite**. Confirm:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci` (uses the committed `package-lock.json`)
5. Add an environment variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://<your-backend-host>/api` (must include `/api`, must be HTTPS)
   - Apply to **Production** and **Preview**.
6. Click **Deploy**.
7. After the backend is reachable, open the deployment URL and verify login, the public pages,
   and `/api/health` from the backend host.

`vercel.json` already handles:

- SPA routing (deep links such as `/app/dashboard` return `index.html`);
- immutable caching for hashed files in `/assets`;
- `no-store` for `index.html` so new deploys are picked up immediately.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login

cd apps/lesson-planner/frontend
vercel                     # create/link a preview project
vercel env add VITE_API_URL production
vercel env add VITE_API_URL preview
vercel --prod
```

Repeat from `digital_lesson_plan-main/frontend` for the second frontend.

### Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `VITE_API_URL` | Yes | `https://21cta-api.onrender.com/api` | Baked into the build; redeploy after changing it |

Never place backend secrets (DB password, `JWT_SECRET`, Gemini/Groq keys) in a `VITE_*`
variable. Vite inlines every `VITE_*` value into the browser bundle.

The local development fallback is `http://localhost:5000/api`; the production fallback in
`src/services/api.js` is a legacy Render URL. Always set `VITE_API_URL` for a real deployment.

---

## 2. Deploy the RMS-MIS site (static + PDF function)

`RMS-MMS-main` and `apps/marks` are static sites that talk to Supabase and expose a
serverless PDF endpoint at `api/reports/pdf.js`.

1. Create a Vercel project with **Root Directory** = `RMS-MMS-main` (or `apps/marks`).
2. Framework preset: **Other** (no build step).
3. Keep the existing `vercel.json` — it rewrites `/` to `frontend/`, serves assets and the
   service worker with the correct headers, and routes `/api/*` to the function.
4. Supabase keys live in `frontend/js/config.js`. The **anon** key is public by design.
   Never add the Supabase **service-role** key to the frontend.
5. `api/reports/pdf.js` uses Puppeteer. Vercel functions have a size limit; if the deployment
   fails, switch to `puppeteer-core` + `@sparticuz/chromium` and set the function memory in
   `vercel.json`.

These projects already have deployment documentation in `RMS-MMS-main/README.md` and
`apps/marks/README.md`.

---

## 3. Deploy the backend (not Vercel)

Use any host that runs a persistent Node process. Render is the simplest option because the
frontend already expects a Render-style URL.

### Required settings

| Setting | Value |
|---|---|
| Root Directory | `apps/lesson-planner/backend` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Runtime | Node 20 or 22 |
| Health check | `/api/health` |

### Required environment variables

Copy `apps/lesson-planner/backend/.env.example` and set at minimum:

```dotenv
NODE_ENV=production
PORT=5000

# Use a hosted MySQL instance; localhost will not work in the cloud.
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=21cta

# Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=...

# The exact Vercel production origin (comma-separate multiple origins).
CORS_ORIGIN=https://your-project.vercel.app
FRONTEND_URL=https://your-project.vercel.app
ALLOWED_ORIGINS=https://your-project.vercel.app

GEMINI_API_KEY=...
GROQ_API_KEY=...
EMAIL_USER=...
EMAIL_PASS=...
```

Notes:

- `localhost` MySQL will not resolve from a cloud backend. Provision a managed MySQL
  database (Railway, Aiven, PlanetScale-compatible MySQL, etc.) and apply the schema:
  `database/schema/001_lesson_planner.sql` plus the migrations in the order documented in
  `README.md` / the master document.
- Startup still runs legacy `CREATE`/`ALTER` statements and a conditional data migration.
  Review them before pointing the backend at a database that must remain unchanged.
- Do not commit `.env`. Set values in the hosting provider's secret store.
- Rotate the previously exposed Aiven, Gemini, Groq, and JWT credentials first — see
  `docs/security/KEY_ROTATION_RUNBOOK.md`.

---

## 4. Post-deployment checklist

- [ ] `VITE_API_URL` points at the deployed backend and ends in `/api`.
- [ ] Backend `CORS_ORIGIN` / `ALLOWED_ORIGINS` contains the exact Vercel URL.
- [ ] `GET https://<backend>/api/health` returns `{ "success": true }`.
- [ ] Login works and the browser console has no CORS errors.
- [ ] Deep links (for example `/login`, `/app/dashboard`) load after a hard refresh.
- [ ] Google OAuth callback URL uses the production backend domain.
- [ ] `HELMET_HSTS_ENABLED=true` and HTTPS only in production.
- [ ] Secrets exist only in provider dashboards, never in Git.
- [ ] Database backups are configured and a restore has been tested.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 404 on refresh of a deep link | SPA rewrite missing | Keep the project's `vercel.json` and Root Directory |
| Blank page / failed API calls | `VITE_API_URL` missing or wrong | Set it in Vercel, then redeploy |
| CORS error in console | Vercel origin not allowed | Add it to `CORS_ORIGIN`/`ALLOWED_ORIGINS` on the backend |
| Build fails: `vite: not found` | Dependencies not installed | Use `npm ci` and keep `package-lock.json` committed |
| `database connection refused` | Backend using `localhost` MySQL | Use a hosted MySQL host and credentials |
| PDF function fails on Vercel | Puppeteer/Chromium too large | Use `puppeteer-core` + `@sparticuz/chromium` |
| Socket features fail | Backend on Vercel/serverless | Run the backend on a persistent host |

## 6. Security reminders

- `.env`, `.env.*` (except `.env.example`), `node_modules/`, `dist/`, and `.vercel/` are
  ignored by Git. Never force-add them.
- The Supabase **anon** key in `RMS-MMS-main/frontend/js/config.js` is public by design; the
  **service-role** key must never appear in frontend code or Git.
- Vite exposes all `VITE_*` variables to the browser. Treat them as public.
