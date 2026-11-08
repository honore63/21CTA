-- ============================================================================
-- 21CTA UNIFIED PLATFORM COMPLETE SEED SCRIPT
-- Database: 21cta
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Schools
-- ----------------------------------------------------------------------------
INSERT INTO schools (id, name, code, school_type, ownership, district, province, sector, address, phone, email, status, subscription_plan, max_users)
VALUES
(1, 'GS Busanza', 'GS_BUSANZA', 'secondary', 'public', 'Kicukiro', 'City of Kigali', 'Kanombe', 'Busanza Sector, Kicukiro', '+250788100001', 'info@gsbusanza.rw', 'active', 'enterprise', 1500),
(2, 'GS Kayonza Modern', 'GS_KAYONZA', 'secondary', 'government_aided', 'Kayonza', 'Eastern Province', 'Mukarange', 'Kayonza Center', '+250788100002', 'contact@gskayonza.rw', 'active', 'standard', 1000),
(3, 'Rukara Model School', 'RUKARA_MODEL', 'combined', 'public', 'Kayonza', 'Eastern Province', 'Rukara', 'Rukara Campus', '+250788100003', 'head@rukaramodel.rw', 'active', 'standard', 800),
(4, 'College Saint Andre', 'CSA_KIGALI', 'secondary', 'faith_based', 'Nyarugenge', 'City of Kigali', 'Nyamirambo', 'Nyamirambo, Kigali', '+250788100004', 'info@collegestandrekigali.rw', 'active', 'enterprise', 2000),
(5, 'GS Remera Protestant', 'GS_REMERA', 'combined', 'government_aided', 'Gasabo', 'City of Kigali', 'Remera', 'Remera, Gasabo', '+250788100005', 'admin@gsremera.rw', 'active', 'standard', 1200)
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status);

-- ----------------------------------------------------------------------------
-- 2. Roles
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, code, name, description, scope, is_system, level)
VALUES
(1, 'super_admin', 'Super Administrator', 'National and platform-wide administrator with full system authority', 'platform', 1, 100),
(2, 'school_admin', 'School Administrator', 'Institutional administrator managing school operations, staff, and setup', 'school', 1, 80),
(3, 'headteacher', 'Headteacher / Principal', 'Executive school leader overseeing academic performance, reports, and governance', 'school', 1, 70),
(4, 'dos', 'Director of Studies (DOS)', 'Academic dean overseeing curriculum, timetables, lesson plans, and marks approvals', 'school', 1, 60),
(5, 'teacher', 'Teacher', 'Educator managing classes, generating lesson plans, entering marks, recording attendance', 'school', 1, 40),
(6, 'student', 'Student', 'Learner accessing assessments, timetables, library materials, and grades', 'school', 1, 10),
(7, 'parent', 'Parent / Guardian', 'Parent monitoring children academic performance, attendance, and school notices', 'school', 1, 10),
(8, 'librarian', 'Librarian', 'Resource manager handling library catalog, digital uploads, and borrowing loans', 'school', 1, 35),
(9, 'staff', 'Other School Staff', 'Support staff including Accountant, Secretary, ICT Admin, Exam Officer', 'school', 1, 30)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), level=VALUES(level);

