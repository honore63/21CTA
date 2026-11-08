# Phase 2 remediation report

**Date:** 2026-11-08
**Scope executed:** non-destructive safety remediation only
**Databases touched:** **none**
**Application started:** **no**
**Deployment performed:** **no**

---

## 1. What was implemented

| # | Change | System | Reason |
|---|---|---|---|
| 1 | Removed the destructive startup auto-migration | A | The server could `DROP` every non-view table when seed user `id = 2` was missing |
| 2 | Replaced it with a read-only health check | A | Reports missing tables without altering schema or data |
| 3 | Removed real Gemini and Groq keys from `.env.example` | A | Committed credentials must not remain in the tree |
| 4 | Replaced the JWT example with a generation instruction | A | Reduce copy-paste of a weak secret |
| 5 | Removed the hardcoded Aiven MySQL password from `import_db.js` | A | **New critical finding** — full database credentials were committed |
| 6 | Made `import_db.js` environment-driven and `--confirm`-gated | A | Prevents accidental destructive import and secret reuse |
| 7 | Generated a sanitized MySQL schema-only dump | Workspace | Safe reference without user rows or hashes |
| 8 | Froze all 23 PostgreSQL SQL sources with SHA-256 | Workspace | Immutable baseline for later diffs |
| 9 | Added MySQL and PostgreSQL backup scripts | Workspace | Establishes a repeatable backup path |
| 10 | Added restore-verification scripts with row-count comparison | Workspace | A backup is not proven until restored |
| 11 | Wrote the key rotation runbook | Workspace | Provider-side rotation requires owner access |
| 12 | Snapshotted every file changed in this phase | Workspace | No git history exists in either repo, so this is the rollback path |

No feature was removed, no table was altered, and no record was read or written.

---

## 2. Changed files

| File | Change | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `digital_lesson_plan-main/backend/src/server.js` | Destructive block (former lines 182–275) replaced with a read-only health check | `A24EEE3A…5839C` | `9FD8C285…DC745` |
| `digital_lesson_plan-main/backend/.env.example` | Real AI keys replaced with placeholders; JWT example hardened | `79CEDA70…3769C` | `F12FF1DF…AD3500` |
| `digital_lesson_plan-main/backend/scripts/import_db.js` | Hardcoded credentials removed; env validation and `--confirm` guard added | `17203DAB…91E34` | `2093CD88…EF025` |

Created in the integration workspace:

```
21cta-platform/
├── backups/phase2-2026-11-08/
│   ├── server.js                    ← byte-identical pre-change copy
│   ├── ORIGINAL_SHA256SUMS.tsv      ← hashes of all three originals
│   └── README.md                    ← why two snapshots were not retained
├── db/
│   ├── FREEZE_MANIFEST.md
│   ├── schema-only/lessonplan-mysql-schema-only.sql
│   └── source-sql-snapshot/postgres/ (23 files)
├── docs/
│   ├── KEY_ROTATION_RUNBOOK.md
│   └── PHASE_2_REMEDIATION.md   ← this file
└── infra/backup/
    ├── README.md
    ├── backup-mysql.ps1
    ├── backup-postgres.ps1
    ├── verify-restore-mysql.ps1
    └── verify-restore-postgres.ps1
```

The pre-change `.env.example` and `import_db.js` were **not retained** because they
contained the exposed credentials. Re-committing them inside a backup folder would
defeat the remediation. Their original hashes are recorded in
`backups/phase2-2026-11-08/ORIGINAL_SHA256SUMS.tsv` as proof of state.

### New critical finding (SEC-16)

`digital_lesson_plan-main/backend/scripts/import_db.js` contained a **hardcoded
managed-MySQL username and password**, plus the host, port and database name. This
was not in the Phase 1 report and is at least as severe as the AI key exposure,
because it granted direct database access. The value has been removed from the
working tree; **the password must still be reset at the provider** (KEY-04 in the
rotation runbook).

---

## 3. Database changes

**None.**

- No `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE` or `DELETE` was executed.
- No connection was opened to MySQL or PostgreSQL.
- No Supabase policy, function, bucket or auth setting was touched.
- All SQL in the new documents is illustrative or a frozen copy, never executed.

---

## 4. Verification performed

### 4.1 Syntax checks

| Command | Result |
|---|---|
| `node --check src/server.js` | **OK** |
| `node --check scripts/import_db.js` | **OK** |
| PowerShell parser on 4 backup scripts | **OK (4/4)** |

### 4.2 Destructive-code checks

| Command | Result |
|---|---|
| `Select-String server.js -Pattern 'DROP TABLE'` | **0 matches** |
| `Select-String server.js -Pattern 'needsMigration'` | **0 matches** |
| Secret scan for `AIza…`, `gsk_…`, `AVNS_…` and the Aiven host prefix across System A | **0 matches** |

### 4.3 Schema-only dump validation

| Check | Result |
|---|---|
| `CREATE TABLE` count | 14 |
| `INSERT INTO` count | 0 |
| Source size → output size | 611.5 KB → 18.6 KB |

### 4.4 What was **not** tested

