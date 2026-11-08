# 21ST CENTURY TEACHER ASSISTANT (21CTA)

**Empowering Teachers Through Technology and Innovation.**

Integration repository for the 21CTA multi-school education platform for Rwanda. It brings the
Lesson Plan Generator and RMS-MIS together under one domain, one login and one school model,
while keeping their existing databases (MySQL and Supabase PostgreSQL).

## Status

Phase 1 (audit) is complete. Integration work has not started. Both apps are included as snapshots,
and each one still runs on its own.

## Layout

| Path | What it is | Source |
|---|---|---|
| `apps/lesson-planner/` | Lesson Plan Generator: React + Vite frontend, Express + MySQL backend | `digital_lesson_plan-main` in `21CTA.zip` |
| `apps/marks/` | RMS-MIS: vanilla JS SPA on Supabase, Vercel PDF function | [honore63/RMS-MMS](https://github.com/honore63/RMS-MMS) via `21CTA.zip` |
| `docs/audit/` | Phase 1 audit: system audit, database map, API map, auth, deployment and migration plans | — |

The audit documents refer to the original folder names: `digital_lesson_plan-main/` is now `apps/lesson-planner/`
and `RMS-MMS-main/` is now `apps/marks/`.

## Changes made to the snapshots

* `apps/marks`: none.
* `apps/lesson-planner`:
  * secrets and personal data were removed before the first commit: the database credentials in `backend/scripts/import_db.js` now come from env vars, `backend/.env.example` has placeholder AI keys, and `database/schema.sql` has demo users in place of real accounts;
  * the startup routine no longer drops all tables when the database looks incomplete. It only does so when `ALLOW_DESTRUCTIVE_BOOTSTRAP=true` **and** the `users` table is empty.

## Running each app

See `apps/lesson-planner/README.md` and `apps/marks/README.md`. Secrets go in local `.env` files (git-ignored), never in commits.