-- ----------------------------------------------------------------------------
-- 3. Modules (18 Integrated Modules)
-- ----------------------------------------------------------------------------
INSERT INTO modules (id, code, name, description, icon, audience, route, is_enabled, sort_order)
VALUES
(1, 'ai_lesson_planner', 'AI Lesson Plan Generator', 'CBC lesson plan generator using 5E, 3P, and UDL methodologies with REB curriculum alignment', 'BookOpen', 'teachers,dos,headteacher', '/lesson-planner', 1, 1),
(2, 'marks_management', 'Marks Information System', 'Marks recording, multi-assessment conversion, DOS approval workflow, official report cards', 'Award', 'teachers,dos,headteacher,school_admin', '/marks', 1, 2),
(3, 'digital_library', 'Digital Library', 'Curriculum textbook repository, digital resources, search, and student borrowing loans', 'Library', 'all', '/library', 1, 3),
(4, 'assessments', 'Assessment & Examination Portal', 'Online exams, quizzes, question bank management, grading, and student submissions', 'FileCheck', 'teachers,students,dos,exam_officer', '/assessments', 1, 4),
(5, 'class_diary', 'Digital Class Diary', 'Daily classroom lesson diary, topics taught, homework assigned, and teacher reflections', 'BookMarked', 'teachers,dos,headteacher', '/class-diary', 1, 5),
(6, 'student_attendance', 'Student Attendance', 'Daily and period-level student attendance tracking, absentee alerts, and monthly summaries', 'UserCheck', 'teachers,dos,headteacher,parents', '/attendance/students', 1, 6),
(7, 'teacher_attendance', 'Teacher Attendance', 'Faculty check-in/out logging, duty presence, leave management, and punctuality logs', 'Clock', 'school_admin,headteacher,dos', '/attendance/teachers', 1, 7),
(8, 'timetables', 'Timetable Management', 'Master schedule, class timetables, teacher allocation, room assignments, and conflict checks', 'Calendar', 'teachers,students,dos,school_admin', '/timetables', 1, 8),
(9, 'ai_assistant', 'AI Teaching Assistant', 'Pedagogical copilot for rubric generation, quiz crafting, explanation simplification, and IEP guidance', 'Bot', 'teachers,students,dos', '/ai-assistant', 1, 9),
(10, 'cpd', 'CPD & Professional Development', 'Teacher Continuous Professional Development workshops, credit hour tracking, and certifications', 'TrendingUp', 'teachers,dos,headteacher,cpd_coordinator', '/cpd', 1, 10),
(11, 'portfolio', 'Teacher Professional Portfolio', 'Teaching artifacts, peer observation records, professional growth evidence, and REB evaluation dossier', 'Briefcase', 'teachers,headteacher,dos', '/portfolio', 1, 11),
(12, 'students', 'Student Management', 'Student enrollment, admissions, class stream assignment, learner profiles, and guardian records', 'GraduationCap', 'school_admin,headteacher,dos,secretary', '/students', 1, 12),
(13, 'parents', 'Parent Management', 'Guardian directory, parent-student linkage verification, communication channel, and parent portal', 'Users', 'school_admin,headteacher,teachers', '/parents', 1, 13),
(14, 'schools', 'School Management', 'School profiles, academic streams, accreditation details, infrastructure facilities, and settings', 'Building2', 'super_admin,school_admin,headteacher', '/schools', 1, 14),
(15, 'analytics', 'Analytics & Reporting', 'Institutional performance dashboards, grade distribution charts, dropout risk alerts, and census exports', 'BarChart3', 'super_admin,school_admin,headteacher,dos', '/analytics', 1, 15),
(16, 'communications', 'Notifications & Communication', 'Real-time broadcast announcements, targeted SMS/email alerts, staff messages, and parent circulars', 'Bell', 'all', '/communications', 1, 16),
(17, 'user_management', 'User & Permission Management', 'RBAC role assignments, account lifecycle, password resets, and school membership control', 'Shield', 'super_admin,school_admin', '/users', 1, 17),
(18, 'settings', 'System Settings', 'Platform-wide configurations, AI provider keys, academic calendar defaults, and system health monitors', 'Settings', 'super_admin,school_admin', '/settings', 1, 18)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), route=VALUES(route);

-- ----------------------------------------------------------------------------
-- 4. Enable Modules for Schools
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO school_modules (school_id, module_code, is_enabled)
SELECT s.id, m.code, 1 FROM schools s CROSS JOIN modules m;

-- ----------------------------------------------------------------------------
-- 5. Academic Years & Terms
-- ----------------------------------------------------------------------------
INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
VALUES
(1, 1, '2025-2026', '2025-09-01', '2026-07-05', 1),
(2, 2, '2025-2026', '2025-09-01', '2026-07-05', 1),
(3, 3, '2025-2026', '2025-09-01', '2026-07-05', 1),
(4, 4, '2025-2026', '2025-09-01', '2026-07-05', 1),
(5, 5, '2025-2026', '2025-09-01', '2026-07-05', 1)
ON DUPLICATE KEY UPDATE is_current=VALUES(is_current);

