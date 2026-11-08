-- ============================================================================
-- 21CTA platform - DEVELOPMENT demo reset (DESTRUCTIVE)
-- ----------------------------------------------------------------------------
-- Removes ONLY the platform/demo data created by 003_platform_seed.sql.
-- Existing lesson-planner data (users, classes, subjects, lessons, units,
-- class_subjects, lesson_plans, teacher_schedules) is preserved.
--
-- DO NOT RUN THIS AGAINST PRODUCTION.
-- Usage (local development only):
--   mysql -u root 21cta < database/seeders/dev/004_reset_demo.sql
-- Then re-run:
--   mysql -u root 21cta < database/seeders/003_platform_seed.sql
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE school_settings;
TRUNCATE TABLE platform_settings;
TRUNCATE TABLE school_modules;
TRUNCATE TABLE modules;
TRUNCATE TABLE generated_reports;
TRUNCATE TABLE registration_requests;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE platform_notifications;
TRUNCATE TABLE announcements;
TRUNCATE TABLE professional_portfolios;
TRUNCATE TABLE cpd_enrollments;
TRUNCATE TABLE cpd_activities;
TRUNCATE TABLE class_diaries;
TRUNCATE TABLE library_loans;
TRUNCATE TABLE library_resources;
TRUNCATE TABLE timetable_slots;
TRUNCATE TABLE teacher_attendance;
TRUNCATE TABLE student_attendance;
TRUNCATE TABLE marks;
TRUNCATE TABLE assessment_submissions;
TRUNCATE TABLE assessment_questions;
TRUNCATE TABLE assessments;
TRUNCATE TABLE parent_student_links;
TRUNCATE TABLE parent_profiles;
TRUNCATE TABLE student_profiles;
TRUNCATE TABLE teacher_profiles;
TRUNCATE TABLE terms;
TRUNCATE TABLE academic_years;
TRUNCATE TABLE school_memberships;
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE permissions;
TRUNCATE TABLE roles;
TRUNCATE TABLE schools;

-- Remove the seeded demo accounts only. Real lesson-planner accounts
-- (admin@example.invalid, teacher1@..., admin2@..., teacher2@...) are kept.
DELETE FROM users WHERE email LIKE '%@demo.21cta.rw';

SET FOREIGN_KEY_CHECKS = 1;
