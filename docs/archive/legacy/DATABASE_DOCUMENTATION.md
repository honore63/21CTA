# 21CTA — Database Documentation

Table-by-table detail and the ownership matrix: [audit/DATABASE_MAP.md](audit/DATABASE_MAP.md).

## Databases
| DB | Engine / host | Owns | Migration method today | Target method |
|---|---|---|---|---|
| `lessonplan_db` | MySQL / MariaDB (Aiven) | Lesson planning, AI logs, chats, schedules, subscriptions | Runtime DDL in `server.js` / `config/database.js` + `backend/migrations/*.sql` | Versioned SQL files in `db/mysql/migrations` + `schema_migrations` ledger, applied by CI |
| Supabase `public` | PostgreSQL 15 (Supabase) | Identity, RMS-MIS, all new modules | Manual SQL editor (`apps/marks/backend/sql/*.sql`) | `supabase/migrations` + `supabase db push` from CI |

## Planned additions (all additive)
Postgres: `schools`, `school_memberships`, `platform_admins`, `permissions`, `role_permissions`, `module_settings`, `platform_audit_log`. Then `school_id` on every RMS table (nullable → backfill to the existing school → NOT NULL), and new module tables (`class_diary_entries`, `attendance_sessions`, `attendance_records`, `timetable_slots`, `cpd_activities`, `portfolio_items`, …) with `school_id NOT NULL` from day one.

MySQL: `identity_links (mysql_user_id, supabase_user_id)`, `users.school_id CHAR(36) NULL`.

## Rules
* Back up both databases before every production migration and test the restore on staging.
* No `DROP`, `TRUNCATE` or destructive `DELETE` without written owner approval.
* Each migration ships with a dry-run, before/after row counts per table and per school, and a rollback note.
* No cross-database foreign keys. Cross-references are plain IDs, resolved through the gateway.