INSERT INTO terms (id, school_id, academic_year_id, name, start_date, end_date, is_current)
VALUES
(1, 1, 1, 'Term 1', '2025-09-01', '2025-12-15', 0),
(2, 1, 1, 'Term 2', '2026-01-05', '2026-04-03', 1),
(3, 1, 1, 'Term 3', '2026-04-20', '2026-07-05', 0),
(4, 2, 2, 'Term 2', '2026-01-05', '2026-04-03', 1),
(5, 3, 3, 'Term 2', '2026-01-05', '2026-04-03', 1)
ON DUPLICATE KEY UPDATE is_current=VALUES(is_current);

-- ----------------------------------------------------------------------------
-- 6. Unified Users for all 9 User Categories
-- Password for all seed users is: Password123!
-- Bcrypt Hash: $2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei
-- ----------------------------------------------------------------------------
INSERT INTO users (id, full_name, email, password_hash, role, school_name, school_id, is_suspended, is_email_verified, language, theme)
VALUES
-- A. Super Administrator
(101, 'National Super Admin', 'superadmin@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'super_admin', '21CTA National Operations', NULL, 0, 1, 'en', 'light'),

-- B. School Administrators
(102, 'Alexandre Mugabo', 'admin.busanza@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'school_admin', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(103, 'Vestine Uwase', 'admin.kayonza@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'school_admin', 'GS Kayonza Modern', 2, 0, 1, 'en', 'light'),

-- C. Headteachers
(104, 'Dr. Emmanuel Hakizimana', 'headteacher.busanza@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'headteacher', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(105, 'Marie Claire Mukamana', 'headteacher.kayonza@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'headteacher', 'GS Kayonza Modern', 2, 0, 1, 'en', 'light'),

-- D. Director of Studies (DOS)
(106, 'Jean Bosco Nshimiyimana', 'dos.busanza@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'dos', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(107, 'Fidèle Habimana', 'dos.kayonza@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'dos', 'GS Kayonza Modern', 2, 0, 1, 'en', 'light'),

-- E. Teachers
(108, 'Roger Habimana', 'teacher.roger@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'teacher', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(109, 'Honore Ndayisenga', 'teacher.honore@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'teacher', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(110, 'Aline Umutoni', 'teacher.aline@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'teacher', 'GS Kayonza Modern', 2, 0, 1, 'en', 'light'),

-- F. Students
(111, 'Kevin Mugisha', 'student.kevin@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'student', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(112, 'Diane Ingabire', 'student.diane@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'student', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(113, 'Eric Manzi', 'student.eric@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'student', 'GS Kayonza Modern', 2, 0, 1, 'en', 'light'),

-- G. Parents
(114, 'Jean Paul Bizimana', 'parent.jean@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'parent', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(115, 'Francine Mukagasana', 'parent.francine@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'parent', 'GS Busanza', 1, 0, 1, 'en', 'light'),

-- H. Librarian
(116, 'Claire Nyiranziza', 'librarian.claire@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'librarian', 'GS Busanza', 1, 0, 1, 'en', 'light'),

-- I. Other School Staff (Secretary, Accountant, ICT Admin, Exam Officer)
(117, 'Patrick Gasana (Accountant)', 'staff.accountant@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'staff', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(118, 'Grace Uwera (Secretary)', 'staff.secretary@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'staff', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(119, 'Olivier Nkurunziza (ICT)', 'staff.ict@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'staff', 'GS Busanza', 1, 0, 1, 'en', 'light'),
(120, 'Claude Bizimungu (Exam Officer)', 'staff.exam@21cta.rw', '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei', 'staff', 'GS Busanza', 1, 0, 1, 'en', 'light')
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role), school_id=VALUES(school_id);

-- Update legacy users with valid passwords and school IDs
UPDATE users SET school_id = 1 WHERE school_name LIKE '%Busanza%' AND school_id IS NULL;
UPDATE users SET school_id = 2 WHERE school_name LIKE '%Kayonza%' AND school_id IS NULL;
UPDATE users SET school_id = 3 WHERE school_name LIKE '%Rukara%' AND school_id IS NULL;
UPDATE users SET password_hash = '$2a$10$HcUE7B9sIjYQgQDe8WH2ROVd4O5wqHW.hWmwv5Sq6bY8G4BqmCCei' WHERE id IN (1, 2, 3, 4);

-- ----------------------------------------------------------------------------
-- 7. School Memberships
-- ----------------------------------------------------------------------------
INSERT INTO school_memberships (user_id, school_id, role_id, status, is_primary)
VALUES
(101, 1, 1, 'active', 1),
(102, 1, 2, 'active', 1),
(103, 2, 2, 'active', 1),
(104, 1, 3, 'active', 1),
(105, 2, 3, 'active', 1),
(106, 1, 4, 'active', 1),
(107, 2, 4, 'active', 1),
(108, 1, 5, 'active', 1),
(109, 1, 5, 'active', 1),
(110, 2, 5, 'active', 1),
(111, 1, 6, 'active', 1),
(112, 1, 6, 'active', 1),
(113, 2, 6, 'active', 1),
(114, 1, 7, 'active', 1),
(115, 1, 7, 'active', 1),
(116, 1, 8, 'active', 1),
(117, 1, 9, 'active', 1),
(118, 1, 9, 'active', 1),
(119, 1, 9, 'active', 1),
(120, 1, 9, 'active', 1)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ----------------------------------------------------------------------------
-- 8. Link Classes & Subjects to Schools
-- ----------------------------------------------------------------------------
UPDATE classes SET school_id = 1 WHERE school_id IS NULL;
UPDATE subjects SET school_id = 1 WHERE school_id IS NULL;
UPDATE class_subjects SET school_id = 1 WHERE school_id IS NULL;
UPDATE lessons SET school_id = 1 WHERE school_id IS NULL;
UPDATE lesson_plans SET school_id = 1 WHERE school_id IS NULL;

-- ----------------------------------------------------------------------------
-- 9. Profiles: Teachers, Students, Parents
-- ----------------------------------------------------------------------------
INSERT INTO teacher_profiles (user_id, school_id, staff_number, qualification, specialization, employment_date, status)
VALUES
(108, 1, 'TS-BUS-001', 'Bachelor of Education (Math/Physics)', 'Mathematics & Statistics', '2020-09-01', 'active'),
(109, 1, 'TS-BUS-002', 'Master of Science (Computer Science)', 'Computer Science & ICT', '2021-02-15', 'active'),
(110, 2, 'TS-KAY-001', 'Bachelor of Science with Education', 'Chemistry & Biology', '2019-10-01', 'active')
ON DUPLICATE KEY UPDATE staff_number=VALUES(staff_number);

-- Ensure sample classes exist
INSERT IGNORE INTO classes (id, school_id, name, level, stream, academic_year, teacher_id)
VALUES
(10, 1, 'Senior 1 A', 'Lower Secondary', 'A', '2025-2026', 108),
(11, 1, 'Senior 2 B', 'Lower Secondary', 'B', '2025-2026', 108),
(12, 1, 'Senior 4 MCB', 'Upper Secondary', 'MCB', '2025-2026', 109);

INSERT INTO student_profiles (id, user_id, school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
VALUES
(1, 111, 1, 'ADM/2025/001', 'Kevin', 'Mugisha', 'male', '2010-04-12', 10, 'Jean Paul Bizimana', '+250788220001', 'active'),
(2, 112, 1, 'ADM/2025/002', 'Diane', 'Ingabire', 'female', '2010-08-23', 10, 'Francine Mukagasana', '+250788220002', 'active'),
(3, 113, 2, 'ADM/2025/003', 'Eric', 'Manzi', 'male', '2009-11-05', 11, 'Charles Manzi', '+250788220003', 'active')
ON DUPLICATE KEY UPDATE admission_number=VALUES(admission_number), class_id=VALUES(class_id);

INSERT INTO parent_profiles (id, user_id, school_id, occupation, phone)
VALUES
(1, 114, 1, 'Civil Engineer', '+250788220001'),
(2, 115, 1, 'Businesswoman', '+250788220002')
ON DUPLICATE KEY UPDATE phone=VALUES(phone);

INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_verified)
VALUES
(1, 1, 'father', 1),
(2, 2, 'mother', 1)
ON DUPLICATE KEY UPDATE is_verified=1;

-- ----------------------------------------------------------------------------
-- 10. Sample Assessments and Marks
-- ----------------------------------------------------------------------------
-- Ensure a subject exists
INSERT IGNORE INTO subjects (id, school_id, name, code, description)
VALUES (1, 1, 'Mathematics', 'MATH', 'Core Secondary Mathematics Curriculum');

INSERT INTO assessments (id, school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, status)
VALUES
(1, 1, 10, 1, 2, 108, 'Mid-Term Exam: Quadratic Equations', 'Assessment on factoring, formula method and graph interpretation', 'exam', 100.00, 40.00, '2026-02-15', 'published'),
(2, 1, 10, 1, 2, 108, 'Quiz 1: Algebraic Expressions', 'Short test on linear expressions and substitution', 'quiz', 20.00, 10.00, '2026-01-20', 'published'),
(3, 1, 10, 1, 2, 108, 'Unit 3 Practical Assignment', 'Individual solving of 10 applied word problems', 'assignment', 50.00, 20.00, '2026-02-28', 'published')
ON DUPLICATE KEY UPDATE title=VALUES(title);

INSERT INTO marks (school_id, assessment_id, student_id, subject_id, class_id, term_id, teacher_id, score, max_score, grade, remarks, status, approved_by, approved_at, is_locked)
VALUES
(1, 1, 1, 1, 10, 2, 108, 86.50, 100.00, 'A', 'Distinction. Outstanding analytical problem solving.', 'approved', 106, '2026-02-18 10:00:00', 1),
(1, 1, 2, 1, 10, 2, 108, 74.00, 100.00, 'B', 'Good comprehension, needs more speed in quadratic factorization.', 'approved', 106, '2026-02-18 10:00:00', 1),
(1, 2, 1, 1, 10, 2, 108, 19.00, 20.00, 'A', 'Excellent quiz performance.', 'approved', 106, '2026-01-22 09:30:00', 1),
(1, 2, 2, 1, 10, 2, 108, 16.50, 20.00, 'B', 'Well done.', 'approved', 106, '2026-01-22 09:30:00', 1)
ON DUPLICATE KEY UPDATE score=VALUES(score), status=VALUES(status);

-- ----------------------------------------------------------------------------
-- 11. Student & Teacher Attendance
-- ----------------------------------------------------------------------------
INSERT INTO student_attendance (school_id, student_id, class_id, attendance_date, status, notes, recorded_by)
VALUES
(1, 1, 10, CURRENT_DATE(), 'present', 'On time and engaged', 108),
(1, 2, 10, CURRENT_DATE(), 'present', 'On time', 108),
(1, 1, 10, DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), 'present', 'Present', 108),
(1, 2, 10, DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), 'late', 'Arrived 10 minutes late due to rain', 108)
ON DUPLICATE KEY UPDATE status=VALUES(status);

INSERT INTO teacher_attendance (school_id, teacher_id, attendance_date, status, check_in, check_out, notes, recorded_by)
VALUES
(1, 108, CURRENT_DATE(), 'present', '07:45:00', '16:30:00', 'Standard duty schedule', 104),
(1, 109, CURRENT_DATE(), 'present', '07:50:00', '16:30:00', 'Standard duty schedule', 104),
(1, 108, DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), 'present', '07:42:00', '16:25:00', 'Present', 104)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ----------------------------------------------------------------------------
-- 12. Timetable Slots
-- ----------------------------------------------------------------------------
INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, academic_year)
VALUES
(1, 10, 1, 108, 'Monday', '08:00:00', '09:20:00', 'Room 101', '2025-2026'),
(1, 10, 1, 108, 'Wednesday', '10:00:00', '11:20:00', 'Room 101', '2025-2026'),
(1, 10, 1, 108, 'Friday', '13:30:00', '14:50:00', 'Room 101', '2025-2026')
ON DUPLICATE KEY UPDATE room=VALUES(room);

-- ----------------------------------------------------------------------------
-- 13. Digital Library Resources and Loans
-- ----------------------------------------------------------------------------
INSERT INTO library_resources (id, school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, status, uploaded_by)
VALUES
(1, 1, 'REB Senior 1 Mathematics Student Book', 'Rwanda Basic Education Board', 'Mathematics', 'textbook', '978-99977-101-1', 'Official REB textbook covering numbers, algebra, and geometry for S1', 50, 48, 'active', 116),
(2, 1, 'REB Senior 2 Physics Concepts & Experiments', 'Rwanda Basic Education Board', 'Physics', 'textbook', '978-99977-102-2', 'Hands-on practical physics guide aligned with national CBC guidelines', 40, 39, 'active', 116),
(3, 1, 'Inspiring Rwandan Innovations: Case Studies', 'National Council for Science and Technology', 'Science & Innovation', 'book', '978-99977-103-3', 'Collection of Rwandan technological breakthroughs and engineering models', 25, 25, 'active', 116),
(4, 1, 'English Comprehension & Essay Writing Guide', 'Oxford East Africa', 'Languages', 'ebook', '978-99977-104-4', 'Digital grammar and compositional skill building for high school students', 100, 100, 'active', 116)
ON DUPLICATE KEY UPDATE title=VALUES(title);

INSERT INTO library_loans (school_id, resource_id, borrower_user_id, student_id, borrowed_at, due_at, status, issued_by)
VALUES
(1, 1, 111, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 11 DAY), 'borrowed', 116),
(1, 2, 112, 2, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 9 DAY), 'borrowed', 116)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ----------------------------------------------------------------------------
-- 14. Digital Class Diary
-- ----------------------------------------------------------------------------
INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
VALUES
(1, 10, 1, 108, CURRENT_DATE(), 'Quadratic Equations Factorization', 'Demonstrated grouping method on blackboard; paired students solved 4 exercises; recap with voting cards', 'Complete questions 5 to 10 on Student Book page 64', '85% of students showed good mastery; 4 students struggled with negative coefficients and will receive remedial support.', 'Unit 1: Quadratic Equations', 'submitted'),
(1, 10, 1, 108, DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), 'Roots of Quadratic Equations by Quadratic Formula', 'Step-by-step derivation of x = (-b +- sqrt(b^2 - 4ac))/(2a); guided practice on 3 examples', 'Practice exercises 1-4 on page 68', 'Learners actively followed discriminant analysis; clear engagement observed.', 'Unit 1: Quadratic Equations', 'reviewed')
ON DUPLICATE KEY UPDATE topic=VALUES(topic);

