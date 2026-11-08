# Backup and restore verification

**Purpose:** prove that 21CTA can recover both databases before any migration or
multi-school change is attempted.

**Status:** scripts delivered and syntax-checked. **Not executed.** No production
credentials were available, and no database was contacted. A backup is only
proven after `verify-restore-*.ps1` has run successfully against an isolated
scratch database.

---

## 1. Why this exists

The Phase 1 audit found no evidence of restorable backups for either system
(blocking finding B-4). Every later migration step — tenant columns, school
backfill, constraint replacement, identity linking — is unsafe until the restore
path is demonstrated. These scripts encode the minimum acceptable procedure.

## 2. Files

| File | Purpose |
|---|---|
| `backup-mysql.ps1` | Logical dump of System A MySQL with routines, triggers and events |
| `backup-postgres.ps1` | Custom-format dump of System B PostgreSQL |
| `verify-restore-mysql.ps1` | Restores into a scratch DB and compares table/row counts |
| `verify-restore-postgres.ps1` | Restores into a scratch DB and compares table/row counts |

All four are **read-only toward production except the restore step**, which only
writes to a database whose name you explicitly pass as `-ScratchDatabase`.
Credentials are read from environment variables only; nothing is written to disk
except the dump and a `manifest.tsv` containing timestamp, filename, SHA-256 and
byte size.

## 3. Prerequisites

- MySQL client tools (`mysqldump`, `mysql`) matching or newer than the server.
- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) matching the server.
- A backup-capable account; prefer a dedicated user with `SELECT`, `LOCK TABLES`,
  `SHOW VIEW`, `TRIGGER`, `EVENT` and `RELOAD` rather than the application user.
- Enough disk space for a full dump plus the restored copy.
- An isolated scratch database server or schema for verification. **Never restore
  into production.**

## 4. Procedure

### 4.1 MySQL (System A)

```powershell
$env:DB_HOST   = '<host>'
$env:DB_PORT   = '3306'
$env:DB_USER   = '<backup-user>'
$env:DB_PASSWORD = '<secret>'      # current shell only; never a file in the repo
$env:DB_NAME   = 'lessonplan_db'

.\backup-mysql.ps1
```

Then, in an isolated environment:

```powershell
$env:DB_HOST = '<scratch-host>'    # scratch DB must NOT be the production host
$env:DB_NAME = 'lessonplan_db'     # source name, used for comparison only
.\verify-restore-mysql.ps1 `
  -BackupFile ..\..\database\backups\mysql\lessonplan_db_<stamp>.sql `
  -ScratchDatabase lessonplan_restore_test `
  -Confirm
```

### 4.2 PostgreSQL (System B)

```powershell
$env:DATABASE_URL = 'postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require'
.\backup-postgres.ps1
```

Then:

```powershell
$env:PGHOST='<scratch-host>'; $env:PGPORT='5432'; $env:PGUSER='<user>'
$env:PGPASSWORD='<secret>'; $env:PGDATABASE='postgres'
.\verify-restore-postgres.ps1 `
  -BackupFile ..\..\database\backups\postgres\rms_<stamp>.dump `
  -ScratchDatabase rms_restore_test `
  -Confirm
```

The verification scripts compare the total base-table count and exact row counts
for the tables you pass in `-Tables`. Any mismatch fails the run. Extend the table
list to the full inventory for the official drill.

## 5. Acceptance criteria for M0 (Phase 2 gate)

- [ ] Two independent backups exist for each database, each with a SHA-256 record.
- [ ] At least one backup per database has been restored into an isolated environment.
- [ ] Table counts match exactly.
- [ ] A defined set of critical tables matches exactly (`users`, `classes`,
      `subjects`, `lesson_plans`, `lessons` for MySQL; `users`, `teachers`,
      `learners`, `classes`, `marks`, `assessments` for PostgreSQL).
- [ ] At least one report or page renders from the restored copy.
- [ ] Backup and restore durations, RPO and RTO are recorded.
- [ ] The backup files are encrypted at rest and stored in a separate account/region.
- [ ] Restore credentials are available to at least two named people.
- [ ] A quarterly drill is scheduled.

## 6. Storage and retention

| Item | Policy |
|---|---|
| Encryption | At rest, separate key from the database host |
| Location | Separate account/region from production |
| Retention | 30 daily, 12 monthly, plus academic-year archives |
| Access | Named operators only; every download logged |
| Integrity | SHA-256 recorded per file; verify before any restore |
| RPO | ≤ 15 minutes if PITR is available, otherwise ≤ 24 hours |
| RTO | ≤ 4 hours for the platform tier |

Provider-native continuous backups should be enabled as well; these scripts are
the portable logical fallback, not a replacement for PITR.

## 7. Known limitations

- The scripts have **not** been executed; only PowerShell syntax was validated.
- `mysqldump` on a very large database may need `--quick` tuning and a longer
  timeout; adjust after the first live run.
- The PostgreSQL script assumes a scratch DB can be created on the same server
  with the supplied superuser/maintenance connection. If policy forbids that, use
  a separate scratch project instead.
- Row-count comparison is a smoke test, not full data validation. For the official
  drill, add checksums for selected tables and verify foreign-key orphans.
- Backup files contain personal data. Treat them as confidential, encrypt them,
  and never copy production dumps into development.
