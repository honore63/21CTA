# PostgreSQL to MySQL Mapping

**Project:** 21CTA  
**Scope:** RMS-MIS PostgreSQL/Supabase objects and cross-system identifiers  
**Status:** Static source mapping; live schema and data not inspected  
**Date:** 2026-11-08

## 1. Source evidence and limits

The source baseline is the 23-file SQL freeze described in [`FREEZE_MANIFEST.md`](FREEZE_MANIFEST.md), principally `database/reference/postgres/database.sql`, `digital_library.sql`, `examination_centre.sql`, and their incremental fixes. The prior source audit counted 37 RMS tables across master and feature SQL and more than 60 functions with well over 100 policy/trigger definitions across the accumulated SQL. These are repository-source counts, not a claim about the deployed Supabase project. Live migrations may be missing, applied differently, or contain extra objects.

The MySQL destination begins with the existing Lesson Plan Generator database (`lessonplan_db` in the committed schema snapshot). That snapshot has 12 base tables and two views; runtime DDL adds at least 14 more tables and alters existing tables. The live MySQL schema must be captured before a migration is designed.

No production row counts, duplicate counts, credentials, or record-level mappings are available in this workspace. Do not interpret SQL seed rows or a schema-only file as a production data export.

## 2. Object-family mapping

| PostgreSQL/Supabase source | MySQL destination / treatment | Notes and conversion work |
|---|---|---|
| `auth.users` and Auth sessions | `users`, `auth_credentials`, `auth_sessions`, `password_reset_tokens`, optional `user_mfa_factors` | Do not copy Supabase internals. Export supported identities through an approved method. If password hashes cannot be exported or validated for secure reuse, require verified reset/invitation. Never migrate access/refresh tokens. |
| `public.users` | Central `users` profile plus `school_memberships` | Preserve source UUID in `legacy_id_map`; split credentials from profile. Explicitly map `dos`, `teacher`, `headteacher`; do not infer `parent` or elevated roles. |
| `teachers`, `learners` | `teachers`, `students` (or `learners`, if API vocabulary requires it) | Keep person/profile records separate from login identities. Add approved `school_id`; preserve teacher/learner codes and school-scoped uniqueness. |
| `schools` and `school_settings` | `schools`, `school_settings` | Current RMS schema is effectively single-school. Create approved canonical school IDs; settings become one row per school. Do not generate school mappings from display names without review. |
| `education_levels` | `education_levels` global reference, or school-scoped reference if governance requires | Retain stable codes. Preserve existing Primary/Secondary distinctions; these are not tenant IDs. |
| `academic_years`, `terms` | `academic_years`, `terms` | Convert global uniqueness/current-year rules to `(school_id, name)` and one current year per school. Ensure terms reference an academic year in the same school. |
| `classes`, `subjects`, `class_subjects`, `teacher_assignments` | Equivalent academic structure tables | Add `school_id`; replace global catalogue uniqueness where needed; enforce composite same-school FKs. Preserve class/teacher assignment semantics. |
| `assessment_types`, `assessments`, `marks` | `assessment_types`, `assessments`, `marks` | Preserve max marks, weights, period metadata, original/normalized values, statuses, and unique `(assessment_id, learner_id)`. Verify marks calculations against existing tests and reports. |
| `grading_scales`, `performance_comments` | Equivalent school-aware grading tables | Convert checks and uniqueness deliberately; preserve grading boundaries and ordering. Test boundary percentages and rounding. |
| `audit_logs`, `import_history`, registration audit | `audit_logs`, `import_jobs`, `identity_events` or equivalent | Preserve timestamps/actors and immutable history. Redact secrets and avoid changing original event meaning. Add `school_id` where an event is school-owned. |
| `notifications`, announcements, acknowledgements, messages, attachments, email/SMS queues | Notifications and communication tables | Convert `UUID[]` target lists to relationship tables. Preserve delivery state/idempotency and acknowledgements. File bytes remain in object storage unless separately migrated. |
| `digital_library_resources`, settings, AI usage, chunks | `library_resources`, settings, usage, chunks | Preserve metadata, ownership, visibility and search payload. Keep storage keys as opaque references until a separately tested storage migration. Reimplement signed access through a trusted API/storage adapter. |
| `examinations`, `examination_classes`, questions, question bank, attempts, student answers | Equivalent examination tables | Preserve attempt lifecycle, guest-attempt controls, scoring settings, ordering, answers and timestamps. Convert lifecycle RPC behavior to transactional backend service methods. |
| `documents` and Storage objects/buckets | `documents` metadata plus selected object storage | Do not move binary objects as part of relational import. Inventory bucket policies and object keys; replace access controls before removing Supabase Storage. |
| `pg_cron`, Realtime publication/subscriptions | Backend scheduler/worker and WebSocket/event service | Preserve schedules and event contracts. Events must be emitted after committed transactions, preferably through an outbox table. |
| Views and report queries | MySQL views where simple, otherwise API/report repositories | Rebuild and compare result sets. Avoid encoding authorization only in views. |
| SQL functions, triggers, `SECURITY DEFINER` routines | Backend domain services + transactions; limited MySQL triggers only for invariant enforcement | Every routine needs a behavior/test mapping. Authorization logic belongs in centralized backend policy checks, not ad hoc client replacements. |
| RLS policies and grants | Backend RBAC/tenant authorization and least-privilege DB accounts | Translate policy intent, not policy syntax. Require school-scope predicates on every path and test deny cases. A DB account must not be used by browser clients. |

