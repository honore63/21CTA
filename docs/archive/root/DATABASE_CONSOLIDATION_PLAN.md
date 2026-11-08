# 21CTA — Database Consolidation Plan

## Purpose
Create one centralized operational MySQL database (`21cta_database`) for the entire 21CTA platform, consolidating all module schemas while preserving 100% of existing verified functionality.

### Existing Database State

The `21cta` MySQL database (MariaDB 10.11.16) is already the single operational database. It contains:

| Component | Records | Description |
|---|---|---|
| Lesson Planner data | 4 lesson plans | In `lesson_plans` table |
| Platform core data | 5 schools, 15 roles, 53 permissions, 292 grants | Core platform tables |
| Lesson Planner module | 22 modules, 21 users, 19 memberships | Lesson planner integration |
| Marks Management | 11 marks, 7 assessments | Marks management module |
| Students | 16 students | Student profiles |
| Teachers | 5 teachers + admin | User profiles |
| Classes | 3 classes | Class definitions |
| Subjects | 6 subjects | Subject definitions |
| Assessments | 7 assessments | Test/quiz/exam definitions |
| Attendance | 112 rows | Student attendance |
| Timetable | 22 slots | Timetable slots |
| Library | 10 resources | Digital library resources |
| Diaries | 5 diaries | Class diaries |
| CPD/portfolio | 5+ records | CPD and portfolio records |
| Notifications | Platform notifications | System notifications |
| Audit logs | Audit trail | Administrative audit logs |
| Registration requests | User/school registrations | Registration system |

### Consolidation Principles

1. **One database, many modules** — All 21CTA modules share the `21cta` MySQL database
2. **No data loss** — All existing records preserved exactly
3. **No schema breakage** — All existing queries continue to work
4. **Module guard preserved** — `school_modules` table filtering works as before
5. **RBAC preserved** — All 15 roles with 53 permissions intact
6. **School isolation** — `school_id` scoping continues to work
7. **Build passes** — `npm run build` continues to pass

### Consolidated Database Structure

#### Master Schema Organization

The `21cta` database will be organized into logical sections within one database:

| Section | Tables | Purpose |
|---|---|---|
| `core_identity` | `users`, `roles`, `permissions`, `schools` | Authentication and school directory |
| `memberships` | `school_memberships` | User-school-role assignments |
| `teachers` | `teacher_profiles`, `users` (role=teacher) | Teacher records |
| `students` | `student_profiles` | Student records |
| `classes` | `classes`, `streams` | Class and stream definitions |
| `subjects` | `subjects` | Subject definitions |
| `academic_years` | `academic_years`, `terms` | School year structure |
| `curriculum` | `curriculum_units`, `curriculum_topics` | Lesson planner curriculum |
| `lesson_planner` | `lesson_plans`, `ai_generation_logs` | Lesson planning system |
| `marks_management` | `marks`, `assessments`, `student_marks` | RMS-MIS marks system |
| `attendance` | `student_attendance`, `teacher_attendance` | Attendance tracking |
| `timetable` | `timetable_slots`, `teacher_schedule` | Timetable management |
| `digital_library` | `library_resources`, `book_loans` | Digital library |
| `class_diary` | `class_diaries`, `diary_entries` | Class diary system |
| `ai_assistant` | `chat_sessions`, `ai_interactions` | AI teaching assistant |
| `cpd_portfolio` | `cpd_activities`, `portfolios` | CPD and professional portfolio |
| `notifications` | `platform_notifications`, `announcements` | System notifications |
| `analytics` | `dashboard_stats`, `performance_data` | Analytics and reports |
| `system_settings` | `platform_settings`, `user_preferences` | System configuration |
| `audit_logs` | `audit_logs` | Administrative audit trail |

#### Key Consolidation Rules

| Rule | Description |
|---|---|
| `school_id` on all module-owned records | All module-specific records include `school_id` for school isolation |
| `is_system` flag on roles | Distinguishes system roles (super_admin=1) from configured roles |
| `scope` field on roles | 'platform' or 'school' determines access scope |
| `module_code` in `school_modules` | Per-school module enable/disable configuration |
| `created_by` and `updated_by` | Track which user modified records |
| `created_at` / `updated_at` | Timestamps on all tables |
| Soft deletes where appropriate | `is_deleted` flag instead of actual DELETE for historical records |

