# DATABASE_MAP.md

> **Historical target note (2026-11-08):** This map records the Phase 1 PostgreSQL target. Its database ownership and target-schema recommendations are superseded by [`MYSQL_UNIFICATION_PLAN.md`](MYSQL_UNIFICATION_PLAN.md). The source inventory remains useful; no production migration is authorized here.

**Project:** 21CTA
**Scope:** Data ownership, existing schemas, multi-tenant gaps, target model, migration order
**Rule:** MySQL and PostgreSQL are both preserved. No destructive change is authorised by this document.

---

## 1. Principles

1. **One owner per record.** Every table has exactly one system of record.
2. **Additive first.** New columns are nullable or defaulted; no column is dropped during integration.
3. **No cross-database joins in request paths.** Cross-system data moves through APIs or scheduled jobs.
4. **Canonical identity is a UUID.** `auth.users.id` is the platform user UUID.
5. **School scoping is mandatory.** Every school-owned row carries `school_id`.
6. **RLS is enforced in PostgreSQL and application-level authorization in MySQL.**
7. **Legacy integer keys remain valid.** They are never reused as platform identifiers.
8. **Every migration is logged and reversible** (or has a documented compensating action).

---

## 2. System A — MySQL inventory (`lessonplan_db`)

### 2.1 Base tables in the committed dump

| Table | Purpose | Key | School link | Notes |
|---|---|---|---|---|
| `users` | Teachers/admins | `id` int | `school_name` free text only | bcrypt hash, `role ENUM('admin','teacher')`, `is_suspended` |
| `classes` | Classes | `id` int | none | belongs to one `teacher_id` |
| `subjects` | Subject catalogue | `id` int | none | global catalogue |
| `class_subjects` | Class ↔ subject | `id` int | via class | |
| `units` | Curriculum units | `id` int | via class-subject | |
| `lessons` | Lesson records | `id` int | via unit | includes completion/reflection |
| `lesson_plans` | Generated plans + versions | `id` int | via lesson | JSON content, AI metadata |
| `lesson_materials` | Plan ↔ material | composite | via lesson | |
| `teaching_materials` | Teacher uploads | `id` int | via user | |
| `reference_materials` | Reference library | `id` int | none | local/Cloudinary file refs |
| `special_needs_learners` | Inclusion provisions | `id` int | via lesson | |
| `ai_generation_logs` | AI prompts/results metadata | `id` int | via plan | contains prompts; sensitive |

Views: `v_lesson_plans_overview`, `v_teacher_classes`.

### 2.2 Tables created at runtime (not fully in the dump)

`chat_sessions`, `chats`, `contact_messages`, `subscriptions`, `visitors`, `system_settings`,
`agent_tasks`, `syllabuses`, `syllabus_units`, `syllabus_lessons`, `teacher_schedules`,
`term_settings`, `holidays`, `email_queue`, and (only via `init_new_features.sql`) `user_devices`.

> Runtime DDL is a schema-drift risk. These tables must be captured in versioned migrations during
> Phase 2. Do not assume the dump is the complete production schema.

### 2.3 System A data risks

- The dump contains **named users, bcrypt hashes, AI prompts and chat-like content**. It is not safe to
  keep in a public repository. Replace with a schema-only dump and retain data only in the private
  operational backup.
- `users.school_name` is free text (`GS BUSANZA`, `Rukara Model School`, etc.). It is not a reliable
  school key and must not be used for authorization.
- No foreign key from `users` to a school, no cross-school uniqueness constraints.
- IDs are 32-bit integers; a platform UUID must be stored alongside them.

### 2.4 Required additive changes (Phase 6, after approval)

```sql
-- Illustrative, not yet executed
ALTER TABLE users
  ADD COLUMN central_user_id CHAR(36) NULL,
  ADD COLUMN school_id CHAR(36) NULL,
  ADD UNIQUE KEY uq_users_central (central_user_id),
  ADD KEY idx_users_school (school_id);

ALTER TABLE classes
  ADD COLUMN school_id CHAR(36) NULL,
  ADD KEY idx_classes_school (school_id);

ALTER TABLE syllabuses
  ADD COLUMN school_id CHAR(36) NULL,
  ADD KEY idx_syllabuses_school (school_id);

CREATE TABLE schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum CHAR(64) NOT NULL,
  applied_by VARCHAR(255) NULL
);
```

- `school_id` values come from the canonical PostgreSQL `schools` table.
- No foreign key is created across database engines. The backend validates `school_id` against the
  platform-core school registry and rejects unknown values.
- Legacy rows are backfilled only after identity/school mapping is approved.

---

## 3. System B — PostgreSQL inventory (Supabase)

### 3.1 Core academic tables