## 3. Data-type and SQL conversion rules

| PostgreSQL construct | MySQL strategy | Review point |
|---|---|---|
| `uuid` | Initially `CHAR(36)` using ASCII/binary collation; optional later `BINARY(16)` after API and tooling compatibility tests | Preserve source UUID in a source mapping. No lossy casts or regenerated IDs without mapping. |
| `uuid_generate_v4()`, `gen_random_uuid()` | Generate IDs in the backend using a standard UUID library; optionally use MySQL UUID functions only after format tests | One consistent ID format across API, imports and FKs. |
| `text`, `varchar` | `VARCHAR(n)` where bounded; `TEXT`/`MEDIUMTEXT`/`LONGTEXT` for actual long content | Check index lengths, Unicode and truncation before moving. |
| `boolean` | `TINYINT(1)` with explicit `NOT NULL` and `CHECK` where supported | Normalize existing NULL/boolean values explicitly. |
| `integer`, `bigint` | `INT`, `BIGINT` with signedness chosen from observed ranges | Preserve overflow safety; source is authoritative for range. |
| `numeric(p,s)` | `DECIMAL(p,s)` | Do not use FLOAT for marks, weights, grades or currency-like values. Preserve scale and rounding rules. |
| `timestamptz` | `DATETIME(6)` stored in UTC; serialize with explicit UTC offset at API edges | Normalize timestamps and test daylight-saving/legacy timezone assumptions. |
| `jsonb` | MySQL `JSON` for opaque structured payloads; normalize searchable/referential arrays into child tables | Validate JSON, preserve numeric/string distinctions, and avoid using JSON for relational joins. |
| PostgreSQL arrays such as `UUID[]` | Junction table with FK, order column if order matters | Examples: announcement recipient users, frozen roster IDs. |
| enums and `CHECK` constraints | Prefer lookup/reference tables for managed vocabularies; otherwise `VARCHAR` plus supported `CHECK` constraints | MySQL enforces CHECK starting with 8.0.16; verify actual server version. |
| Partial unique indexes | Generated nullable key columns or transactionally enforced scoped uniqueness | Example: one current academic year per school. Test concurrent updates. |
| `ON CONFLICT` | `INSERT ... ON DUPLICATE KEY UPDATE` only where semantics match; otherwise explicit locked transaction | Do not silently overwrite imported records. |
| `RETURNING` | Use driver insert ID or a tested follow-up query | UUID IDs are generated by the API, not inferred from auto-increment IDs. |
| `ILIKE` | Appropriate case-insensitive collation or `LOWER()` comparisons | Verify Unicode and exact identifier comparison behavior. |
| `NOW()` / intervals | `CURRENT_TIMESTAMP(6)` and MySQL interval syntax | Set connections to UTC; preserve expiry inclusivity semantics. |
| PL/pgSQL blocks / exception behavior | Backend code with explicit transaction and typed error handling | Map each exception/rollback behavior; do not mechanically translate procedural SQL. |

## 4. Authorization translation requirements

- Model platform-wide and school-scoped roles separately. Membership state and school selection are checked on every request.
- Enforce `school_id` in repository queries for reads, writes, nested relations, bulk operations, exports, search, jobs, and WebSocket subscriptions.
- For school-owned relationships, use composite keys such as `UNIQUE (school_id, id)` and composite foreign keys `(school_id, parent_id)` where practical so a row cannot point across schools.
- Apply deny-by-default permission checks for super administrator, school administrator, headteacher, DOS, teacher, student, and parent. Parent access requires an approved parent-student relationship.
- Recreate important invariants formerly enforced by RLS helper functions and triggers in one backend policy/domain layer. Database constraints remain a second line of defense.
- Test same-school allowed access and cross-school denied access for each role and every exposed object identifier. Include unauthenticated, suspended, revoked membership, missing-school, and multi-school users.

## 5. Identifier and conflict policy

Use `legacy_id_map(source_system, source_table, source_id, target_table, target_id, mapping_status, source_checksum, migrated_at)` with a unique key on `(source_system, source_table, source_id)`. Keep source IDs and target IDs distinct. Resolve collisions by assigning a new target ID and recording the mapping; never rewrite references without a transaction and reconciliation entry.

Duplicate candidates should be reported using normalized email, phone and school-scoped codes, but no duplicate should be merged automatically. Record `keep_separate`, `verified_merge`, `quarantined`, or `approved_exclusion` with an operator and evidence. Maintain unique constraints only after duplicates have been reviewed.

## 6. Behavior mapping deliverable still required

Before implementation, generate a live catalog listing every deployed table, view, index, FK, trigger, function, policy, Auth setting, bucket, and scheduled job with source definition/checksum and referenced application call sites. Map each executable function/policy to a backend service method and automated test. The frozen SQL is a baseline only; this live catalog is not present yet.