-- ----------------------------------------------------------------------------
-- 15. CPD & Professional Portfolios
-- ----------------------------------------------------------------------------
INSERT INTO cpd_activities (id, school_id, title, description, provider, start_date, end_date, hours, status, created_by)
VALUES
(1, 1, 'CBC Advanced Pedagogical Strategies & Inclusive Classroom', 'Hands-on training on differentiated learning, UDL techniques, and formative classroom assessments', 'REB & University of Rwanda - College of Education', '2026-01-15', '2026-01-18', 24.0, 'completed', 104),
(2, 1, 'Integrating AI and Digital Tools in STEM Instruction', 'Practical workshop on leveraging automated lesson generation, virtual labs, and digital quizzes', '21CTA National Training Initiative', '2026-02-10', '2026-02-12', 16.0, 'completed', 104),
(3, 1, 'Special Needs Education: Visual and Hearing Accommodations', 'Guidelines and resource creation for learners requiring physical, visual, and cognitive adaptations', 'National Union of Disability Organizations of Rwanda (NUDOR)', '2026-03-25', '2026-03-26', 12.0, 'planned', 104)
ON DUPLICATE KEY UPDATE title=VALUES(title);

INSERT INTO cpd_enrollments (cpd_activity_id, user_id, status, completed_at)
VALUES
(1, 108, 'completed', '2026-01-18 17:00:00'),
(1, 109, 'completed', '2026-01-18 17:00:00'),
(2, 108, 'completed', '2026-02-12 16:30:00')
ON DUPLICATE KEY UPDATE status=VALUES(status);

