-- ============================================================================
-- 21CTA unified platform - seed data (idempotent)
-- ----------------------------------------------------------------------------
-- Seeds reference data (roles, permissions, modules, settings), maps the
-- existing lesson-planner users/classes/subjects to schools, and creates
-- clearly-labelled demo records so every dashboard has real MySQL data.
--
-- Every demo account uses the password: Demo@21cta
-- Re-runnable: yes (INSERT IGNORE / WHERE NOT EXISTS everywhere).
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
INSERT INTO roles (code, name, description, scope, is_system, level) VALUES
('super_admin','Super Administrator','Full platform owner and cross-school administration','platform',1,100),
('school_admin','School Administrator','Manages one school, its people and settings','school',1,90),
('headteacher','Headteacher','Institutional leadership and performance oversight','school',1,80),
('dos','Director of Studies','Academic management, marks approval and examinations','school',1,75),
('teacher','Teacher','Teaching, lesson planning, marks, attendance and CPD','school',1,50),
('student','Student','Learner portal: timetable, marks, assessments and library','school',1,20),
('parent','Parent / Guardian','Monitors linked children only','school',1,20),
('librarian','Librarian','Library catalogue, borrowing and returns','school',1,40),
('secretary','School Secretary','Student records, attendance and school communication','school',1,40),
('accountant','Accountant','Reports and read-only school oversight','school',1,35),
('ict_admin','ICT Administrator','Users, settings, modules and audit logs','school',1,60),
('exam_officer','Examination Officer','Assessments, marks approval and results reports','school',1,55),
('hod','Head of Department','Department teaching oversight and lesson-plan approval','school',1,55),
('cpd_coordinator','CPD Coordinator','Continuing professional development and portfolios','school',1,45),
('staff','Support Staff','Limited access to announcements and settings','school',1,25)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), scope = VALUES(scope), level = VALUES(level);

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------
INSERT INTO permissions (code, module, action, description) VALUES
('dashboard.view','dashboard','view','View the role dashboard'),
('school.view','school','view','View school information'),
('school.manage','school','manage','Edit school information'),
('users.view','users','view','View user accounts'),
('users.manage','users','manage','Create, edit, suspend and reset users'),
('students.view','students','view','View student records'),
('students.manage','students','manage','Create and edit student records'),
('teachers.view','teachers','view','View teacher records'),
('teachers.manage','teachers','manage','Create and edit teacher records'),
('classes.view','classes','view','View classes and streams'),
('classes.manage','classes','manage','Create and edit classes'),
('subjects.view','subjects','view','View subjects'),
('subjects.manage','subjects','manage','Create and edit subjects'),
('lesson_plans.view','lesson_plans','view','View lesson plans'),
('lesson_plans.create','lesson_plans','create','Create lesson plans'),
('lesson_plans.edit','lesson_plans','edit','Edit lesson plans'),
('lesson_plans.delete','lesson_plans','delete','Delete lesson plans'),
('lesson_plans.approve','lesson_plans','approve','Review and approve lesson plans'),
('marks.view','marks','view','View marks'),
('marks.enter','marks','enter','Enter and edit marks'),
('marks.approve','marks','approve','Approve submitted marks'),
('marks.lock','marks','lock','Lock or reopen results'),
('assessments.view','assessments','view','View assessments and exams'),
('assessments.manage','assessments','manage','Create and manage assessments'),
('assessments.submit','assessments','submit','Submit an assessment'),
('assessments.grade','assessments','grade','Grade submissions'),
('library.view','library','view','View the digital library'),
('library.manage','library','manage','Manage resources and loans'),
('library.borrow','library','borrow','Borrow and return resources'),
('diary.view','diary','view','View the class diary'),
('diary.manage','diary','manage','Record class diary entries'),
('attendance.view','attendance','view','View attendance'),
('attendance.record','attendance','record','Record attendance'),
('attendance.manage','attendance','manage','Manage attendance across the school'),
('timetable.view','timetable','view','View timetables'),
('timetable.manage','timetable','manage','Manage timetables'),
('ai_assistant.use','ai','use','Use the AI teaching assistant'),
('ai_lesson_plan.generate','ai','generate','Generate AI lesson plans'),
('cpd.view','cpd','view','View CPD activities'),
('cpd.manage','cpd','manage','Manage CPD activities'),
('portfolio.view','portfolio','view','View professional portfolios'),
('portfolio.manage','portfolio','manage','Manage own professional portfolio'),
('reports.view','reports','view','View analytics and reports'),
('reports.export','reports','export','Export reports'),
('notifications.view','notifications','view','View notifications and announcements'),
('notifications.send','notifications','send','Send announcements and notifications'),
('settings.view','settings','view','View settings'),
('settings.manage','settings','manage','Change settings'),
('audit.view','audit','view','View audit logs'),
('platform.view','platform','view','View cross-school platform analytics'),
('platform.manage','platform','manage','Manage schools, integrations and platform configuration'),
('registrations.review','registrations','review','Approve or reject registration requests'),
('modules.manage','modules','manage','Enable or disable modules')
ON DUPLICATE KEY UPDATE module = VALUES(module), action = VALUES(action), description = VALUES(description);

-- ----------------------------------------------------------------------------
-- Role -> permission matrix
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code = 'super_admin'
    OR (r.code = 'school_admin' AND p.code NOT IN ('platform.view','platform.manage'))
    OR (r.code = 'headteacher' AND p.code IN (
        'dashboard.view','school.view','users.view','students.view','teachers.view','classes.view',
        'subjects.view','lesson_plans.view','lesson_plans.approve','marks.view','marks.approve',
        'assessments.view','library.view','diary.view','attendance.view','attendance.manage',
        'timetable.view','cpd.view','reports.view','reports.export','notifications.view',
        'notifications.send','audit.view','settings.view'))
    OR (r.code = 'dos' AND p.code IN (
        'dashboard.view','school.view','users.view','students.view','teachers.view','classes.view',
        'classes.manage','subjects.view','subjects.manage','lesson_plans.view','lesson_plans.approve',
        'marks.view','marks.approve','marks.lock','assessments.view','assessments.manage',
        'diary.view','attendance.view','attendance.manage','timetable.view','timetable.manage',
        'reports.view','reports.export','notifications.view','notifications.send','audit.view','settings.view'))
    OR (r.code = 'teacher' AND p.code IN (
        'dashboard.view','students.view','classes.view','subjects.view','lesson_plans.view',
        'lesson_plans.create','lesson_plans.edit','lesson_plans.delete','marks.view','marks.enter',
        'assessments.view','assessments.manage','assessments.grade','library.view','library.borrow',
        'diary.view','diary.manage','attendance.view','attendance.record','timetable.view',
        'ai_assistant.use','ai_lesson_plan.generate','cpd.view','portfolio.view','portfolio.manage',
        'reports.view','notifications.view','settings.view'))
    OR (r.code = 'student' AND p.code IN (
        'dashboard.view','classes.view','subjects.view','marks.view','assessments.view',
        'assessments.submit','library.view','library.borrow','attendance.view','timetable.view',
        'notifications.view','settings.view'))
    OR (r.code = 'parent' AND p.code IN (
        'dashboard.view','students.view','marks.view','assessments.view','library.view',
        'attendance.view','timetable.view','notifications.view','settings.view'))
    OR (r.code = 'librarian' AND p.code IN (
        'dashboard.view','students.view','teachers.view','library.view','library.manage',
        'library.borrow','reports.view','reports.export','notifications.view','settings.view'))
    OR (r.code = 'secretary' AND p.code IN (
        'dashboard.view','users.view','students.view','students.manage','teachers.view','classes.view',
        'attendance.view','reports.view','notifications.view','notifications.send','settings.view'))
    OR (r.code = 'accountant' AND p.code IN (
        'dashboard.view','students.view','reports.view','reports.export','notifications.view','settings.view'))
    OR (r.code = 'ict_admin' AND p.code IN (
        'dashboard.view','users.view','users.manage','reports.view','notifications.view','settings.view',
        'settings.manage','audit.view','modules.manage'))
    OR (r.code = 'exam_officer' AND p.code IN (
        'dashboard.view','students.view','marks.view','marks.approve','assessments.view',
        'assessments.manage','reports.view','reports.export','notifications.view','settings.view'))
    OR (r.code = 'hod' AND p.code IN (
        'dashboard.view','students.view','teachers.view','classes.view','subjects.view','lesson_plans.view',
        'lesson_plans.create','lesson_plans.edit','lesson_plans.approve','marks.view','marks.enter',
        'assessments.view','assessments.manage','assessments.grade','library.view','library.borrow',
        'diary.view','diary.manage','attendance.view','attendance.record','timetable.view',
        'ai_assistant.use','ai_lesson_plan.generate','cpd.view','portfolio.view','portfolio.manage',
        'reports.view','notifications.view','settings.view','audit.view'))
    OR (r.code = 'cpd_coordinator' AND p.code IN (
        'dashboard.view','teachers.view','cpd.view','cpd.manage','portfolio.view','reports.view',
        'notifications.view','notifications.send','settings.view'))
    OR (r.code = 'staff' AND p.code IN (
        'dashboard.view','notifications.view','settings.view'))
);