- The backend was **not started**; no request was made.
- The backup and restore scripts were **not executed**; only syntax was validated.
- No restore drill was performed.
- No browser or API regression test was run.
- No claim is made that any credential has been revoked. It has not.

This distinction matters: the code changes are verified statically, not at runtime.

---

## 5. Behaviour change and impact

### 5.1 Startup

Before: if `users.id = 2`, `lessons` or `lesson_materials` was missing, the server
dropped all non-view tables and rebuilt from `database/schema.sql`.

After: the server logs one of:

```
✅ Database is healthy and data is present.
⚠️  Seed user id=2 not found. No automatic repair will be attempted.
❌ Database schema incomplete. Missing tables: ...
❌ Database health check failed: ...
```

and continues. It never issues DDL from this path. If the schema is genuinely
missing, API calls will fail with database errors until an operator restores a
backup or applies reviewed migrations. That is the intended safe failure mode.

### 5.2 `import_db.js`

Before: ran immediately with embedded credentials and executed the full dump,
which contains `CREATE TABLE` (not `IF NOT EXISTS`) and `DROP TABLE` for views.

After:

```powershell
# requires DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in backend/.env
node scripts/import_db.js --confirm
```

It refuses to run without `--confirm` and without all five variables.

### 5.3 Remaining runtime DDL

`createTablesIfNotExist()` still runs at startup and contains additive
`CREATE TABLE IF NOT EXISTS` / guarded `ALTER TABLE` statements. It is **not**
destructive, but it is still schema drift. Moving it to versioned migrations is a
Phase 6 task and is listed below.

---

## 6. Remaining work

### Blocked on owner access

| Item | Blocked by |
|---|---|
| Revoke/rotate Gemini and Groq keys | Provider console access |
| Reset the Aiven MySQL password and review access logs | Aiven console access |
| Take and restore-test live backups | DB credentials, scratch environment |
| Capture live schemas and row counts | DB credentials |
| Confirm Supabase Auth settings (issuer, audience, JWKS, MFA) | Supabase project admin |

### Ready to schedule (needs approval/window)

| Item | Why not done now |
|---|---|
| Remove the JWT fallback and fail startup if `JWT_SECRET` is missing | Invalidates all sessions; needs a maintenance window |
| Gate or remove the admin database-backup endpoint | Product decision on whether the feature stays |
| Restrict CORS to real 21CTA domains | Domains not confirmed |
| Replace runtime DDL with versioned migrations | Phase 6, after backups are proven |
| Sanitize or remove the committed MySQL dump | Decision #8; `import_db.js` and README reference it |
| Purge secrets from git history | No `.git` in the supplied trees; remote ownership unconfirmed |
| Add secret scanning to CI | No repository or CI pipeline exists yet |

### Explicitly still unsafe

- **RMS-MIS must not be exposed to a second school.** No `school_id` exists yet.
- **Do not run `clear-data.sql`.**
- **Do not treat the exposed credentials as safe** because they were removed from
  files. Revocation is the only fix.
- **Do not run the migration plan** until M0 backups and restore tests pass.

---

## 7. Deployment instructions for this change set

No database migration is required. The change is code-only.

1. **Set real environment variables in the deployment secret store** before
   deploying: `JWT_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEYS` (new values), and the
   database credentials. Do not copy `.env.example` values.
2. Deploy the three changed files (or the whole backend image).
3. Restart the backend.
4. Confirm the startup log shows the health-check line and **no** "Auto-Migration"
   or "Clearing old tables" message.
5. Confirm `GET /api/health` responds.
6. Sign in as a test teacher and open one existing lesson plan (read-only check).
7. If the schema is reported incomplete, **stop** and restore a verified backup;
   do not attempt to trigger the old rebuild path.
8. For a manual import, ensure a verified backup exists, then run
   `node scripts/import_db.js --confirm` with environment variables set.

### Rollback

The safe `server.js` copy is in `21cta-platform/backups/phase2-2026-11-08/` with
the original hashes in `ORIGINAL_SHA256SUMS.tsv`.

```powershell
# Verify the retained copy first
(Get-FileHash .\backups\phase2-2026-11-08\server.js -Algorithm SHA256).Hash
# Expect: A24EEE3A836175645D35BEA163DC426AF3915FF6E32CFC73023A49DE0AE5839C
```

**Do not roll back `server.js`.** The old version can destroy the database. If a
rollback is required for the other files, reconstruct them from the current tree;
the secret-bearing originals were deliberately not retained and must not be
restored (see `backups/phase2-2026-11-08/README.md`).

---

## 8. Phase gate status

| Gate | Status |
|---|---|
| Destructive startup migration removed | **Met** |
| Exposed keys removed from working tree | **Met** |
| Exposed credentials revoked at providers | **Not met** (blocked) |
| Backups taken and restore-tested | **Not met** (blocked) |
| Live schema captured | **Not met** (blocked) |
| Secret scanning in CI | **Not met** |

**Phase 2 is partially complete.** The code-side hazards are contained; the
credential and backup gates remain open and cannot be closed without console and
database access.