| Table | Purpose | Key | Tenant status |
|---|---|---|---|
| `auth.users` | Identity | UUID | Supabase-managed |
| `users` | Staff profile | UUID = `auth.uid()` | **no `school_id`** |
| `teachers` | Teacher profile | UUID | no `school_id` |
| `learners` | Learners | UUID + `learner_code` | no `school_id` |
| `classes` | Classes | UUID | no `school_id` |
| `subjects` | Subjects catalogue | UUID + `code` | no `school_id` |
| `class_subjects` | Class ↔ subject | UUID | via class |
| `academic_years` | Years | UUID + globally unique `name` | no `school_id` |
| `terms` | Terms | UUID | via year |
| `teacher_assignments` | Teacher/class/subject/year/term | UUID | no `school_id` |
| `assessments` | Assessments | UUID | no `school_id` |
| `assessment_types` | Type catalogue + weights | UUID + globally unique name/code | no `school_id` |
| `marks` | Marks | UUID, unique(assessment, learner) | no `school_id` |
| `grading_scales` | Grade bands | UUID + unique grade | no `school_id` |
| `performance_comments` | Comment bank | UUID | no `school_id` |
| `school_settings` | Single school configuration | UUID | **single record, no `school_id`** |
| `education_levels` | Primary/Secondary levels | UUID | global reference |

### 3.2 Governance, communication and files

`audit_logs`, `import_history`, `notifications`, `announcements`, `announcement_acknowledgements`,
`messages`, `message_attachments`, `email_notifications`, `sms_notifications`,
`teacher_registration_audit`, `documents`.

### 3.3 Digital Library (already implemented)

`digital_library_resources`, `digital_library_settings`, `digital_library_ai_usage`,
`digital_library_ai_chunks`.

- Files live in Supabase Storage; metadata carries class/subject/year/term and uploader.
- Public read is possible for published resources; teacher-owned rows are RLS-scoped.
- Library is school-owned in practice but has **no `school_id`**.

### 3.4 Examination Centre (already implemented)

`examinations`, `examination_classes`, `exam_questions`, `question_bank`, `exam_attempts`,
`student_answers`.

- Server-side attempt lifecycle RPCs: start, save answer, save written answer, submit, mark, review.
- Guest exam flow exists and must be rate-limited and monitored.
- **No `school_id`**; questions/exams could collide across schools once multi-tenant.

### 3.5 Constraints that block multi-school operation

| Constraint | Current behaviour | Required change |
|---|---|---|
| `academic_years.name UNIQUE` | one "2026" globally | unique per `(school_id, name)` |
| `academic_years_one_current` partial unique on `(TRUE) WHERE is_current` | only one current year globally | unique per `(school_id) WHERE is_current` |
| `subjects.code UNIQUE` | one "MAT" globally | unique per `(school_id, code)` |
| `assessment_types.name/code UNIQUE` | global catalogue | either global templates or per-school copies |
| `teachers.teacher_code UNIQUE` | global | per school, or globally unique with school prefix |
| `learners.learner_code UNIQUE` | global | per school |
| `teachers.phone UNIQUE`, `users.phone UNIQUE` | one phone globally | per school or identity-level |
| `classes unique(name, academic_year_id)` | one "P4" per year globally | add `school_id` |
| `school_settings` | single row | per-school row |

> These are **not optional clean-ups**. Without them, onboarding a second school will either fail on
> insert or silently mix records.

---

## 4. Canonical identity mapping

There is no reliable automatic link between System A's integer users and System B's UUID users.

### 4.1 New table: `identity_links`

```sql
CREATE TABLE public.identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_code text NOT NULL CHECK (system_code IN ('lesson_planner','rms_mis')),
  legacy_user_id text NOT NULL,
  legacy_email text,
  link_method text NOT NULL CHECK (link_method IN ('verified_email','admin_approved','invite_acceptance','migration')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','revoked')),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_code, legacy_user_id)
);

CREATE INDEX identity_links_platform_user_idx ON public.identity_links(platform_user_id);
```

Rules:

- A name match is **never** sufficient.
- An email match alone is **not** sufficient (mailboxes can be reassigned).
- `verified_email` requires the user to prove control of the mailbox after login.
- `admin_approved` requires a school or platform administrator, with an audit entry.
- `migration` is only for accounts the owner has explicitly listed and approved in writing.
- One platform user may have links in both systems. One legacy account may have at most one active link.

### 4.2 Canonical school

PostgreSQL owns `public.schools`. MySQL stores only `school_id` strings. The school directory is read
from platform-core; no MySQL table is authoritative for school identity.

---

## 5. Target platform schema (PostgreSQL)

New tables are additive. Existing RMS tables are altered, not replaced.