-- ----------------------------------------------------------------------------
-- Modules catalogue
-- ----------------------------------------------------------------------------
INSERT INTO modules (code, name, description, icon, audience, route, is_enabled, sort_order) VALUES
('dashboard','Dashboard','Role-aware overview of school activity','LayoutDashboard','all','/app/dashboard',1,10),
('school','My School','School profile, academic calendar and settings','School','super_admin,school_admin,headteacher,dos','/app/school',1,20),
('users','Users','Accounts, roles and permissions','Users','super_admin,school_admin,headteacher,ict_admin','/app/users',1,30),
('students','Students','Student records and profiles','GraduationCap','all-staff','/app/students',1,40),
('teachers','Teachers','Teacher records and assignments','UserCheck','all-staff','/app/teachers',1,50),
('classes','Classes','Classes, streams and class teachers','School','all-staff','/app/classes',1,60),
('subjects','Subjects','Subject catalogue and allocations','BookOpen','all-staff','/app/subjects',1,70),
('lesson-planner','Lesson Planner','AI-assisted CBC lesson plans','NotebookPen','teacher,hod,dos,headteacher,school_admin','/app/lesson-planner',1,80),
('marks','Marks Management','Marks entry, submission and approval','ClipboardList','teacher,hod,dos,headteacher,school_admin,exam_officer,student,parent','/app/marks',1,90),
('assessment','Assessment','Quizzes, tests, exams and submissions','FileCheck2','teacher,hod,dos,headteacher,school_admin,exam_officer,student,parent','/app/assessment',1,100),
('library','Digital Library','Catalogue, borrowing and returns','Library','all','/app/library',1,110),
('diary','Class Diary','Daily teaching record and reflections','CalendarDays','teacher,hod,dos,headteacher,school_admin','/app/diary',1,120),
('attendance','Attendance','Student and teacher attendance','UserCheck','teacher,hod,dos,headteacher,school_admin,secretary,student,parent','/app/attendance',1,130),
('timetable','Timetable','Class and teacher timetables','CalendarClock','all','/app/timetable',1,140),
('ai-assistant','AI Assistant','Teaching assistant for planning and resources','Sparkles','teacher,hod,school_admin','/app/ai-assistant',1,150),
('cpd','CPD & Portfolio','Professional development and portfolio','Award','teacher,hod,cpd_coordinator,headteacher,school_admin','/app/cpd',1,160),
('reports','Reports','Analytics, performance and exports','BarChart3','management','/app/reports',1,170),
('notifications','Notifications','Announcements and alerts','Bell','all','/app/notifications',1,180),
('settings','Settings','Profile, language, theme and system settings','Settings','all','/app/settings',1,190),
('platform','Platform Administration','Cross-school administration','ShieldCheck','super_admin','/app/platform',1,200),
('registrations','Registrations','Approve school and user registrations','UserPlus','super_admin,school_admin','/app/registrations',1,210),
('audit','Audit Log','Security and activity trail','ScrollText','super_admin,school_admin,headteacher,ict_admin','/app/audit',1,220)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), icon = VALUES(icon),
    audience = VALUES(audience), route = VALUES(route), sort_order = VALUES(sort_order);

-- ----------------------------------------------------------------------------
-- Platform settings
-- ----------------------------------------------------------------------------
INSERT INTO platform_settings (setting_key, setting_value, category) VALUES
('platform_name','21st Century Teacher Assistant','general'),
('tagline','Empowering Teachers Through Technology and Innovation','general'),
('support_email','support@21cta.rw','general'),
('support_phone','+250 788 000 000','general'),
('default_language','en','localization'),
('enabled_languages','en,fr,rw,sw','localization'),
('timezone','Africa/Kigali','localization'),
('academic_year','2026-2027','academic'),
('allow_public_registration','true','registration'),
('school_registration_requires_approval','true','registration'),
('maintenance_mode','false','system'),
('max_upload_mb','10','system'),
('ai_provider','gemini','ai'),
('ai_monthly_limit','500','ai'),
('backup_frequency','daily','system'),
('session_days','7','security')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), category = VALUES(category);

-- ----------------------------------------------------------------------------
-- Schools
-- ----------------------------------------------------------------------------
INSERT INTO schools (name, code, school_type, ownership, district, province, sector, cell, address, phone, email, motto, status, subscription_plan, max_users, approved_at)
SELECT 'GS BUSANZA','GS-BUSANZA','secondary','public','Gatsibo','Eastern','Kabarore','Busanza','Busanza, Gatsibo','+250 788 100 101','info@gsbusanza.rw','Knowledge is light','active','standard',800, NOW()
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code='GS-BUSANZA');

INSERT INTO schools (name, code, school_type, ownership, district, province, sector, cell, address, phone, email, motto, status, subscription_plan, max_users, approved_at)
SELECT 'Rukara Model School','RMS-RUKARA','combined','government_aided','Kayonza','Eastern','Rukara','Rukara','Rukara, Kayonza','+250 788 200 202','info@rukara.rw','Excellence for all','active','standard',600, NOW()
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code='RMS-RUKARA');

INSERT INTO schools (name, code, school_type, ownership, district, province, sector, cell, address, phone, email, motto, status, subscription_plan, max_users, approved_at)
SELECT 'Kigali Heights Secondary School','KHSS-KIGALI','secondary','private','Gasabo','Kigali City','Remera','Nyabisindu','Remera, Gasabo','+250 788 300 303','info@kigaliheights.rw','Rise above','active','premium',1200, NOW()
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code='KHSS-KIGALI');

INSERT INTO schools (name, code, school_type, ownership, district, province, sector, cell, address, phone, email, motto, status, subscription_plan, max_users)
SELECT 'Nyagatare Girls Secondary School','NGSS-NYAGATARE','secondary','public','Nyagatare','Eastern','Nyagatare','Nyagatare','Nyagatare','+250 788 400 404','info@ngss.rw','Empowering girls','pending','trial',700
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code='NGSS-NYAGATARE');

INSERT INTO schools (name, code, school_type, ownership, district, province, sector, cell, address, phone, email, motto, status, subscription_plan, max_users, approved_at)
SELECT 'Gicumbi TVET Centre','GTC-GICUMBI','tvet','public','Gicumbi','Northern','Byumba','Byumba','Byumba, Gicumbi','+250 788 500 505','info@gicumbitvet.rw','Skills for jobs','suspended','trial',400, NOW()
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code='GTC-GICUMBI');

SET @s1 = (SELECT id FROM schools WHERE code='GS-BUSANZA');
SET @s2 = (SELECT id FROM schools WHERE code='RMS-RUKARA');
SET @s3 = (SELECT id FROM schools WHERE code='KHSS-KIGALI');

-- ----------------------------------------------------------------------------
-- Academic years and terms
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO academic_years (school_id, name, start_date, end_date, is_current) VALUES
(@s1,'2026-2027','2026-09-01','2027-07-16',1),
(@s2,'2026-2027','2026-09-01','2027-07-16',1),
(@s3,'2026-2027','2026-09-01','2027-07-16',1);

