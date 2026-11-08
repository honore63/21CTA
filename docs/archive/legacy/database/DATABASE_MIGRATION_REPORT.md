# Database Migration Report

**Project:** 21CTA  
**Report type:** Initial static audit and migration readiness  
**Date:** 2026-11-08  
**Status:** Migration not started; production readiness not established

## 1. Executive result

The source tree supports a planned move to a single MySQL operational database, but does not contain the live database evidence needed to execute or certify it. No MySQL or PostgreSQL connection was opened, no database was backed up or restored, no application was started, and no data was migrated. The original PostgreSQL/Supabase system remains the authoritative RMS-MIS system until a future approved cutover.

The current work product is a source-based inventory and design baseline. It is not proof of deployed schema, production record counts, data integrity, password-hash exportability, or application parity.

## 2. Systems inspected

| System | Repository evidence | Observed architecture | Data evidence available |
|---|---|---|---|
| Lesson Plan Generator | `apps/lesson-planner`, plus frozen schema-only file under `database/reference/mysql/` | Express API + MySQL/MariaDB; custom bcrypt/JWT auth; runtime DDL | Sanitized schema-only snapshot. No live rows or current schema connection. Original source schema is known to contain sample/person-like records and is not treated as a production export. |
| RMS-MIS | `apps/marks`, plus 23 SQL files frozen under `database/reference/postgres/` | Browser Supabase client directly uses PostgreSQL, Supabase Auth, RLS, Storage and Realtime; Vercel PDF endpoint | SQL definitions and frontend call sites only. No live rows, Supabase Auth export, deployed policy/function inventory, or bucket configuration. |

## 3. Static inventory findings

### Lesson Plan Generator / MySQL

- The schema-only snapshot identifies database name `lessonplan_db`, MariaDB 10.4.32 at dump time, 12 base tables, and two views. The snapshot is source evidence, not a current-server version check.
- Core tables include `users`, `classes`, `subjects`, `class_subjects`, `units`, `lessons`, `lesson_plans`, `lesson_materials`, `teaching_materials`, `reference_materials`, `special_needs_learners`, and `ai_generation_logs`.
- Runtime setup and feature SQL add at least 14 table families, including chats, chat sessions, contact messages, subscriptions, visitors, system settings, agent tasks, syllabuses and children, teacher schedules, term settings, holidays, email queue, notifications, and user devices. Runtime DDL also alters existing tables; capture live state to resolve drift.
- The committed model uses integer IDs, a simple `admin`/`teacher` role, bcrypt password hashes, and free-text `school_name`; it does not supply a canonical tenant model.
- The active backend's normal database path is MySQL. The retained `archive/phase2-2026-11-08/server.js` file is explicitly a rollback snapshot; it is not the active application entry point and must not be restored.

### RMS-MIS / PostgreSQL and Supabase

- The source audit counts 37 application tables across the master and feature SQL sources. Principal families include users/teachers/learners, education levels, classes/subjects/assignments, academic years/terms, assessment types/assessments/marks, grading and comments, audit/import history, notifications/announcements/messages, documents, digital library metadata/AI usage/chunks, examinations/questions/attempts/answers, and school settings.
- `auth.users` and managed Supabase Auth sessions are external to the public application schema. The frontend creates Supabase sessions and uses them to access data.
- The master SQL includes PostgreSQL UUID extensions, JSONB, arrays, `TIMESTAMPTZ`, PL/pgSQL, `SECURITY DEFINER` functions, triggers, RLS and grants. The accumulated source was assessed as having more than 60 functions and well over 100 policy/trigger definitions; those counts are not verified against production.
- The browser calls PostgREST/RPC and Supabase Storage directly, and subscribes to Supabase Realtime. A backend API must replace database/Auth access, not simply translate SQL fragments.
- RMS-MIS has no `school_id` in the inspected source baseline. Existing DOS education-level scopes are not equivalent to school isolation.

## 4. Data, duplicates and identifiers

| Question | Current evidence/status |
|---|---|
| Production row counts and table sizes | Unknown; no live database access. |
| Duplicate identities / conflicting IDs | Not computed; no approved production export. Names/emails/codes must not be used for automatic merging. |
| MySQL integer IDs vs RMS UUIDs | Incompatible namespaces. Preserve both source identities through a source-system/table/id mapping; generate a destination key only when needed. |
| School ownership of legacy rows | Not safely inferable from MySQL free-text `school_name` or RMS single-school configuration. Requires owner-approved mapping and quarantine for ambiguity. |
| RMS Auth password hashes | Exportability and format are unverified. Do not assume hashes can be migrated. If unsupported, use verified password reset/invitation. |
| MySQL bcrypt hashes | Source code uses bcryptjs; compatibility may be possible but must be verified with controlled test vectors and approved credential-handling. Never log/export hashes into reports. |
| Files | Both systems reference external/local files. Object existence, access policies, and key mapping are not verified. Keep file migration separate from relational migration. |

## 5. Migration safety and blockers

Existing backup scripts are present in `infrastructure/backup/`, but their report says they have not been executed. Therefore there is no verified database backup or restore. The schema freeze manifest explicitly says that current MySQL and PostgreSQL schemas, Auth configuration, Storage policies and row counts remain uncaptured.

**Blocking gates before any migration write:**

1. Confirm ownership and obtain approved, least-privilege inventory/backup access.
2. Capture and checksum full logical backups for both sources; restore each to isolated scratch environments and compare all table counts.
3. Capture live DDL, deployed routines/triggers/policies, Auth configuration, Storage bucket policies, object inventory, row counts, table sizes, and current app/deployment SHAs.
4. Produce reviewed duplicate/conflict and school-assignment reports using protected exports.
5. Approve the target schema, mapping rules, excluded/quarantined records, account reset plan, and retention requirements.
6. Implement and test a staging-only migration runner with dry run, resumable checkpoints, mapping ledger, row-level exception handling and reconciliation outputs.

## 6. Migration script status

No production migration script was generated or run in this audit. That is intentional: the target has not been built or tested against a live source catalog, and the current application has schema drift. A script written against only frozen SQL could omit deployed columns, tables, data transformations, Auth identities, or relationships and falsely report success.

The first migration runner should be implemented after the live inventory is captured. It must refuse production endpoints by default, require an explicit staging target, support dry-run, never issue DROP/TRUNCATE, preserve source data, and write durable source-to-target ID mappings and per-table reconciliation results. Production mode must require a separate owner-approved release and an explicit confirmation gate.

## 7. Readiness scorecard

| Requirement | Result |
|---|---|
| Source code/schema audit | Complete for available snapshots; live verification pending. |
| Four requested architecture/mapping/report/schema documents | Created as the initial audit/design package. |
| Full backups and restore verification | Not done; scripts exist but were not executed. |
| Live table/relationship/data inventory | Not done; credentials/access unavailable. |
| Duplicate/conflicting identifier analysis | Not done; requires protected live exports. |
| MySQL target schema implementation | Design documented; no production DDL applied. |
| Data migration script | Not yet safe to generate; blocked on live inventory and approved mapping. |
| Staging migration and business verification | Not done; no staging database or sanitized dataset provided. |
| Unified authentication/backend/API | Not implemented; RMS-MIS still depends on Supabase. |
| Traffic switch or database decommission | Not performed; requires explicit approval. |

## 8. Conclusion

The MySQL-only target is established as the architecture direction, not as a completed migration. Source-level evidence is enough to define the conversion strategy and the next gates; it is not enough to assert that all live records, Auth accounts, functions, policies, or files have been migrated. Keep both existing databases and current service paths intact until staging reconciliation is signed off and production cutover is explicitly approved.
