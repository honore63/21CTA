# MIGRATION_PLAN.md

> **Superseded (2026-11-08):** This Phase 1 plan targets PostgreSQL and prohibits MySQL consolidation. Follow [`MYSQL_UNIFICATION_PLAN.md`](MYSQL_UNIFICATION_PLAN.md) and [`POSTGRES_TO_MYSQL_MAPPING.md`](POSTGRES_TO_MYSQL_MAPPING.md) for the current target. Its backup, restore, identity-safety, and approval gates remain applicable where consistent.

**Project:** 21CTA
**Approach:** additive, staged, reversible, evidence-based
**Absolute rule:** no production database is changed until a verified backup and restore test exist and
the change is authorised by the data owner.

---

## 1. Non-negotiables

1. Preserve both databases and all existing records.
2. Never run the System A destructive startup migration again.
3. Never delete or overwrite a Supabase table, policy, function or storage object.
4. Never merge identities by name or unverified email.
5. Never migrate production data into development.
6. Every step has a validation query and a rollback action.
7. Every schema change is recorded in a migration ledger with checksum, author and timestamp.
8. Cross-system links are explicit, auditable and revocable.
9. A phase is complete only when its exit criteria are met in staging **and** production.
10. No MySQL→PostgreSQL consolidation without written approval.

---

## 2. Pre-flight (M0) — protect what exists

### 2.1 Actions

- [ ] Inventory both live databases (tables, row counts, sizes, owners).
- [ ] Capture schema-only dumps and store them in the private repo.
- [ ] Take full logical backups with checksums.
- [ ] Restore each backup into an isolated environment and validate.
- [ ] Record current application versions and deployment SHAs.
- [ ] Rotate every credential that has been committed or shared.
- [ ] Freeze production schema changes for the migration window.
- [ ] Confirm Supabase project ownership and admin access.
- [ ] Create a read-only inventory user for MySQL.
- [ ] Document current RLS state and run a policy inventory.

### 2.2 Backup commands (illustrative)

```bash
# MySQL
mysqldump --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" \
  | gzip > "lessonplan_$(date +%Y%m%d_%H%M).sql.gz"

# PostgreSQL (if direct access is available)
pg_dump --format=custom --no-owner --no-privileges \
  "$DATABASE_URL" > "rms_$(date +%Y%m%d_%H%M).dump"
```

Store encrypted copies in a separate account/region. Record SHA-256 checksums.

### 2.3 Exit criteria

- Two independent backups exist per database.
- At least one full restore succeeded with matching table counts.
- Rollback owner and contacts are named.
- Secrets are rotated and old ones revoked.

---

## 3. M1 — Create the additive platform schema

### 3.1 PostgreSQL

Create, in this order:

1. `schools`
2. `platform_users`
3. `platform_roles`, `permissions`, `role_permissions`
4. `school_memberships`, `school_invitations`
5. `identity_links`
6. `parent_student_links`
7. `audit_logs` extension columns
8. Module tables (`attendance_*`, `timetable_*`, `class_diary_*`, `cpd_*`, `teacher_portfolios`,
   `classroom_observations`)

All new tables are additive. No existing table is dropped or renamed.

Seed roles/permissions from `AUTHENTICATION_PLAN.md` §4. Do not seed real users.

### 3.2 MySQL

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum CHAR(64) NOT NULL,
  applied_by VARCHAR(255) NULL
);

ALTER TABLE users
  ADD COLUMN central_user_id CHAR(36) NULL,
  ADD COLUMN school_id CHAR(36) NULL;

ALTER TABLE classes
  ADD COLUMN school_id CHAR(36) NULL;

ALTER TABLE syllabuses
  ADD COLUMN school_id CHAR(36) NULL;