SET @y1 = (SELECT id FROM academic_years WHERE school_id=@s1 AND name='2026-2027');
SET @y2 = (SELECT id FROM academic_years WHERE school_id=@s2 AND name='2026-2027');
SET @y3 = (SELECT id FROM academic_years WHERE school_id=@s3 AND name='2026-2027');

INSERT IGNORE INTO terms (school_id, academic_year_id, name, start_date, end_date, is_current) VALUES
(@s1,@y1,'Term 1','2026-09-01','2026-12-04',1),
(@s1,@y1,'Term 2','2027-01-11','2027-04-02',0),
(@s1,@y1,'Term 3','2027-04-19','2027-07-16',0),
(@s2,@y2,'Term 1','2026-09-01','2026-12-04',1),
(@s2,@y2,'Term 2','2027-01-11','2027-04-02',0),
(@s2,@y2,'Term 3','2027-04-19','2027-07-16',0);

SET @t1 = (SELECT id FROM terms WHERE academic_year_id=@y1 AND name='Term 1');
SET @t2 = (SELECT id FROM terms WHERE academic_year_id=@y2 AND name='Term 1');

-- ----------------------------------------------------------------------------
-- Map existing users, classes and subjects into the platform
-- ----------------------------------------------------------------------------
UPDATE users SET role='super_admin', school_id=NULL WHERE email='admin@example.invalid';
UPDATE users SET school_id=@s1 WHERE email IN ('teacher1@example.invalid','admin2@example.invalid');
UPDATE users SET school_id=@s2 WHERE email='teacher2@example.invalid';

UPDATE classes c JOIN users u ON u.id = c.teacher_id SET c.school_id = u.school_id WHERE c.school_id IS NULL;
UPDATE classes SET name = TRIM(name);
UPDATE classes
    SET level = CASE WHEN name LIKE '% %' THEN SUBSTRING_INDEX(name, ' ', 1) ELSE name END,
        stream = CASE WHEN name LIKE '% %' THEN NULLIF(TRIM(SUBSTRING(name, LOCATE(' ', name) + 1)), '') ELSE NULL END
WHERE level IS NULL OR stream IS NULL;
UPDATE subjects SET school_id = @s1 WHERE is_custom = 1 AND created_by = 2 AND school_id IS NULL;
UPDATE class_subjects cs JOIN classes c ON c.id = cs.class_id
    SET cs.school_id = c.school_id, cs.teacher_id = c.teacher_id
    WHERE cs.school_id IS NULL;
UPDATE lessons l JOIN units u ON u.id = l.unit_id JOIN class_subjects cs ON cs.id = u.class_subject_id
    SET l.school_id = cs.school_id WHERE l.school_id IS NULL;
UPDATE lesson_plans lp JOIN lessons l ON l.id = lp.lesson_id
    SET lp.school_id = l.school_id WHERE lp.school_id IS NULL;
UPDATE teacher_schedules ts JOIN users u ON u.id = ts.teacher_id
    SET ts.school_id = u.school_id WHERE ts.school_id IS NULL;

-- ----------------------------------------------------------------------------
-- Demo accounts for every role (password: Demo@21cta)
-- ----------------------------------------------------------------------------
SET @demo_hash = '$2a$10$l8hoR8UpZ8N6U3IeiILX6OE5OkcAoFCKkYbjW06eqpZwpME96H2mK';

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Platform Owner','superadmin@demo.21cta.rw','+250788110000',@demo_hash,'super_admin',NULL,NULL,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='superadmin@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Grace Mukamana','headteacher@demo.21cta.rw','+250788110001',@demo_hash,'headteacher','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='headteacher@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Eric Habimana','dos@demo.21cta.rw','+250788110002',@demo_hash,'dos','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='dos@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Aline Uwase','student1@demo.21cta.rw','+250788110003',@demo_hash,'student','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='student1@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Jean Paul Uwase','parent1@demo.21cta.rw','+250788110004',@demo_hash,'parent','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='parent1@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Claudine Nyirahabimana','librarian@demo.21cta.rw','+250788110005',@demo_hash,'librarian','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='librarian@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Josiane Uwimana','secretary@demo.21cta.rw','+250788110006',@demo_hash,'secretary','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='secretary@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Patrick Nkurunziza','accountant@demo.21cta.rw','+250788110007',@demo_hash,'accountant','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='accountant@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Diane Mutesi','ict@demo.21cta.rw','+250788110008',@demo_hash,'ict_admin','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='ict@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Samuel Bizimana','exams@demo.21cta.rw','+250788110009',@demo_hash,'exam_officer','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='exams@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Yvonne Kayitesi','hod@demo.21cta.rw','+250788110010',@demo_hash,'hod','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='hod@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Fabrice Ndayisaba','cpd@demo.21cta.rw','+250788110011',@demo_hash,'cpd_coordinator','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='cpd@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Alice Mukamana','staff@demo.21cta.rw','+250788110012',@demo_hash,'staff','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='staff@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Emmanuel Rwema','admin3@demo.21cta.rw','+250788110013',@demo_hash,'school_admin','Rukara Model School',@s2,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin3@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Peace Byiringiro','teacher3@demo.21cta.rw','+250788110014',@demo_hash,'teacher','Rukara Model School',@s2,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='teacher3@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Olivier Nsengimana','teacher@demo.21cta.rw','+250788110015',@demo_hash,'teacher','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='teacher@demo.21cta.rw');

INSERT INTO users (full_name,email,phone_number,password_hash,role,school_name,school_id,is_email_verified,language,theme)
SELECT 'Adeline Uwimana','schooladmin@demo.21cta.rw','+250788110016',@demo_hash,'school_admin','GS BUSANZA',@s1,1,'en','light'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='schooladmin@demo.21cta.rw');

-- Resolve demo user ids
SET @u_super   = (SELECT id FROM users WHERE email='admin@example.invalid');
SET @u_teacher = (SELECT id FROM users WHERE email='teacher1@example.invalid');
SET @u_admin   = (SELECT id FROM users WHERE email='admin2@example.invalid');
SET @u_teacher2= (SELECT id FROM users WHERE email='teacher2@example.invalid');
SET @u_head    = (SELECT id FROM users WHERE email='headteacher@demo.21cta.rw');
SET @u_dos     = (SELECT id FROM users WHERE email='dos@demo.21cta.rw');
SET @u_student = (SELECT id FROM users WHERE email='student1@demo.21cta.rw');
SET @u_parent  = (SELECT id FROM users WHERE email='parent1@demo.21cta.rw');
SET @u_lib     = (SELECT id FROM users WHERE email='librarian@demo.21cta.rw');
SET @u_sec     = (SELECT id FROM users WHERE email='secretary@demo.21cta.rw');
SET @u_acc     = (SELECT id FROM users WHERE email='accountant@demo.21cta.rw');
SET @u_ict     = (SELECT id FROM users WHERE email='ict@demo.21cta.rw');
SET @u_exam    = (SELECT id FROM users WHERE email='exams@demo.21cta.rw');
SET @u_hod     = (SELECT id FROM users WHERE email='hod@demo.21cta.rw');
SET @u_cpd     = (SELECT id FROM users WHERE email='cpd@demo.21cta.rw');
SET @u_staff   = (SELECT id FROM users WHERE email='staff@demo.21cta.rw');
SET @u_admin3  = (SELECT id FROM users WHERE email='admin3@demo.21cta.rw');
SET @u_teacher3= (SELECT id FROM users WHERE email='teacher3@demo.21cta.rw');
SET @u_teacher_demo = (SELECT id FROM users WHERE email='teacher@demo.21cta.rw');
SET @u_admin_demo   = (SELECT id FROM users WHERE email='schooladmin@demo.21cta.rw');

-- Give the demo teacher and the HOD real class allocations so their scoped
-- dashboards (marks, attendance, diary, lesson plans) contain live data.
UPDATE class_subjects SET teacher_id = @u_teacher_demo
 WHERE school_id = @s1 AND class_id = 1 AND subject_id = 1;
