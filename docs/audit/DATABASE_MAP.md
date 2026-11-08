# 21CTA — Database Map and Ownership

Principle: **no database is replaced in the initial integration.** MySQL keeps owning lesson-planning data. PostgreSQL (Supabase) owns RMS-MIS data, platform identity, schools and every new module. Cross-database references are stored as plain IDs. There are no cross-database foreign keys.

## 1. Ownership matrix
| Domain | Owner DB | Notes |
|---|---|---|
| Identity (auth accounts, sessions, MFA) | **Postgres – Supabase Auth (`auth.users`)** | Single identity provider for 21CTA |
| Platform profile, roles, schools, memberships | **Postgres (`public`)** | `public.users` (existing) + new `schools`, `school_memberships` |
| Lesson planning (classes, units, lessons, plans, syllabuses, schedules, AI logs, chats, subscriptions) | **MySQL `lessonplan_db`** | Unchanged. New `identity_links` and nullable `school_id` (additive) |
| Marks, assessments, learners, reports, exams, library, communication | **Postgres (`public`)** | Existing RMS-MIS schema. `school_id` added in Phase 4 |
| New modules: class diary, attendance, timetable, CPD, portfolio, analytics | **Postgres** | New tables, `school_id NOT NULL`, RLS from day one |
| Files | Cloudinary / disk (LPG). Supabase Storage (RMS) | Consolidating to Storage is optional and later |

## 2. MySQL — `lessonplan_db` (System A)
Source: `database/schema.sql` (MariaDB 10.4 dump) plus runtime DDL in `config/database.js`, `server.js` and `migrations/*.sql`.

| Table | Key columns | Relationships |
|---|---|---|
| `users` | id INT PK, full_name, email UNIQUE, phone_number UNIQUE, password_hash NULL, google_id UNIQUE, role ENUM(admin,teacher), school_name (text), is_suspended, fingerprint, last_ip, reset_password_token/expires | — |
| `user_devices` | user_id, fingerprint, ip_address, last_login | → users |
| `classes` | id, **teacher_id**, name, class_size, academic_year | → users (CASCADE) |
| `subjects` | id, name, code, is_custom, created_by | created_by → users (SET NULL) |
| `class_subjects` | id, class_id, subject_id | → classes, subjects (CASCADE) |
| `units` | id, class_subject_id, unit_number, unit_title, key_competences | → class_subjects (CASCADE) |
| `lessons` | id, unit_id, lesson_number, lesson_title, duration, teaching_date, term, location, school_name, teacher_name, class_size, is_completed, teacher_reflection | → units (CASCADE) |
| `lesson_plans` | id, lesson_id, content LONGTEXT(JSON), version, generated_by_ai, ai_provider | → lessons (CASCADE) |
| `ai_generation_logs` | lesson_plan_id, prompt_used, ai_provider, tokens_used | → lesson_plans |
| `special_needs_learners` | lesson_id, … | → lessons |
| `reference_materials`, `lesson_materials`, `teaching_materials` | teacher_id / uploaded_by, subject_id, file data | → users, subjects, lessons |
| `syllabuses`, `syllabus_units`, `syllabus_lessons` | subject_name, grade_level, structured data | runtime-created |
| `teacher_schedules`, `term_settings`, `holidays` | class_subject_id, dates | runtime-created |
| `chat_sessions`, `chats` | user_id, session_id | runtime-created |
| `notifications`, `contact_messages`, `visitors`, `system_settings`, `agent_tasks`, `subscriptions` | — | runtime-created |
| Views | `v_lesson_plans_overview`, `v_teacher_classes` | — |

Observations
* The ownership chain is `users → classes → class_subjects → units → lessons → lesson_plans`, and every link uses **ON DELETE CASCADE**. Deleting a user deletes all of their plans.
* There is no school entity. `school_name` is duplicated on `users` and `lessons`.
* The schema is created and changed at runtime on every boot, and there is a destructive fallback (SYSTEM_AUDIT §7.1). No migration ledger exists.

## 3. PostgreSQL — Supabase `public` (System B)
Master: `backend/sql/database.sql`. It is extended by `examination_centre.sql`, `digital_library.sql`, `principal_parent_upgrade.sql`, `parent_student_marks_portal.sql`, `class_teacher_access.sql` and others. Every script is applied by hand.

| Group | Tables |
|---|---|
| Accounts | `users` (id UUID = `auth.users.id`, email, role, status, education_level, must_change_password, learner_id†), `teachers` (user_id → users, teacher_code 11 digits), `teacher_registration_audit` |
| Academic structure | `academic_years`, `terms`, `education_levels`, `classes`, `subjects`, `class_subjects`, `teacher_assignments` (teacher, class, subject, year, term) |
| Learners | `learners` (learner_code UNIQUE, class_id, academic_year_id) |
| Assessment | `assessment_types`, `assessments`, `marks`, `grading_scales`, `performance_comments`, `import_history` |
| Communication | `notifications`, `announcements`, `announcement_acknowledgements`, `messages`, `message_attachments`, `email_notifications`, `sms_notifications` |
| Library | `documents`, `digital_library_resources`, `digital_library_settings`, `digital_library_ai_chunks`, `digital_library_ai_usage` |
| Examination centre | `examinations`, `examination_classes`, `question_bank`, `exam_questions`, `exam_attempts`, `student_answers` |
| School / audit | `school_settings` (singleton), `audit_logs` |
| Storage buckets | `documents`, `digital-library`, `examination-media`, `message-attachments`, `profile-photos` |

† added by upgrade scripts. About 250 RLS policies plus SECURITY DEFINER helpers enforce role, education-level and assignment scope. **No policy or table references a school.**

## 4. Overlapping entities (not merged in the initial phases)
| Concept | MySQL | Postgres | Link strategy |
|---|---|---|---|
| Person | `users.id INT` | `auth.users.id UUID` / `public.users.id` | `identity_links` (see §5) |
| School | `users.school_name` text | `school_settings` row | `schools.id` UUID. MySQL `users.school_id CHAR(36) NULL` |
| Class | teacher's planning class | official school class | optional `classes.rms_class_id CHAR(36) NULL` (later) |
| Subject | global + custom | school catalogue by level | optional `subjects.rms_subject_id CHAR(36) NULL` (later) |
| Notification | `notifications` | `notifications` | unified read API, no data merge |

## 5. New platform tables (proposed, additive)
Postgres:
```sql
schools(id uuid pk, name, code unique, district, sector, level, status, settings jsonb, created_at)
school_memberships(user_id uuid → auth.users, school_id → schools, role text, status, primary key(user_id, school_id, role))
platform_admins(user_id uuid pk → auth.users, scope text)          -- super / national admins
module_settings(school_id, module_key, enabled bool, config jsonb)
platform_audit_log(id, actor_id, school_id, action, entity, entity_id, at, meta jsonb)
```
MySQL (additive only):
```sql
identity_links(mysql_user_id INT PK → users.id, supabase_user_id CHAR(36) UNIQUE NOT NULL, linked_at, link_method)
ALTER TABLE users ADD COLUMN school_id CHAR(36) NULL;   -- Phase 4
```