### 5.1 Tenancy and identity

```sql
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  school_type text,
  district text,
  sector text,
  province text,
  phone text,
  email text,
  logo_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','archived')),
  onboarded_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  avatar_url text,
  locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited','active','suspended','deactivated')),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('platform','school')),
  description text
);

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text
);

CREATE TABLE public.role_permissions (
  role_id uuid REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.school_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.platform_roles(id),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','suspended','revoked')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);

CREATE TABLE public.school_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.platform_roles(id),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Role seeds: `super_admin`, `national_admin` (platform scope); `school_admin`, `dos`, `headteacher`,
`teacher`, `student`, `parent` (school scope). Legacy mapping is explicit and reviewed, never inferred.

### 5.2 New academic modules

| Table | Purpose |
|---|---|
| `attendance_sessions` | one register per class/subject/date/period, `school_id` |
| `attendance_records` | learner attendance status, remarks, recorded_by |
| `timetable_slots` | class, subject, teacher, room, day, start/end, academic year, term |
| `timetable_conflicts` | detected double-booking log (optional if enforced in service) |
| `class_diary_entries` | date, class, subject, teacher, topic, objectives, activities, resources, homework, challenges, reflection, coverage |
| `class_diary_corrections` | correction request/approval history for approved entries |
| `cpd_activities` | training events, provider, dates, capacity |
| `cpd_registrations` | teacher registration/attendance |
| `cpd_records` | completed development records |
| `cpd_certificates` | certificate metadata + private file path |
| `teacher_portfolios` | profile, achievements, evidence |
| `classroom_observations` | observer, teacher, date, rubric, feedback, status |
| `parent_student_links` | verified parent ↔ learner relationship |

Every table above includes `school_id uuid NOT NULL REFERENCES schools(id)` and standard
`created_at`, `created_by`, `updated_at` columns.

### 5.3 Extend existing tables

Add to every school-owned RMS table:

```sql
ALTER TABLE public.<table> ADD COLUMN school_id uuid REFERENCES public.schools(id);
-- backfill, then:
ALTER TABLE public.<table> ALTER COLUMN school_id SET NOT NULL;
```

Use a dedicated migration per table group, with validation queries between steps. Do **not** run one
giant transaction that locks the whole schema in production.

Tables requiring `school_id`:
`users`, `teachers`, `learners`, `classes`, `subjects`, `class_subjects`, `academic_years`, `terms`,
`teacher_assignments`, `assessments`, `assessment_types`, `marks`, `grading_scales`,
`performance_comments`, `school_settings`, `audit_logs`, `import_history`, `notifications`,
`announcements`, `messages`, `documents`, `digital_library_resources`, `digital_library_settings`,
`examinations`, `examination_classes`, `exam_questions`, `question_bank`, `exam_attempts`,
`student_answers`.

`assessment_types`, `grading_scales` and `performance_comments` may remain **global templates** if the
product decides so; in that case they are readable by all schools but writable only by platform
administrators, and school-specific overrides live in separate `school_*` tables. This decision must be
recorded before migration.

### 5.4 Audit

Extend the existing `audit_logs` with:

```sql
ALTER TABLE public.audit_logs
  ADD COLUMN school_id uuid REFERENCES public.schools(id),
  ADD COLUMN actor_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN actor_role text,
  ADD COLUMN action text,
  ADD COLUMN entity_type text,
  ADD COLUMN entity_id text,
  ADD COLUMN before_state jsonb,
  ADD COLUMN after_state jsonb,
  ADD COLUMN request_id text,
  ADD COLUMN ip_hash text;
```

Retain existing columns for backward compatibility. Never delete audit rows through normal UI paths.

---

## 6. Row Level Security strategy

### 6.1 Helper functions (SECURITY DEFINER, stable, no recursion)

```sql
CREATE OR REPLACE FUNCTION public.current_school_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(m.school_id), '{}'::uuid[])
  FROM public.school_memberships m
  WHERE m.user_id = auth.uid() AND m.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_memberships m
    JOIN public.platform_roles r ON r.id = m.role_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND r.code IN ('super_admin','national_admin')
  );
$$;
```

### 6.2 Restrictive policy pattern

Existing permissive policies remain. A RESTRICTIVE policy ANDs with them, so a row must satisfy both the
legacy rule and the tenant rule.

```sql
CREATE POLICY tenant_isolation ON public.learners
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR school_id = ANY (public.current_school_ids())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR school_id = ANY (public.current_school_ids())
  );