UPDATE class_subjects SET teacher_id = @u_hod
 WHERE school_id = @s1 AND ((class_id = 1 AND subject_id = 12) OR (class_id = 3 AND subject_id = 16));

-- ----------------------------------------------------------------------------
-- Memberships
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO school_memberships (user_id, school_id, role_id, status, is_primary)
SELECT x.user_id, x.school_id, r.id, 'active', 1
FROM (
    SELECT @u_teacher AS user_id, @s1 AS school_id, 'teacher' AS role_code
    UNION ALL SELECT @u_admin, @s1, 'school_admin'
    UNION ALL SELECT @u_teacher2, @s2, 'teacher'
    UNION ALL SELECT @u_head, @s1, 'headteacher'
    UNION ALL SELECT @u_dos, @s1, 'dos'
    UNION ALL SELECT @u_student, @s1, 'student'
    UNION ALL SELECT @u_parent, @s1, 'parent'
    UNION ALL SELECT @u_lib, @s1, 'librarian'
    UNION ALL SELECT @u_sec, @s1, 'secretary'
    UNION ALL SELECT @u_acc, @s1, 'accountant'
    UNION ALL SELECT @u_ict, @s1, 'ict_admin'
    UNION ALL SELECT @u_exam, @s1, 'exam_officer'
    UNION ALL SELECT @u_hod, @s1, 'hod'
    UNION ALL SELECT @u_cpd, @s1, 'cpd_coordinator'
    UNION ALL SELECT @u_staff, @s1, 'staff'
    UNION ALL SELECT @u_admin3, @s2, 'school_admin'
    UNION ALL SELECT @u_teacher3, @s2, 'teacher'
    UNION ALL SELECT @u_teacher_demo, @s1, 'teacher'
    UNION ALL SELECT @u_admin_demo, @s1, 'school_admin'
) x
JOIN roles r ON r.code = x.role_code
WHERE x.user_id IS NOT NULL AND x.school_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Teacher profiles
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO teacher_profiles (user_id, school_id, staff_number, qualification, specialization, employment_date, status) VALUES
(@u_teacher,@s1,'TCH-001','Bachelor of Education','Mathematics and Physics','2018-01-15','active'),
(@u_teacher2,@s2,'TCH-002','Bachelor of Education','Biology and Chemistry','2019-08-20','active'),
(@u_teacher3,@s2,'TCH-003','Diploma in Education','English and Literature','2021-02-01','active'),
(@u_head,@s1,'TCH-004','Master of Education','Educational Leadership','2012-01-10','active'),
(@u_dos,@s1,'TCH-005','Bachelor of Education','Mathematics','2015-09-01','active'),
(@u_hod,@s1,'TCH-006','Bachelor of Education','Sciences','2016-01-11','active'),
(@u_teacher_demo,@s1,'TCH-007','Bachelor of Education','Mathematics and ICT','2020-09-01','active');

-- ----------------------------------------------------------------------------
-- Students (16 demo learners across both schools)
-- ----------------------------------------------------------------------------
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-001','Aline','Uwase','female','2009-03-12',1,'Jean Paul Uwase','+250788110004','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-001');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-002','Eric','Niyonzima','male','2009-07-04',1,'Marie Niyonzima','+250788120002','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-002');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-003','Claudine','Mukamana','female','2009-11-21',1,'Agnes Mukamana','+250788120003','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-003');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-004','Jean Bosco','Habimana','male','2008-02-18',2,'Pierre Habimana','+250788120004','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-004');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-005','Diane','Ingabire','female','2008-06-09',2,'Rose Ingabire','+250788120005','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-005');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-006','Patrick','Nshimiyimana','male','2008-09-30',2,'Joseph Nshimiyimana','+250788120006','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-006');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-007','Sandrine','Uwimana','female','2014-01-14',3,'Beatrice Uwimana','+250788120007','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-007');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-008','Kevin','Mugisha','male','2014-05-27',3,'David Mugisha','+250788120008','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-008');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-009','Peace','Byiringiro','female','2014-10-03',3,'Alice Byiringiro','+250788120009','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-009');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-010','Yvonne','Uwera','female','2012-04-16',6,'Claude Uwera','+250788120010','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-010');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-011','Samuel','Nkurunziza','male','2012-08-05',6,'John Nkurunziza','+250788120011','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-011');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s1,'BUS-2026-012','Alice','Mutesi','female','2012-12-22',6,'Grace Mutesi','+250788120012','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-012');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s2,'RUK-2026-001','Emmanuel','Rwema','male','2013-03-08',4,'Paul Rwema','+250788130001','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s2 AND admission_number='RUK-2026-001');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s2,'RUK-2026-002','Grace','Umutoni','female','2013-07-19',4,'Jeanne Umutoni','+250788130002','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s2 AND admission_number='RUK-2026-002');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s2,'RUK-2026-003','Fabrice','Ndayisaba','male','2008-11-11',5,'Marc Ndayisaba','+250788130003','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s2 AND admission_number='RUK-2026-003');
INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, status)
SELECT @s2,'RUK-2026-004','Diane','Uwineza','female','2008-01-25',5,'Anne Uwineza','+250788130004','active'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE school_id=@s2 AND admission_number='RUK-2026-004');

SET @st1 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-001');
SET @st2 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-002');
SET @st3 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-003');
SET @st4 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-004');
SET @st5 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-005');
SET @st7 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-007');
SET @st8 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-008');
SET @st10 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-010');
SET @st11 = (SELECT id FROM student_profiles WHERE school_id=@s1 AND admission_number='BUS-2026-011');
SET @st13 = (SELECT id FROM student_profiles WHERE school_id=@s2 AND admission_number='RUK-2026-001');
SET @st15 = (SELECT id FROM student_profiles WHERE school_id=@s2 AND admission_number='RUK-2026-003');

UPDATE student_profiles SET user_id=@u_student WHERE id=@st1;

-- ----------------------------------------------------------------------------
-- Parent profile and verified links
-- ----------------------------------------------------------------------------
INSERT INTO parent_profiles (user_id, school_id, occupation, phone)
SELECT @u_parent, @s1, 'Civil servant', '+250788110004'
WHERE NOT EXISTS (SELECT 1 FROM parent_profiles WHERE user_id=@u_parent);
SET @p1 = (SELECT id FROM parent_profiles WHERE user_id=@u_parent);

INSERT IGNORE INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_verified) VALUES
(@p1,@st1,'father',1),
(@p1,@st2,'guardian',1);

-- ----------------------------------------------------------------------------
-- Assessments and questions
-- ----------------------------------------------------------------------------
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s1,1,1,@t1,@u_teacher,'Mathematics Monthly Test 1','Covers units 1-2: algebra and geometry','test',100,20,DATE_SUB(CURDATE(), INTERVAL 6 DAY),DATE_SUB(CURDATE(), INTERVAL 6 DAY),'published',@u_teacher
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s1 AND title='Mathematics Monthly Test 1');
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s1,1,2,@t1,@u_teacher,'Physics Quiz 1','Measurement and forces','quiz',20,10,DATE_SUB(CURDATE(), INTERVAL 3 DAY),DATE_SUB(CURDATE(), INTERVAL 3 DAY),'published',@u_teacher
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s1 AND title='Physics Quiz 1');
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s1,2,3,@t1,@u_teacher,'Chemistry Assignment 1','Periodic table and bonding','assignment',50,15,DATE_SUB(CURDATE(), INTERVAL 9 DAY),DATE_ADD(CURDATE(), INTERVAL 2 DAY),'published',@u_teacher
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s1 AND title='Chemistry Assignment 1');
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s1,3,6,@t1,@u_teacher,'English Reading Test','Reading comprehension and vocabulary','test',40,20,DATE_SUB(CURDATE(), INTERVAL 4 DAY),DATE_SUB(CURDATE(), INTERVAL 4 DAY),'published',@u_teacher
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s1 AND title='English Reading Test');
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s1,6,1,@t1,@u_teacher,'Mathematics End of Term Exam','Comprehensive end of term examination','exam',100,40,DATE_ADD(CURDATE(), INTERVAL 5 DAY),DATE_ADD(CURDATE(), INTERVAL 5 DAY),'draft',@u_teacher
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s1 AND title='Mathematics End of Term Exam');
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s2,4,1,@t2,@u_teacher2,'Mathematics Test 1','Numbers and operations','test',50,20,DATE_SUB(CURDATE(), INTERVAL 8 DAY),DATE_SUB(CURDATE(), INTERVAL 8 DAY),'published',@u_teacher2
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s2 AND title='Mathematics Test 1');
INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, status, created_by)
SELECT @s2,5,2,@t2,@u_teacher2,'Physics Quiz 1','Motion and energy','quiz',25,10,DATE_SUB(CURDATE(), INTERVAL 2 DAY),DATE_SUB(CURDATE(), INTERVAL 2 DAY),'published',@u_teacher2
WHERE NOT EXISTS (SELECT 1 FROM assessments WHERE school_id=@s2 AND title='Physics Quiz 1');