CREATE INDEX idx_users_central ON users(central_user_id);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_syllabuses_school ON syllabuses(school_id);
```

All columns are nullable. No data is rewritten in this step.

### 3.3 Exit criteria

- New tables exist with RLS enabled where applicable.
- Existing application behaviour is unchanged.
- Migration ledger records every file.
- Staging smoke tests pass.

**Rollback:** drop only the newly created tables/columns after confirming no writes depend on them.

---

## 4. M2 — Register the pilot school(s)

### 4.1 Actions

- Insert the first school with a stable UUID and official code.
- Insert school settings as a per-school row (new table or `school_id` on existing settings).
- Create the first `super_admin` membership through a controlled bootstrap script, not through a public
  endpoint.
- Invite the school administrator and DOS; require verified email and MFA.
- Record consent/approval for data processing.

### 4.2 Validation

```sql
SELECT id, code, name, status FROM public.schools;
SELECT count(*) FROM public.school_memberships WHERE status = 'active';
```

### 4.3 Exit criteria

- One active school.
- One active super admin, one school admin, one DOS.
- No orphan memberships.

---

## 5. M3 — Link identities (highest-risk step)

### 5.1 Build the candidate list

Export from System A:

```sql
SELECT u.id, u.full_name, u.email, u.phone_number, u.role, u.school_name,
       u.created_at, COUNT(lp.id) AS plan_count
FROM users u
LEFT JOIN lesson_plans lp ON lp.teacher_id = u.id
GROUP BY u.id
ORDER BY u.id;
```

Export from System B (masked for review):

```sql
SELECT u.id, u.email, u.full_name, u.role, u.status, u.created_at,
       t.teacher_code
FROM public.users u
LEFT JOIN public.teachers t ON t.user_id = u.id
ORDER BY u.created_at;
```

### 5.2 Review rules

- Match only on exact, normalised email **as a candidate**, never as an automatic link.
- Confirm with the person or their school administrator.
- Prefer verified-email challenge; otherwise admin approval with documented evidence.
- Block any legacy account claimed by more than one platform user.
- Leave unmatched accounts unlinked; they keep working in their legacy system until resolved.
- Do not link a `parent` login to a staff profile.

### 5.3 Apply links

For each approved link:

```sql
INSERT INTO public.identity_links
  (platform_user_id, system_code, legacy_user_id, legacy_email,
   link_method, status, verified_at, verified_by)
VALUES ($1,'lesson_planner',$2,$3,'admin_approved','verified',now(),$4);
```

Then update MySQL:

```sql
UPDATE users
SET central_user_id = ?, school_id = ?
WHERE id = ? AND central_user_id IS NULL;
```

Guard against overwriting an existing link:

```sql
SELECT COUNT(*) FROM users WHERE central_user_id IS NOT NULL AND id = ?;
```

### 5.4 Validation

```sql
-- no legacy account linked twice
SELECT legacy_user_id, count(*)
FROM public.identity_links
WHERE status = 'verified'
GROUP BY legacy_user_id HAVING count(*) > 1;

-- no platform user with conflicting school roles
SELECT user_id, count(DISTINCT school_id)
FROM public.school_memberships
WHERE status = 'active'
GROUP BY user_id;
```

MySQL:

```sql
SELECT COUNT(*) FROM users WHERE central_user_id IS NOT NULL;
SELECT COUNT(*) FROM users WHERE central_user_id IS NULL;  -- expected: unresolved only
```

### 5.5 Exit criteria

- 100% of pilot users have an approved link or an explicit "no legacy history" decision.
- Zero duplicate legacy links.
- Audit entries exist for every link.
- A test user can authenticate once and reach both systems.

**Rollback:** set `identity_links.status='revoked'` and `users.central_user_id=NULL` for the affected
rows; no academic records are touched.

---

## 6. M4 — Backfill school ownership in PostgreSQL

### 6.1 Order (least risky first)

1. Reference tables: `academic_years`, `terms`, `subjects`, `assessment_types`, `grading_scales`,
   `performance_comments`.
2. People: `teachers`, `learners`, `users`.
3. Structure: `classes`, `class_subjects`, `teacher_assignments`.
4. Academic records: `assessments`, `marks`.
5. Communication/files: `notifications`, `announcements`, `messages`, `documents`,
   `digital_library_*`, `audit_logs`.
6. Exams: `examinations`, `examination_classes`, `exam_questions`, `question_bank`, `exam_attempts`,
   `student_answers`.

### 6.2 Backfill pattern

```sql
ALTER TABLE public.learners ADD COLUMN IF NOT EXISTS school_id uuid
  REFERENCES public.schools(id);