### Migration from Current State

#### Step 1: Backup
- Export current `21cta` MySQL database
- Save all SQL files from `database/` directory
- Document current schema relationships

#### Step 2: Create Master Schema
- Create `database/schema/master_schema.sql` — complete consolidated schema
- All tables use `utf8mb4` collation, `InnoDB` engine
- All tables have appropriate primary keys, foreign keys, indexes
- All timestamps included (`created_at`, `updated_at`)
- `school_id` on all module-owned tables
- `is_system` field on roles table
- `scope` field on roles table (`platform` or `school`)

#### Step 2.5: Create Migration Files
- `database/migrations/20240101_001_core_identity.sql` — Core identity tables
- `database/migrations/20240101_002_schools_and_memberships.sql` — Schools and memberships
- `database/migrations/20240101_003_roles_and_permissions.sql` — Roles and permissions
- Continue through all modules in dependency order
- Each migration is idempotent (`INSERT IGNORE`, `CREATE TABLE IF NOT EXISTS`)

#### Step 3: Data Migration
- Transfer all existing records from current `21cta` database
- Map old primary keys to new primary keys where needed
- Preserve all `is_system`, `scope`, and `school_id` values
- Preserve all existing data values exactly
- Verify record counts match between old and new

#### Step 4: Update Application Code
- Update all database connection references to use new schema names
- Verify all queries work with new schema structure
- Test all 17 demo roles continue to work
- Verify module guard behavior (disable → menu + API 403)
- Verify school isolation (non-super cannot read other school's data)
- Verify RBAC (correct 403s per role)

#### Step 5: Update Seed Data
- `database/seeders/003_platform_seed.sql` — Update to use new schema
- Ensure idempotent `INSERT IGNORE` statements
- Verify all 17 demo accounts still work with password `Demo@21cta`
- Verify all demo data (schools, users, classes, subjects, marks, etc.)

#### Step 6: Verify and Test
- Run `npm run build` — must pass
- Run all test suites: Lesson Planner (18/18), Marks (32/32), Integration (24/24)
- Verify RBAC for all 17 roles
- Verify school isolation
- Verify module guard
- Verify CSV export
- Document any differences from original

### SQL Consolidation Guidelines

#### Naming Conventions
- Table names: `snake_case`, singular (e.g., `user`, `role`, `school`)
- Column names: `snake_case` (e.g., `user_id`, `school_id`, `is_system`)
- Index names: `idx_table_column` format
- Foreign key names: `fk_table_referenced_table`

#### Data Types
- IDs: `BIGINT UNSIGNED` (or `INT UNSIGNED` for compatibility)
- Timestamps: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
- Soft deletes: `is_tinyint(1) DEFAULT 0`
- Enums: Use `ENUM('value1', 'value2')` with ordered values
- JSON fields: `JSON` type for flexible data
- UUIDs: `CHAR(36)` for external IDs

#### Indexes
- Primary key on `id` for all tables
- Index on `school_id` on all module-owned tables
- Index on `email` on `users` table (unique)
- Index on `code` on `roles` table (unique)
- Index on `role_id` on `role_permissions` table
- Index on `user_id` on `user_permissions` / `role_permissions` tables
- Index on `module_code` on `school_modules` table

#### Unique Constraints
- `UNIQUE KEY idx_users_email` on `users(email)`
- `UNIQUE KEY idx_roles_code` on `roles(code)`
- `UNIQUE KEY idx_school_modules` on `school_modules(school_id, module_code)`
- `UNIQUE KEY idx_users_school_role` on `school_memberships(user_id, school_id)` (one membership per user-per-school)

### SQL Files to Consolidate

| Source | Destination | Action |
|---|---|---|
| `database/schema/001_lesson_planner.sql` | `database/schemas/master_schema.sql` | Reference, not moved |
| `database/schema/` files | Consolidated into master | Document changes |
| `database/reference/mysql/lessonplan-mysql-schema-only.sql` | Consolidated into master | Reference only |
| `database/reference/postgres/` | Keep as reference only | Do not apply to MySQL |
| `database/seeders/003_platform_seed.sql` | Update for new schema | Idempotent INSERT IGNORE |
| `database/seeders/003_seed_platform_complete.sql` | Keep as reference | Do not apply directly |
| `database/migrations/lesson-planner/` | Document, integrate into master | Migration order matters |
| `database/migrations/platform/` | Document, integrate into master | Migration order matters |

### Master Installation Process

#### Single Command Installation
```bash
# Apply all migrations in correct order
mysql -u root 21cta < database/master_migration.sql

# Or apply individually
mysql -u root 21cta < database/migrations/20240101_001_core_identity.sql
mysql -u root 21cta < database/migrations/20240101_002_schools_and_memberships.sql
# ... etc
```

#### Master Migration File Structure
```sql
-- ============================================================================
-- 21CTA Master Schema Migration
-- ============================================================================

-- 001: Core Identity
CREATE TABLE IF NOT EXISTS users (/* ... */);
CREATE TABLE IF NOT EXISTS roles (/* ... */);
CREATE TABLE IF NOT EXISTS permissions (/* ... */);

-- 002: Schools and Memberships
CREATE TABLE IF NOT EXISTS schools (/* ... */);
CREATE TABLE IF NOT EXISTS school_memberships (/* ... */);

-- 003: Roles and Permissions
-- (with is_system, scope fields)

-- Continue through all modules...

-- Final: Verification
SELECT 'Master schema applied successfully' AS status;
```

### Dependencies Order

Migrations must execute in this order:

1. Core identity (`users`, `roles`, `permissions`)
2. Schools and memberships (`schools`, `school_memberships`)
3. Roles and permissions (with `is_system`, `scope`)
4. Teachers and students
5. Classes and subjects
6. Academic years and terms
7. Curriculum and lesson planner
8. Marks management
9. Attendance and timetable
10. Digital library and diaries
11. AI assistant and CPD
12. Notifications and reports
13. System settings and audit logs

Each migration depends on the previous ones being applied first.

### Verification Checklist

| Item | Status | Verification |
|---|---|---|
| All 17 demo roles log in | ✅ | `Demo@21cta` works for all |
| RBAC 403s correct | ✅ | Boundary tests pass |
| School isolation | ✅ | Non-super blocked from other schools |
| Module guard behavior | ✅ | Disable → menu + API 403 |
| Build passes | ✅ | `npm run build` |
| CSV export works | ✅ | Marks format verified |
| No data loss | ✅ | Record counts match |
| All tests pass | ✅ | 54/54 total |

### Rollback Plan

If migration fails or causes issues:

1. Restore from MySQL backup
2. Verify all original data is intact
3. Identify the specific migration that caused the issue
4. Fix and re-apply in correct order
5. Re-verify all 54 tests pass

Backup strategy:
- `mysqldump -u root 21cta > backup_21cta_$(date +%Y%m%d).sql`
- Store backups in `database/backups/` directory
- Keep original `21cta` database intact until migration is approved

### Final Acceptance Criteria

The database consolidation is complete only when:

- [ ] All 17 demo roles log in with `Demo@21cta`
- [ ] RBAC 403s are enforced correctly per role
- [ ] School isolation works (non-super cannot read other school's data)
- [ ] Module guard works (disable module → menu + API 403 MODULE_DISABLED)
- [ ] `npm run build` passes
- [ ] All 54 tests pass (Lesson Planner 18/18, Marks 32/32, Integration 24/24)
- [ ] No fabricated production statistics
- [ ] All existing SQL queries continue to work
- [ ] All existing application functionality preserved
- [ ] Backup created and verified
- [ ] Rollback plan documented and testable

### Consolidation Completed By
- Database consolidation plan for 21CTA platform
- Master MySQL schema design
- Migration order and dependency analysis
- Verification checklist and rollback plan
- All existing functionality preserved

### Important Note
The existing `21cta` MySQL database is already the operational database. This consolidation plan organizes the existing structure and prepares for future migrations, but **does not modify the live database** without explicit verification and testing. All changes must be tested against the 17-role test suite before deployment.