SET @a1 = (SELECT id FROM assessments WHERE school_id=@s1 AND title='Mathematics Monthly Test 1');
SET @a2 = (SELECT id FROM assessments WHERE school_id=@s1 AND title='Physics Quiz 1');
SET @a3 = (SELECT id FROM assessments WHERE school_id=@s1 AND title='Chemistry Assignment 1');
SET @a4 = (SELECT id FROM assessments WHERE school_id=@s1 AND title='English Reading Test');
SET @a6 = (SELECT id FROM assessments WHERE school_id=@s2 AND title='Mathematics Test 1');
SET @a7 = (SELECT id FROM assessments WHERE school_id=@s2 AND title='Physics Quiz 1');

INSERT INTO assessment_questions (assessment_id, question_text, question_type, options, correct_answer, marks, sort_order)
SELECT @a1,'Solve for x: 2x + 6 = 18.','short_answer',NULL,'6',10,1
WHERE NOT EXISTS (SELECT 1 FROM assessment_questions WHERE assessment_id=@a1 AND sort_order=1);
INSERT INTO assessment_questions (assessment_id, question_text, question_type, options, correct_answer, marks, sort_order)
SELECT @a1,'Which of the following is a prime number?','multiple_choice','["9","15","17","21"]','17',10,2
WHERE NOT EXISTS (SELECT 1 FROM assessment_questions WHERE assessment_id=@a1 AND sort_order=2);
INSERT INTO assessment_questions (assessment_id, question_text, question_type, options, correct_answer, marks, sort_order)
SELECT @a1,'The sum of angles in a triangle is 180 degrees.','true_false','["true","false"]','true',10,3
WHERE NOT EXISTS (SELECT 1 FROM assessment_questions WHERE assessment_id=@a1 AND sort_order=3);
INSERT INTO assessment_questions (assessment_id, question_text, question_type, options, correct_answer, marks, sort_order)
SELECT @a1,'Calculate the area of a rectangle with length 8 cm and width 5 cm.','short_answer',NULL,'40',10,4
WHERE NOT EXISTS (SELECT 1 FROM assessment_questions WHERE assessment_id=@a1 AND sort_order=4);

INSERT INTO assessment_submissions (assessment_id, student_id, submitted_at, answers, score, status, feedback, graded_by, graded_at)
SELECT @a1,@st1,DATE_SUB(NOW(), INTERVAL 6 DAY),'{"1":"6","2":"17","3":"true","4":"40"}',78,'graded','Strong work. Revise geometry proofs.',@u_teacher,DATE_SUB(NOW(), INTERVAL 5 DAY)
WHERE NOT EXISTS (SELECT 1 FROM assessment_submissions WHERE assessment_id=@a1 AND student_id=@st1);
INSERT INTO assessment_submissions (assessment_id, student_id, submitted_at, answers, score, status, feedback, graded_by, graded_at)
SELECT @a1,@st2,DATE_SUB(NOW(), INTERVAL 6 DAY),'{"1":"6","2":"15","3":"true","4":"35"}',65,'graded','Check prime numbers and area units.',@u_teacher,DATE_SUB(NOW(), INTERVAL 5 DAY)
WHERE NOT EXISTS (SELECT 1 FROM assessment_submissions WHERE assessment_id=@a1 AND student_id=@st2);
INSERT INTO assessment_submissions (assessment_id, student_id, submitted_at, answers, score, status, feedback, graded_by, graded_at)
SELECT @a1,@st3,DATE_SUB(NOW(), INTERVAL 6 DAY),'{"1":"6","2":"17","3":"true","4":"40"}',88,'graded','Excellent understanding.',@u_teacher,DATE_SUB(NOW(), INTERVAL 5 DAY)
WHERE NOT EXISTS (SELECT 1 FROM assessment_submissions WHERE assessment_id=@a1 AND student_id=@st3);
INSERT INTO assessment_submissions (assessment_id, student_id, submitted_at, answers, score, status)
SELECT @a1,@st4,DATE_SUB(NOW(), INTERVAL 6 DAY),'{"1":"5","2":"17","3":"true","4":"40"}',72,'submitted'
WHERE NOT EXISTS (SELECT 1 FROM assessment_submissions WHERE assessment_id=@a1 AND student_id=@st4);

-- ----------------------------------------------------------------------------
-- Marks (submitted + approved examples)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO marks (school_id, assessment_id, student_id, subject_id, class_id, term_id, teacher_id, score, max_score, grade, remarks, status, approved_by, approved_at)
VALUES
(@s1,@a1,@st1,1,1,@t1,@u_teacher,78,100,'B','Good progress','approved',@u_dos,DATE_SUB(NOW(), INTERVAL 4 DAY)),
(@s1,@a1,@st2,1,1,@t1,@u_teacher,65,100,'C','Needs revision','submitted',NULL,NULL),
(@s1,@a1,@st3,1,1,@t1,@u_teacher,88,100,'A','Excellent','approved',@u_dos,DATE_SUB(NOW(), INTERVAL 4 DAY)),
(@s1,@a2,@st1,2,1,@t1,@u_teacher,16,20,'B','Good practical work','submitted',NULL,NULL),
(@s1,@a2,@st2,2,1,@t1,@u_teacher,12,20,'C','Revise forces','submitted',NULL,NULL),
(@s1,@a3,@st4,3,2,@t1,@u_teacher,41,50,'B','Well structured','submitted',NULL,NULL),
(@s1,@a3,@st5,3,2,@t1,@u_teacher,46,50,'A','Outstanding','approved',@u_dos,DATE_SUB(NOW(), INTERVAL 2 DAY)),
(@s1,@a4,@st7,6,3,@t1,@u_teacher,34,40,'B','Good comprehension','submitted',NULL,NULL),
(@s1,@a4,@st8,6,3,@t1,@u_teacher,29,40,'C','Improve vocabulary','submitted',NULL,NULL),
(@s2,@a6,@st13,1,4,@t2,@u_teacher2,44,50,'A','Very good','approved',@u_admin3,DATE_SUB(NOW(), INTERVAL 3 DAY)),
(@s2,@a7,@st15,2,5,@t2,@u_teacher2,20,25,'B','Good effort','submitted',NULL,NULL);

-- ----------------------------------------------------------------------------
-- Attendance (last 10 days, weekdays only)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO student_attendance (school_id, student_id, class_id, attendance_date, status, recorded_by)
SELECT sp.school_id, sp.id, sp.class_id, DATE_SUB(CURDATE(), INTERVAL d.n DAY),
       CASE WHEN (sp.id + d.n) % 13 = 0 THEN 'absent'
            WHEN (sp.id + d.n) % 17 = 0 THEN 'late'
            ELSE 'present' END,
       @u_teacher
FROM student_profiles sp
JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
      UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) d
WHERE sp.school_id IN (@s1,@s2)
  AND sp.status='active'
  AND DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL d.n DAY)) BETWEEN 2 AND 6;

INSERT IGNORE INTO teacher_attendance (school_id, teacher_id, attendance_date, status, check_in, check_out, recorded_by)
SELECT u.school_id, u.id, DATE_SUB(CURDATE(), INTERVAL d.n DAY),
       CASE WHEN (u.id + d.n) % 19 = 0 THEN 'absent'
            WHEN (u.id + d.n) % 23 = 0 THEN 'late'
            ELSE 'present' END,
       '07:30:00','17:00:00', @u_sec
