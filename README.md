# 21CTA — 21st Century Teacher Assistant

**Empowering Teachers Through Technology and Innovation.**

21CTA is a multi-school education platform for Rwandan schools. It combines a public
website, a shared login, role-based workspaces, and integrated teaching and
school-administration modules on top of a single MySQL database (`21cta`).

The implemented application is an **Express 4 API + React 18/Vite 5 frontend** in
`apps/lesson-planner/`, built from two original systems:

| Original system | Role in 21CTA |
|---|---|
| 21st Century Lesson Plan Generator | Lesson planning, curriculum, materials, AI assistance |
| RMS-MIS Marks Management | Marks entry, approval, locking, and reporting |

> **Status:** local development platform. It is **not deployed to production**, and the
> exposed provider secrets still require owner rotation. See the master documentation for
> the verified state of every module. Vercel deployment configuration for the frontends is
> included — see [docs/deployment/VERCEL.md](docs/deployment/VERCEL.md).

---

## Documentation

The single authoritative reference is:

### 📘 [21CTA_MASTER_DOCUMENTATION.md](21CTA_MASTER_DOCUMENTATION.md)

It contains 35 sections plus appendices covering project overview, vision, target users,
features, architecture, technology stack, repository structure, all 18 modules, public
site and school portals, database design, full API reference, security, business rules,
installation, environment variables, deployment and backup, testing, status, roadmap,
and support.

Older reports and planning documents are preserved under [docs/archive/](docs/archive/README.md)
for historical reference only. Where they disagree with the code, the master document and
the current code are authoritative.

### Retained specialist documents

| Document | Why it is kept |
|---|---|
| [docs/security/KEY_ROTATION_RUNBOOK.md](docs/security/KEY_ROTATION_RUNBOOK.md) | Sensitive, actionable credential-rotation procedure. |
| [infrastructure/backup/README.md](infrastructure/backup/README.md) | Backup/restore procedure and policy reference (not yet executed). |
| [apps/lesson-planner/README.md](apps/lesson-planner/README.md) | Original Lesson Planner README / source lineage. |
| [apps/marks/README.md](apps/marks/README.md) | Original RMS-MIS README / source lineage. |
| [RMS-MMS-main/README.md](RMS-MMS-main/README.md) | Original RMS-MIS snapshot README. |
| [digital_lesson_plan-main/README.md](digital_lesson_plan-main/README.md) | Original Lesson Planner snapshot README. |

---

## What is in the repository

```text
21CTA/
├── apps/
│   ├── lesson-planner/
│   │   ├── frontend/   React + Vite application (public site and /app workspace)
│   │   └── backend/    Express API, database access, AI and email services
│   └── marks/          Legacy RMS-MIS source and tests
├── database/
│   ├── schema/         Original Lesson Planner schema
│   ├── migrations/     Lesson Planner and platform migrations
│   ├── seeders/        Platform seed and demo data
│   └── reference/      MySQL and historical PostgreSQL reference SQL
├── docs/
│   ├── archive/        Archived, superseded documentation
│   ├── deployment/     Vercel and hosting guides
│   └── security/       Key rotation runbook
├── infrastructure/
│   └── backup/         Backup/restore scripts and policy
├── digital_lesson_plan-main/  Original Lesson Planner snapshot
├── RMS-MMS-main/              Original RMS-MIS snapshot
├── 21cta-platform/            Phase 2 backups and infrastructure notes
└── 21CTA_MASTER_DOCUMENTATION.md
```

There is **no root `package.json`**, no root test command, and no CI configuration.
Source code lives under `apps/`; documentation lives at the root, in `docs/`, and in
`infrastructure/`.

---

## Quick start (local)