UPDATE public.learners
SET school_id = (SELECT id FROM public.schools WHERE code = 'RMS-001')
WHERE school_id IS NULL;

-- validate before NOT NULL
SELECT count(*) FROM public.learners WHERE school_id IS NULL;
```

For marks/assessments, derive from the class where possible, then from the teacher's membership, then
from the explicit pilot-school default. **Never guess silently** — log every defaulted row.

### 6.3 Constraint migration

After 100% backfill:

```sql
ALTER TABLE public.learners ALTER COLUMN school_id SET NOT NULL;

-- replace global uniqueness
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_code_key;
CREATE UNIQUE INDEX subjects_school_code_uidx
  ON public.subjects(school_id, code);

-- academic years
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_name_key;
CREATE UNIQUE INDEX academic_years_school_name_uidx
  ON public.academic_years(school_id, name);

DROP INDEX IF EXISTS public.academic_years_one_current;
CREATE UNIQUE INDEX academic_years_one_current_per_school
  ON public.academic_years(school_id) WHERE is_current = TRUE;
```

Apply equivalent changes for `assessment_types`, `teachers`, `learners`, `classes`, phones. Every
constraint drop is preceded by a duplicate check:

```sql
SELECT school_id, code, count(*) FROM public.subjects
GROUP BY school_id, code HAVING count(*) > 1;
```

### 6.4 RLS

1. Create `current_school_ids()` and `is_platform_admin()`.
2. Add RESTRICTIVE tenant policies in a transaction per table.
3. Run isolation tests with two synthetic schools.
4. Only then expose the pilot school to the new shell.

### 6.5 Exit criteria

- No NULL `school_id` in school-owned tables.
- Composite uniqueness enforced.
- Cross-school tests pass for select/insert/update/delete.
- Existing RMS-MIS reports still render identically for the pilot school.

**Rollback:** keep the backup; reverse constraint changes in a tested down-migration; set columns
nullable if a partial backfill must be abandoned. Data is never deleted.

---

## 7. M5 — Adapt System A

### 7.1 Actions

1. Remove the destructive auto-migration from `server.js`.
2. Introduce versioned migrations and a ledger.
3. Add `central_user_id` and `school_id` (already added in M1).
4. Add token verification for platform-issued internal tokens.
5. Enforce school filtering on every query that returns classes, plans, materials or analytics.
6. Replace the JWT fallback with a startup failure.
7. Restrict CORS to the 21CTA domains.
8. Gate/remove the admin backup endpoint.
9. Add health and version endpoints.
10. Add regression tests for existing endpoints before switching traffic.

### 7.2 Validation

- Existing A test suite (to be created) passes.
- A pilot teacher's plans are unchanged (counts and checksums before/after).
- Cross-school requests are rejected.
- Token expiry and audience checks are enforced.
- No startup path can issue `DROP TABLE` (grep + test).

### 7.3 Exit criteria

- System A runs with the adapter for the pilot school.
- Legacy frontend still works.
- No data loss; no destructive DDL at boot.

**Rollback:** feature-flag back to direct legacy auth for the pilot; the MySQL schema additions are
inert if unused.

---

## 8. M6 — Enable new modules in order

Order chosen to reuse existing functionality and reduce risk:

1. Library (extend existing tables; add `school_id`).
2. Assessment (extend existing examination tables; add scoping).
3. Class diary (new).
4. Attendance (new).
5. Timetable (new; optionally import `teacher_schedules`).
6. CPD and portfolio (new).
7. Student/parent portals (verified links).
8. Analytics (reporting tables + ETL).
9. AI assistant (central provider + quotas).

Each module has its own migration file, feature flag, tests and acceptance criteria. A module is not
"done" because a page renders; it is done when its workflows and permissions are tested.

---

## 9. M7 — Reporting layer

- Create `analytics_*` tables keyed by `(school_id, source_system, source_id, snapshot_date)`.
- Nightly extraction from MySQL and PostgreSQL.
- Reconciliation counts per table and per school.
- Dashboards read only from the reporting layer, never from live cross-database joins.
- Clearly label data freshness (`as of` timestamp).
- No fabricated values; empty states are explicit.

---

## 10. M8 — Optional consolidation (deferred)

Only if the owner explicitly authorises it:

1. Freeze System A writes or run dual-write with an outbox.
2. Map every MySQL table to a PostgreSQL target.
3. Migrate in dependency order with row-count and checksum validation.
4. Run both systems in parallel for one academic term.
5. Switch reads, then writes, then decommission only after sign-off.

Until then: **MySQL remains the lesson-plan system of record.**

---

## 11. Validation catalogue

### 11.1 Row counts

```sql
-- PostgreSQL
SELECT 'learners' t, count(*) FROM public.learners
UNION ALL SELECT 'marks', count(*) FROM public.marks
UNION ALL SELECT 'assessments', count(*) FROM public.assessments;