FROM users u
JOIN school_memberships m ON m.user_id=u.id
JOIN roles r ON r.id=m.role_id AND r.code IN ('teacher','headteacher','dos','hod')
JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
      UNION ALL SELECT 6 UNION ALL SELECT 7) d
WHERE u.school_id IN (@s1,@s2)
  AND DAYOFWEEK(DATE_SUB(CURDATE(), INTERVAL d.n DAY)) BETWEEN 2 AND 6;

-- ----------------------------------------------------------------------------
-- Timetable slots
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, academic_year) VALUES
(@s1,1,1,@u_teacher,'Monday','08:00:00','09:40:00','Lab A','2026-2027'),
(@s1,1,2,@u_teacher,'Monday','10:00:00','11:40:00','Lab B','2026-2027'),
(@s1,1,6,@u_teacher,'Tuesday','08:00:00','09:40:00','Room 12','2026-2027'),
(@s1,1,1,@u_teacher,'Wednesday','08:00:00','09:40:00','Lab A','2026-2027'),
(@s1,1,5,@u_teacher,'Thursday','10:00:00','11:40:00','ICT Lab','2026-2027'),
(@s1,1,2,@u_teacher,'Friday','08:00:00','09:40:00','Lab B','2026-2027'),
(@s1,3,6,@u_teacher,'Monday','08:00:00','09:40:00','Room 3','2026-2027'),
(@s1,3,1,@u_teacher,'Tuesday','10:00:00','11:40:00','Room 3','2026-2027'),
(@s1,3,7,@u_teacher,'Wednesday','08:00:00','09:40:00','Room 3','2026-2027'),
(@s1,3,4,@u_teacher,'Thursday','08:00:00','09:40:00','Science Lab','2026-2027'),
(@s1,3,6,@u_teacher,'Friday','10:00:00','11:40:00','Room 3','2026-2027'),
(@s1,6,1,@u_teacher,'Monday','10:00:00','11:40:00','Room 8','2026-2027'),
(@s1,6,5,@u_teacher,'Tuesday','08:00:00','09:40:00','ICT Lab','2026-2027'),
(@s1,6,2,@u_teacher,'Wednesday','10:00:00','11:40:00','Lab B','2026-2027'),
(@s1,6,6,@u_teacher,'Thursday','08:00:00','09:40:00','Room 8','2026-2027'),
(@s1,6,1,@u_teacher,'Friday','08:00:00','09:40:00','Room 8','2026-2027'),
(@s2,4,1,@u_teacher2,'Monday','08:00:00','09:40:00','Room 4','2026-2027'),
(@s2,4,6,@u_teacher2,'Tuesday','08:00:00','09:40:00','Room 4','2026-2027'),
(@s2,4,1,@u_teacher2,'Wednesday','08:00:00','09:40:00','Room 4','2026-2027'),
(@s2,5,2,@u_teacher2,'Monday','10:00:00','11:40:00','Lab 1','2026-2027'),
(@s2,5,3,@u_teacher2,'Tuesday','10:00:00','11:40:00','Lab 1','2026-2027'),
(@s2,5,2,@u_teacher2,'Thursday','08:00:00','09:40:00','Lab 1','2026-2027');

-- ----------------------------------------------------------------------------
-- Library
-- ----------------------------------------------------------------------------
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'Mathematics for Secondary Schools Book 4','REB','Mathematics','textbook','978-99977-0-001-1','CBC-aligned mathematics textbook for Senior 4',20,17,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='Mathematics for Secondary Schools Book 4');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'Physics in Everyday Life','REB','Physics','textbook','978-99977-0-002-8','Practical physics for secondary learners',15,14,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='Physics in Everyday Life');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'Chemistry Laboratory Manual','REB','Chemistry','book','978-99977-0-003-5','Safe laboratory procedures and experiments',10,10,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='Chemistry Laboratory Manual');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'English Grammar and Composition','Longhorn','English','book','978-99977-0-004-2','Grammar drills and guided composition',18,16,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='English Grammar and Composition');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'Kinyarwanda Literature Anthology','REB','Kinyarwanda','book','978-99977-0-005-9','Selected poems, stories and plays',12,12,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='Kinyarwanda Literature Anthology');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'ICT Skills for the 21st Century','REB','ICT','ebook','978-99977-0-006-6','Digital literacy and productivity tools',25,25,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='ICT Skills for the 21st Century');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'Mathematics Past Papers 2020-2025','REB','Mathematics','past_paper','978-99977-0-007-3','National examination practice papers',30,28,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='Mathematics Past Papers 2020-2025');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s1,'Introduction to Artificial Intelligence','Open Textbook','ICT','ebook','978-99977-0-008-0','Beginner-friendly AI concepts for teachers and learners',50,50,@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s1 AND title='Introduction to Artificial Intelligence');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s2,'Primary Mathematics Pupil Book 4','REB','Mathematics','textbook','978-99977-1-001-1','Primary 4 mathematics',20,19,@u_teacher3
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s2 AND title='Primary Mathematics Pupil Book 4');
INSERT INTO library_resources (school_id, title, author, category, resource_type, isbn, description, total_copies, available_copies, uploaded_by)
SELECT @s2,'Integrated Science for Primary Schools','REB','Science','textbook','978-99977-1-002-8','Primary science and elementary technology',18,18,@u_teacher3
WHERE NOT EXISTS (SELECT 1 FROM library_resources WHERE school_id=@s2 AND title='Integrated Science for Primary Schools');

SET @r1 = (SELECT id FROM library_resources WHERE school_id=@s1 AND title='Mathematics for Secondary Schools Book 4');
SET @r2 = (SELECT id FROM library_resources WHERE school_id=@s1 AND title='Physics in Everyday Life');
SET @r3 = (SELECT id FROM library_resources WHERE school_id=@s1 AND title='English Grammar and Composition');
SET @r4 = (SELECT id FROM library_resources WHERE school_id=@s1 AND title='Mathematics Past Papers 2020-2025');

INSERT INTO library_loans (school_id, resource_id, borrower_user_id, student_id, borrowed_at, due_at, returned_at, status, issued_by)
SELECT @s1,@r1,@u_student,@st1,DATE_SUB(NOW(), INTERVAL 12 DAY),DATE_SUB(NOW(), INTERVAL 5 DAY),NULL,'overdue',@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_loans WHERE resource_id=@r1 AND borrower_user_id=@u_student AND status='overdue');
INSERT INTO library_loans (school_id, resource_id, borrower_user_id, student_id, borrowed_at, due_at, returned_at, status, issued_by)
SELECT @s1,@r2,@u_student,@st1,DATE_SUB(NOW(), INTERVAL 20 DAY),DATE_SUB(NOW(), INTERVAL 13 DAY),DATE_SUB(NOW(), INTERVAL 14 DAY),'returned',@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_loans WHERE resource_id=@r2 AND borrower_user_id=@u_student AND status='returned');
INSERT INTO library_loans (school_id, resource_id, borrower_user_id, student_id, borrowed_at, due_at, returned_at, status, issued_by)
SELECT @s1,@r3,@u_teacher,NULL,DATE_SUB(NOW(), INTERVAL 3 DAY),DATE_ADD(NOW(), INTERVAL 11 DAY),NULL,'borrowed',@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_loans WHERE resource_id=@r3 AND borrower_user_id=@u_teacher AND status='borrowed');
INSERT INTO library_loans (school_id, resource_id, borrower_user_id, student_id, borrowed_at, due_at, returned_at, status, issued_by)
SELECT @s1,@r4,@u_student,@st1,DATE_SUB(NOW(), INTERVAL 1 DAY),DATE_ADD(NOW(), INTERVAL 13 DAY),NULL,'borrowed',@u_lib
WHERE NOT EXISTS (SELECT 1 FROM library_loans WHERE resource_id=@r4 AND borrower_user_id=@u_student AND status='borrowed');

