# 21CTA — Project Progress

Actual, verified progress only. Newest first.

## 2026-11-08 — Phase 1 (audit) complete
* **Inspected:** both codebases in full (frontend, backend, SQL, functions, deployment config).
* **Created:** `docs/audit/*` (6 files), `docs/PROJECT_AUDIT.md`, `SYSTEM_ARCHITECTURE.md`, `DATABASE_DOCUMENTATION.md`, `API_DOCUMENTATION.md`, `SECURITY_AUDIT.md`, `DEVELOPMENT_ROADMAP.md`, this file.
* **Code changes (PR #1):** imported both apps; removed leaked credentials and personal data from the LPG snapshot; the destructive startup migration is now opt-in and only runs on an empty `users` table.
* **Database changes:** none.
* **Tests run:** LPG `vite build` ✅; LPG `node --check` ✅; RMS `node --test` → 7 pass / 10 fail (pre-existing).
* **Remaining problems:** see SECURITY_AUDIT (S5–S15) and PROJECT_AUDIT §3.
* **External items needed:** rotate the Aiven password and the Gemini/Groq keys; staging Supabase project + staging MySQL; domain confirmation.
* **Next:** Priority 0 PRs (security fixes, RMS tests, CI), then Phase 2.