-- MySQL
SELECT 'users' t, count(*) FROM users
UNION ALL SELECT 'lesson_plans', count(*) FROM lesson_plans
UNION ALL SELECT 'lessons', count(*) FROM lessons;
```

Record before/after counts for every migration. Any unexplained delta blocks the phase.

### 11.2 Orphans and nulls

```sql
SELECT count(*) FROM public.marks m
LEFT JOIN public.assessments a ON a.id = m.assessment_id
WHERE a.id IS NULL;

SELECT count(*) FROM public.learners WHERE school_id IS NULL;

SELECT count(*) FROM public.teacher_assignments ta
LEFT JOIN public.teachers t ON t.id = ta.teacher_id
WHERE t.id IS NULL;
```

### 11.3 Cross-school isolation

```sql
-- as a School A user
SELECT count(*) FROM public.learners
WHERE school_id = '<school-b-uuid>';   -- must be 0
```

Run the same check for marks, assessments, library, exams and messages. Test writes, updates and
deletes, not only reads.

### 11.4 Calculation preservation

- Snapshot a class's marks and report output before migration.
- Recompute after migration.
- Compare percentages, grades, positions, totals and remarks exactly.
- Any difference blocks release until explained and approved by the academic authority.

### 11.5 Auth preservation

- Every pilot user signs in once.
- Each reaches the same data as before.
- Role and school are correct.
- A revoked/suspended user loses access immediately.
- No duplicate accounts created.

---

## 12. Rollback matrix

| Phase | Rollback | Data risk |
|---|---|---|
| M0 backups | none needed | none |
| M1 new tables/columns | drop new objects if unused | none (inert columns) |
| M2 schools | delete seed rows if no memberships | low |
| M3 links | revoke links; null `central_user_id` | none to academic data |
| M4 backfill | keep columns nullable; restore from backup if constraints fail | medium — requires backup |
| M5 System A adapter | feature flag to legacy auth | low |
| M6 modules | disable feature flag; keep tables | low |
| M7 analytics | drop derived tables; they are reproducible | none |
| M8 consolidation | restore both databases; keep legacy live | high — requires written plan |

---

## 13. Change control

- Migration files are reviewed by at least two people.
- Production migrations run from CI or a controlled runbook, never from a developer laptop.
- The migration user has DDL rights; the runtime user does not.
- A change freeze applies during national exams and report-card publication windows.
- Every migration produces a log entry: version, checksum, start/end time, rows affected, operator.
- Incidents follow the security/deployment runbooks and are recorded in `CHANGELOG.md`.

---

## 14. Approvals required before execution

| Approval | Owner | Needed for |
|---|---|---|
| Backup/restore sign-off | Data owner | M0 |
| Identity linking policy | Product + school admin | M3 |
| School ownership backfill | Academic authority | M4 |
| Marks-calculation preservation | Academic authority | M4/M5 |
| Production change window | Operations | every phase |
| MySQL→PostgreSQL consolidation | Executive owner | M8 only |

**No approval = no migration.**