-- ----------------------------------------------------------------------------
-- Class diary
-- ----------------------------------------------------------------------------
INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
SELECT @s1,1,1,@u_teacher,DATE_SUB(CURDATE(), INTERVAL 1 DAY),'Solving linear equations','Worked examples, group practice, board exercises','Exercise 2.4 questions 1-10','Learners struggled with negative coefficients; revisit tomorrow.','Unit 2: Algebra','submitted'
WHERE NOT EXISTS (SELECT 1 FROM class_diaries WHERE school_id=@s1 AND class_id=1 AND lesson_date=DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND subject_id=1);
INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
SELECT @s1,1,2,@u_teacher,DATE_SUB(CURDATE(), INTERVAL 2 DAY),'Measuring force with a spring balance','Demonstration, paired measurement, recording results','Write a short report on the experiment','Good engagement; two groups need more apparatus.','Unit 1: Measurement','reviewed'
WHERE NOT EXISTS (SELECT 1 FROM class_diaries WHERE school_id=@s1 AND class_id=1 AND lesson_date=DATE_SUB(CURDATE(), INTERVAL 2 DAY) AND subject_id=2);
INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
SELECT @s1,2,3,@u_teacher,DATE_SUB(CURDATE(), INTERVAL 3 DAY),'Periodic table trends','Guided reading, card sort, group presentation','Complete the periodic table worksheet','Groups need clearer instructions on presentation.','Unit 1: Matter','submitted'
WHERE NOT EXISTS (SELECT 1 FROM class_diaries WHERE school_id=@s1 AND class_id=2 AND lesson_date=DATE_SUB(CURDATE(), INTERVAL 3 DAY) AND subject_id=3);
INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
SELECT @s1,3,6,@u_teacher,DATE_SUB(CURDATE(), INTERVAL 1 DAY),'Reading comprehension: healthy living','Pre-reading vocabulary, silent reading, comprehension questions','Write a paragraph about healthy habits','Learners improved inference skills.','Unit 2: Reading','reviewed'
WHERE NOT EXISTS (SELECT 1 FROM class_diaries WHERE school_id=@s1 AND class_id=3 AND lesson_date=DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND subject_id=6);
INSERT INTO class_diaries (school_id, class_id, subject_id, teacher_id, lesson_date, topic, activities, homework, reflection, syllabus_unit, status)
SELECT @s2,4,1,@u_teacher2,DATE_SUB(CURDATE(), INTERVAL 1 DAY),'Multiplication of whole numbers','Number talk, worked examples, independent practice','Exercise 3.1 questions 1-12','Most learners mastered two-digit multiplication.','Unit 3: Multiplication','submitted'
WHERE NOT EXISTS (SELECT 1 FROM class_diaries WHERE school_id=@s2 AND class_id=4 AND lesson_date=DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND subject_id=1);

-- ----------------------------------------------------------------------------
-- CPD and professional portfolio
-- ----------------------------------------------------------------------------
INSERT INTO cpd_activities (school_id, title, description, provider, start_date, end_date, hours, status, created_by)
SELECT @s1,'Competency-Based Curriculum Assessment','Designing formative and summative assessment tasks aligned to CBC.','REB / University of Rwanda',DATE_SUB(CURDATE(), INTERVAL 30 DAY),DATE_SUB(CURDATE(), INTERVAL 25 DAY),15,'completed',@u_cpd
WHERE NOT EXISTS (SELECT 1 FROM cpd_activities WHERE school_id=@s1 AND title='Competency-Based Curriculum Assessment');
INSERT INTO cpd_activities (school_id, title, description, provider, start_date, end_date, hours, status, created_by)
SELECT @s1,'Digital Pedagogy and AI in the Classroom','Practical use of AI tools for lesson planning and feedback.','21CTA Academy',DATE_ADD(CURDATE(), INTERVAL 10 DAY),DATE_ADD(CURDATE(), INTERVAL 12 DAY),12,'planned',@u_cpd
WHERE NOT EXISTS (SELECT 1 FROM cpd_activities WHERE school_id=@s1 AND title='Digital Pedagogy and AI in the Classroom');
INSERT INTO cpd_activities (school_id, title, description, provider, start_date, end_date, hours, status, created_by)
SELECT @s1,'Inclusive Education for Diverse Learners','Strategies for supporting learners with special educational needs.','Rwanda Education Board',DATE_SUB(CURDATE(), INTERVAL 8 DAY),DATE_ADD(CURDATE(), INTERVAL 2 DAY),20,'ongoing',@u_cpd
WHERE NOT EXISTS (SELECT 1 FROM cpd_activities WHERE school_id=@s1 AND title='Inclusive Education for Diverse Learners');
INSERT INTO cpd_activities (school_id, title, description, provider, start_date, end_date, hours, status, created_by)
SELECT NULL,'Child Protection and Safeguarding','Mandatory safeguarding refresher for all school staff.','Ministry of Education',DATE_ADD(CURDATE(), INTERVAL 20 DAY),DATE_ADD(CURDATE(), INTERVAL 20 DAY),6,'planned',@u_super
WHERE NOT EXISTS (SELECT 1 FROM cpd_activities WHERE school_id IS NULL AND title='Child Protection and Safeguarding');

SET @c1 = (SELECT id FROM cpd_activities WHERE school_id=@s1 AND title='Competency-Based Curriculum Assessment');
SET @c2 = (SELECT id FROM cpd_activities WHERE school_id=@s1 AND title='Digital Pedagogy and AI in the Classroom');
SET @c3 = (SELECT id FROM cpd_activities WHERE school_id=@s1 AND title='Inclusive Education for Diverse Learners');

INSERT IGNORE INTO cpd_enrollments (cpd_activity_id, user_id, status, completed_at) VALUES
(@c1,@u_teacher,'completed',DATE_SUB(NOW(), INTERVAL 24 DAY)),
(@c1,@u_head,'completed',DATE_SUB(NOW(), INTERVAL 24 DAY)),
(@c2,@u_teacher,'enrolled',NULL),
(@c2,@u_hod,'enrolled',NULL),
(@c3,@u_teacher,'enrolled',NULL),
(@c3,@u_dos,'enrolled',NULL);

INSERT INTO professional_portfolios (user_id, school_id, title, category, description, evidence_url, achieved_on)
SELECT @u_teacher,@s1,'CBC Lesson Plan Exemplar','Lesson Planning','Published a model 5E lesson plan used for school-wide training.','https://example.invalid/portfolio/lesson-plan-exemplar',DATE_SUB(CURDATE(), INTERVAL 40 DAY)
WHERE NOT EXISTS (SELECT 1 FROM professional_portfolios WHERE user_id=@u_teacher AND title='CBC Lesson Plan Exemplar');
INSERT INTO professional_portfolios (user_id, school_id, title, category, description, evidence_url, achieved_on)
SELECT @u_teacher,@s1,'Regional Science Fair Mentor','Learner Support','Mentored learners to second place at the regional science fair.','https://example.invalid/portfolio/science-fair',DATE_SUB(CURDATE(), INTERVAL 90 DAY)
WHERE NOT EXISTS (SELECT 1 FROM professional_portfolios WHERE user_id=@u_teacher AND title='Regional Science Fair Mentor');
INSERT INTO professional_portfolios (user_id, school_id, title, category, description, evidence_url, achieved_on)
SELECT @u_teacher,@s1,'Digital Assessment Certificate','Professional Development','Completed 15 hours of CBC assessment training.','https://example.invalid/portfolio/assessment-certificate',DATE_SUB(CURDATE(), INTERVAL 24 DAY)
WHERE NOT EXISTS (SELECT 1 FROM professional_portfolios WHERE user_id=@u_teacher AND title='Digital Assessment Certificate');