Companion detail, including every environment variable, is in
[§32 Installation](21CTA_MASTER_DOCUMENTATION.md#32-installation-and-local-setup) and
[§33 Environment Configuration](21CTA_MASTER_DOCUMENTATION.md#33-environment-configuration)
of the master document.

**Prerequisites:** Node.js + npm, MySQL/MariaDB (XAMPP MariaDB 10.11.16 is the reference),
and optionally Gemini/Groq/SMTP credentials.

```powershell
# 1. Create and load the database
& C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS 21cta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content -Raw database\schema\001_lesson_planner.sql | & C:\xampp\mysql\bin\mysql.exe -u root 21cta
Get-Content -Raw database\migrations\lesson-planner\add_scheduling_tables.sql | & C:\xampp\mysql\bin\mysql.exe -u root 21cta
Get-Content -Raw database\migrations\platform\002_platform_core.sql | & C:\xampp\mysql\bin\mysql.exe -u root 21cta
Get-Content -Raw database\migrations\platform\003_school_public_portal.sql | & C:\xampp\mysql\bin\mysql.exe -u root 21cta
Get-Content -Raw database\seeders\003_platform_seed.sql | & C:\xampp\mysql\bin\mysql.exe -u root 21cta

# 2. Backend
cd apps\lesson-planner\backend
Copy-Item .env.example .env    # then set DB_*, JWT_SECRET, CORS_ORIGIN
npm install
npm start                      # or: npm run dev

# 3. Frontend (new terminal)
cd apps\lesson-planner\frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and log in with a demo account. All demo accounts use the
password `Demo@21cta`; the full list is in
[§32 of the master document](21CTA_MASTER_DOCUMENTATION.md#32-installation-and-local-setup).

> **Port note:** the backend listens on `PORT` (`.env.example` says 5000) and falls back to
> **5001** if that port is occupied, while the frontend defaults to `http://localhost:5000/api`.
> Set `PORT=5000` or `VITE_API_URL` so the two match.

---

## Deploying on Vercel

The frontends are Vercel-ready. The main Express backend is **not** serverless-safe (persistent
MySQL pool, Redis, Socket.IO, uploads, background jobs) and must run on a long-running host
such as Render, Railway, Fly.io, or a VPS; Vercel hosts the frontend and calls it through
`VITE_API_URL`.

| Vercel project | Root Directory | Build / Output |
|---|---|---|
| Main platform | `apps/lesson-planner/frontend` | `npm run build` → `dist` |
| Original lesson planner | `digital_lesson_plan-main/frontend` | `npm run build` → `dist` |
| RMS-MIS | `RMS-MMS-main` | static + `/api/reports/pdf.js` |
| Legacy marks | `apps/marks` | static + `/api/reports/pdf.js` |

Set `VITE_API_URL=https://<backend-host>/api` in Vercel's environment variables, then redeploy.
Each frontend already includes a `vercel.json` with SPA routing and cache headers.

Full instructions, required backend variables, and troubleshooting:
**[docs/deployment/VERCEL.md](docs/deployment/VERCEL.md)**.

---

## Key facts at a glance

| Item | Value |
|---|---|
| Backend | Express 4, mounted at `/api` (`apps/lesson-planner/backend`) |
| Frontend | React 18 + Vite 5 (`apps/lesson-planner/frontend`) |
| Database | MySQL/MariaDB, database `21cta`, InnoDB, `utf8mb4` |
| Login | `POST /api/auth/login` |
| Platform context | `GET /api/platform/me` |
| Workspace | `/app/*` (role-aware sidebar, module guards) |
| Public API | `/api/platform/public/*` |
| Roles | 15 role codes, 17 demo accounts |
| Module records | 22 (mapping to 18 documented modules) |
| Languages | English, French, Kinyarwanda, Kiswahili |
| Production | Frontends are Vercel-ready; backend needs a persistent host ([guide](docs/deployment/VERCEL.md)) |
| Tests | Only RMS tests under `apps/marks/tests/` (17 tests: 7 pass, 10 fail); backend test script is a placeholder |

---

## Security

- Provider secrets (Aiven, Gemini, Groq, JWT) are exposed and **must be rotated** — follow
  [docs/security/KEY_ROTATION_RUNBOOK.md](docs/security/KEY_ROTATION_RUNBOOK.md).
- Do not commit `.env` or real credentials.
- Report security issues privately to the platform owner; do not open public issues
  containing secrets.
- The full security model and known gaps are in
  [§30 of the master document](21CTA_MASTER_DOCUMENTATION.md#30-authentication-authorization-and-security).

---

## License and ownership

The repository does **not** currently contain a `LICENSE` file. Ownership and licensing
terms must be confirmed with the platform owner before redistribution. Original Lesson
Planner and RMS-MIS source lineage is retained in `digital_lesson_plan-main/`,
`RMS-MMS-main/`, and `apps/marks/`.