INSERT INTO professional_portfolios (user_id, school_id, title, category, description, achieved_on)
VALUES
(108, 1, 'Certified CBC STEM Master Educator Level 2', 'Certification', 'Awarded by REB upon successful completion of multi-term pedagogical assessment and peer review', '2025-11-20'),
(108, 1, 'Innovative Math Visual Aids Project', 'Action Research', 'Developed tactile model sets for 3D geometry enabling inclusive participation for visually impaired learners', '2026-01-10'),
(109, 1, 'National Robotics & Coding Club Coach Certificate', 'Extracurricular Leadership', 'Guided high school robotics team to Eastern Province Science Fair top honors', '2025-10-15')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- ----------------------------------------------------------------------------
-- 16. Announcements
-- ----------------------------------------------------------------------------
INSERT INTO announcements (id, school_id, title, body, audience, priority, created_by, published_at)
VALUES
(1, NULL, 'National Launch: 21CTA Unified Educational Platform Live across Rwanda', 'We are pleased to introduce the 21st Century Teacher Assistant (21CTA) unified platform, empowering teachers with AI lesson planning, integrated marks management, and comprehensive school leadership tools.', 'all', 'high', 101, NOW()),
(2, 1, 'Term 2 Academic Progress Review & DOS Marks Submission Deadline', 'All subject teachers are reminded that mid-term assessment marks for Term 2 must be recorded and submitted for DOS review by Friday 4:00 PM.', 'teachers', 'urgent', 106, NOW()),
(3, 1, 'Parent-Teacher Academic Consultation Day', 'Parents and guardians are invited to school on Saturday morning to review mid-term student report cards and discuss academic progress.', 'parents', 'high', 104, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- ----------------------------------------------------------------------------
-- 17. In-App Platform Notifications
-- ----------------------------------------------------------------------------
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
VALUES
(108, 1, 'Marks Approved by DOS', 'Your Senior 1 Mathematics Mid-Term Exam marks have been approved by the Director of Studies.', 'success', '/marks', 0),
(106, 1, 'New Marks Submission Pending Approval', 'Teacher Roger Habimana submitted marks for Senior 1 Mathematics for review.', 'info', '/marks/approvals', 0),
(111, 1, 'New Assessment Graded', 'Your Mid-Term Exam in Mathematics has been graded: Score 86.5/100 (Grade A).', 'success', '/marks', 0),
(114, 1, 'Child Academic Update', 'Kevin Mugisha received Grade A in Mathematics Mid-Term Assessment.', 'info', '/student-reports', 0),
(101, NULL, 'System Status Normal', 'All 21CTA database clusters, services, and APIs are operating with 99.98% uptime.', 'info', '/system-health', 1)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- ----------------------------------------------------------------------------
-- 18. School Registration Requests
-- ----------------------------------------------------------------------------
INSERT INTO registration_requests (id, request_type, school_name, district, province, contact_name, email, phone, role_code, message, status, reviewed_by, reviewed_at, review_notes)
VALUES
(1, 'school', 'Lycee de Kigali', 'Nyarugenge', 'City of Kigali', 'Jean Damascene R.', 'info@ldk.rw', '+250788330001', 'school_admin', 'Requesting onboarding for 1,800 students and 75 teaching faculty members.', 'approved', 101, NOW(), 'Approved for full enterprise onboarding'),
(2, 'school', 'GS Musanze Modern', 'Musanze', 'Northern Province', 'Agnes Mukandoli', 'head@gsmusanze.rw', '+250788330002', 'school_admin', 'We want to pilot 21CTA lesson planning and marks management for our 45 teachers.', 'pending', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE school_name=VALUES(school_name);

-- ----------------------------------------------------------------------------
-- 19. Platform Settings
-- ----------------------------------------------------------------------------
INSERT INTO platform_settings (setting_key, setting_value, category)
VALUES
('platform_name', '21st Century Teacher Assistant (21CTA)', 'general'),
('platform_tagline', 'Empowering Teachers Through Technology and Innovation', 'general'),
('default_language', 'en', 'localization'),
('supported_languages', '["en", "fr", "rw", "sw"]', 'localization'),
('current_academic_year', '2025-2026', 'academic'),
('active_term', 'Term 2', 'academic'),
('maintenance_mode', 'false', 'system'),
('ai_provider_primary', 'gemini', 'ai'),
('ai_provider_fallback', 'groq', 'ai'),
('ai_monthly_token_quota_per_school', '10000000', 'ai'),
('session_timeout_minutes', '120', 'security'),
('enable_multi_school_isolation', 'true', 'security')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

SET FOREIGN_KEY_CHECKS = 1;