-- ----------------------------------------------------------------------------
-- Announcements
-- ----------------------------------------------------------------------------
INSERT INTO announcements (school_id, title, body, audience, priority, created_by, published_at, expires_at)
SELECT @s1,'End of term examinations timetable released','The end of term examination timetable is now available. Please review it with your class and report any clashes to the Director of Studies.','all','high',@u_dos,DATE_SUB(NOW(), INTERVAL 2 DAY),DATE_ADD(NOW(), INTERVAL 20 DAY)
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE school_id=@s1 AND title='End of term examinations timetable released');
INSERT INTO announcements (school_id, title, body, audience, priority, created_by, published_at, expires_at)
SELECT @s1,'Staff CPD session on Friday','All teaching staff are invited to the digital pedagogy workshop on Friday at 14:00 in the ICT lab.','teachers','normal',@u_head,DATE_SUB(NOW(), INTERVAL 1 DAY),DATE_ADD(NOW(), INTERVAL 7 DAY)
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE school_id=@s1 AND title='Staff CPD session on Friday');
INSERT INTO announcements (school_id, title, body, audience, priority, created_by, published_at, expires_at)
SELECT @s1,'Parents meeting reminder','A parents meeting will be held next Saturday from 09:00 to 12:00. Attendance is important for term performance reviews.','parents','high',@u_admin,DATE_SUB(NOW(), INTERVAL 3 DAY),DATE_ADD(NOW(), INTERVAL 10 DAY)
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE school_id=@s1 AND title='Parents meeting reminder');
INSERT INTO announcements (school_id, title, body, audience, priority, created_by, published_at, expires_at)
SELECT NULL,'21CTA platform maintenance','The platform will be unavailable on Sunday from 02:00 to 04:00 for scheduled maintenance.','all','urgent',@u_super,DATE_SUB(NOW(), INTERVAL 1 DAY),DATE_ADD(NOW(), INTERVAL 5 DAY)
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE school_id IS NULL AND title='21CTA platform maintenance');
INSERT INTO announcements (school_id, title, body, audience, priority, created_by, published_at, expires_at)
SELECT @s2,'Library books return week','Please return all borrowed library books before Friday so that the catalogue can be audited.','all','normal',@u_admin3,DATE_SUB(NOW(), INTERVAL 2 DAY),DATE_ADD(NOW(), INTERVAL 6 DAY)
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE school_id=@s2 AND title='Library books return week');

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_teacher,@s1,'Marks awaiting submission','Term 1 mathematics marks for S4 MPGE must be submitted before Friday.','marks','/app/marks',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_teacher AND title='Marks awaiting submission');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_teacher,@s1,'CPD workshop reminder','Digital Pedagogy and AI in the Classroom starts in 10 days.','cpd','/app/cpd',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_teacher AND title='CPD workshop reminder');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_dos,@s1,'8 marks submissions pending approval','Marks from the mathematics and physics assessments are waiting for review.','marks','/app/marks',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_dos AND title='8 marks submissions pending approval');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_student,@s1,'New mathematics result released','Your Mathematics Monthly Test 1 result is now available.','marks','/app/marks',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_student AND title='New mathematics result released');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_student,@s1,'Library book overdue','Mathematics Past Papers 2020-2025 is due for return.','library','/app/library',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_student AND title='Library book overdue');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_parent,@s1,'Aline attendance alert','Aline was marked present every school day this week.','attendance','/app/attendance',1
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_parent AND title='Aline attendance alert');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_admin,@s1,'Teacher registration pending','A new teacher registration needs your approval.','registrations','/app/registrations',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_admin AND title='Teacher registration pending');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_super,NULL,'School registration pending','Nyagatare Girls Secondary School has requested access to the platform.','registrations','/app/registrations',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_super AND title='School registration pending');
INSERT INTO platform_notifications (user_id, school_id, title, message, type, link, is_read)
SELECT @u_lib,@s1,'Overdue library loans','One loan is overdue and needs follow-up.','library','/app/library',0
WHERE NOT EXISTS (SELECT 1 FROM platform_notifications WHERE user_id=@u_lib AND title='Overdue library loans');

-- ----------------------------------------------------------------------------
-- Audit log examples
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (user_id, school_id, action, module, entity, entity_id, details, ip_address)
SELECT @u_teacher,@s1,'login','auth','user',CAST(@u_teacher AS CHAR),'Successful login','127.0.0.1'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE user_id=@u_teacher AND action='login');
INSERT INTO audit_logs (user_id, school_id, action, module, entity, entity_id, details, ip_address)
SELECT @u_teacher,@s1,'mark.create','marks','mark',CAST(@a1 AS CHAR),'Entered mathematics marks for S4 MPGE','127.0.0.1'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE user_id=@u_teacher AND action='mark.create');
INSERT INTO audit_logs (user_id, school_id, action, module, entity, entity_id, details, ip_address)
SELECT @u_dos,@s1,'mark.approve','marks','mark',CAST(@a1 AS CHAR),'Approved mathematics marks','127.0.0.1'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE user_id=@u_dos AND action='mark.approve');
INSERT INTO audit_logs (user_id, school_id, action, module, entity, entity_id, details, ip_address)
SELECT @u_admin,@s1,'announcement.create','announcements','announcement','1','Published parents meeting reminder','127.0.0.1'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE user_id=@u_admin AND action='announcement.create');
INSERT INTO audit_logs (user_id, school_id, action, module, entity, entity_id, details, ip_address)
SELECT @u_super,NULL,'school.approve','platform','school',CAST(@s3 AS CHAR),'Approved Kigali Heights Secondary School','127.0.0.1'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE user_id=@u_super AND action='school.approve');

-- ----------------------------------------------------------------------------
-- Registration requests
-- ----------------------------------------------------------------------------
INSERT INTO registration_requests (request_type, school_name, district, province, contact_name, email, phone, role_code, message, status)
SELECT 'school','Nyagatare Girls Secondary School','Nyagatare','Eastern','Denise Uwera','denise.uwera@example.invalid','+250788900001',NULL,'We would like to onboard 700 learners and 32 teachers.','pending'
WHERE NOT EXISTS (SELECT 1 FROM registration_requests WHERE email='denise.uwera@example.invalid');
INSERT INTO registration_requests (request_type, school_name, district, province, contact_name, email, phone, role_code, message, status)
SELECT 'user','GS BUSANZA','Gatsibo','Eastern','Olivier Nsengimana','olivier.nsengimana@example.invalid','+250788900002','teacher','I teach mathematics and would like to join GS BUSANZA.','pending'
WHERE NOT EXISTS (SELECT 1 FROM registration_requests WHERE email='olivier.nsengimana@example.invalid');
INSERT INTO registration_requests (request_type, school_name, district, province, contact_name, email, phone, role_code, message, status)
SELECT 'user','Rukara Model School','Kayonza','Eastern','Chantal Uwamahoro','chantal.uwamahoro@example.invalid','+250788900003','student','Transfer learner from another school.','pending'
WHERE NOT EXISTS (SELECT 1 FROM registration_requests WHERE email='chantal.uwamahoro@example.invalid');
INSERT INTO registration_requests (request_type, school_name, district, province, contact_name, email, phone, role_code, message, status, reviewed_by, reviewed_at, review_notes)
SELECT 'school','Kigali Heights Secondary School','Gasabo','Kigali City','Robert Kagabo','robert.kagabo@example.invalid','+250788900004',NULL,'Requesting premium onboarding.','approved',@u_super,DATE_SUB(NOW(), INTERVAL 5 DAY),'Verified ownership documents.'
WHERE NOT EXISTS (SELECT 1 FROM registration_requests WHERE email='robert.kagabo@example.invalid');

-- ----------------------------------------------------------------------------
-- Enable every module for the active demo schools
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO school_modules (school_id, module_code, is_enabled)
SELECT s.id, m.code, 1 FROM schools s JOIN modules m WHERE s.status='active';

-- ----------------------------------------------------------------------------
-- Default school settings
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO school_settings (school_id, setting_key, setting_value) VALUES
(@s1,'motto','Knowledge is light'),
(@s1,'academic_year','2026-2027'),
(@s1,'grading_scale','A:80-100,B:70-79,C:60-69,D:50-59,E:0-49'),
(@s2,'motto','Excellence for all'),
(@s2,'academic_year','2026-2027'),
(@s2,'grading_scale','A:80-100,B:70-79,C:60-69,D:50-59,E:0-49');

-- ============================================================================
-- End of seed
-- ============================================================================