```

Repeat for every school-owned table. For tables read by `anon` (public library, guest exams), keep the
public policy narrow and audited.

### 6.3 Required tests

- User in School A cannot `select`, `insert`, `update` or `delete` School B rows.
- Platform admin can read all; school admin cannot read another school.
- Parent can read only linked learners; student can read only self.
- Teacher can read only assigned classes/subjects within their school(s).
- A revoked membership loses access immediately.
- Service-role access is never used in browser code.

---

## 7. Data ownership matrix

| Data domain | System of record | Consumers | Cross-system mechanism |
|---|---|---|---|
| Identity (`auth.users`) | PostgreSQL / Supabase Auth | A, B, new platform | JWT (`sub`) + `identity_links` |
| Schools, memberships, roles | PostgreSQL | all | platform-core API |
| Lesson plans, units, classes (A) | MySQL | lesson-planner, analytics | System A API |
| Marks, assessments, approvals | PostgreSQL | marks, analytics, portals | Supabase/RLS + service layer |
| Library metadata/files | PostgreSQL + Supabase Storage | library, AI | signed URLs |
| Examinations | PostgreSQL | assessment portal | RPC + platform service |
| Attendance/timetable/diary/CPD | PostgreSQL (new) | all | platform-core API |
| Notifications | PostgreSQL (queue) | all | dispatcher + adapters |
| Audit | PostgreSQL (platform) + existing B logs | admin | append-only |
| Analytics | PostgreSQL reporting tables | dashboards | scheduled ETL from A and B |

**Rule:** System A never writes marks; System B never writes lesson plans. New platform modules never
write directly into legacy A tables.

---

## 8. Cross-database integration

1. **APIs, not links.** System A exposes its API; the adapter calls it with a scoped internal token.
2. **Outbox pattern for events.** When a lesson plan is created or a mark is submitted, write an event
   to a platform outbox table and process it idempotently.
3. **Analytics ETL.** Nightly incremental extraction into PostgreSQL staging tables, then upsert into
   reporting tables keyed by `(school_id, source_system, source_id, updated_at)`.
4. **Reconciliation.** Daily counts/checksums per table; alert on drift.
5. **Idempotency keys** on all cross-system writes.

No operational page should depend on a live join across MySQL and PostgreSQL.

---

## 9. Migration order (safe sequence)

| Step | Action | Reversible? |
|---|---|---|
| 0 | Verified full backups + restore test of both databases | N/A |
| 1 | Freeze schema dumps; export schema-only versions | Yes |
| 2 | Create `schools`, `platform_users`, roles, permissions, memberships | Yes (drop new tables) |
| 3 | Seed Rukara Model School; backfill only after approval | Yes (set NULL) |
| 4 | Add `school_id` nullable to PostgreSQL tables; backfill pilot school | Yes |
| 5 | Add RESTRICTIVE tenant policies in shadow mode; run isolation tests | Yes (drop policies) |
| 6 | Make `school_id` NOT NULL after 100% backfill validation | Requires backup |
| 7 | Replace global unique constraints with school-scoped ones | Requires backup |
| 8 | Add `central_user_id`/`school_id` to MySQL; backfill approved links | Yes (columns nullable) |
| 9 | Switch System A adapter to token exchange + school header | Yes (feature flag) |
| 10 | Enable new modules per school behind feature flags | Yes |

Exact execution steps, validation SQL and rollback are in `MIGRATION_PLAN.md`.

---

## 10. Backup, retention and privacy

- **Backups:** provider-native continuous backup + nightly logical dump, encrypted at rest, stored in a
  separate account/region. MySQL: `mysqldump --single-transaction --routines --triggers`. PostgreSQL:
  `pg_dump`/Supabase dashboard backup plus PITR where available.
- **Restore drill:** quarterly; documented RPO/RTO; a restore is not "done" until row counts and a
  sample report render are verified.
- **Retention:** academic records follow school/legal retention; audit logs are append-only; AI prompt
  logs should be minimised and access-restricted.
- **Privacy:** learner records, parent links and marks are confidential. Public RPCs must not become a
  back door. Follow Rwanda's data protection requirements and document the lawful basis for processing.
- **No production data in development.** Use synthetic fixtures for tests.

---

## 11. Open database decisions

1. Are `assessment_types`, `grading_scales` and `performance_comments` global templates or per-school?
2. Should `learner_code` be unique per school or globally? (Recommendation: per school.)
3. Does a teacher's phone number identify one person across schools? (Recommendation: identity-level,
   not school-level.)
4. Will student accounts share `auth.users` with staff, or use a separate auth domain? (Recommendation:
   same IdP, distinct roles and strict RLS.)
5. Is a future MySQL→PostgreSQL consolidation authorised? (Default: no.)
6. Which object storage is canonical for new files? (Recommendation: private Supabase Storage with
   signed URLs; migrate Cloudinary references later.)
