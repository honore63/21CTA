-- ============================================================================
-- 21CTA unified platform - core schema (additive)
-- ----------------------------------------------------------------------------
-- Adds the multi-school platform layer to the existing 21cta MySQL database.
-- The existing lesson-planner tables and data are preserved; this migration
-- only creates new tables and appends nullable columns to existing tables.
--
-- Target: MySQL 8.0+ / MariaDB 10.6+ (uses CREATE TABLE IF NOT EXISTS and
--         ADD COLUMN IF NOT EXISTS).
-- Re-runnable: yes. Safe to run multiple times.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Schools
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    school_type ENUM('nursery','primary','secondary','tvet','combined','other') NOT NULL DEFAULT 'secondary',
    ownership ENUM('public','private','government_aided','faith_based','other') NOT NULL DEFAULT 'public',
    district VARCHAR(100) DEFAULT NULL,
    province VARCHAR(100) DEFAULT NULL,
    sector VARCHAR(100) DEFAULT NULL,
    cell VARCHAR(100) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    website VARCHAR(255) DEFAULT NULL,
    logo_url VARCHAR(500) DEFAULT NULL,
    motto VARCHAR(255) DEFAULT NULL,
    status ENUM('pending','active','suspended','rejected') NOT NULL DEFAULT 'pending',
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'trial',
    max_users INT(11) NOT NULL DEFAULT 500,
    approved_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_schools_code (code),
    KEY idx_schools_status (status),
    KEY idx_schools_district (district, province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Roles and permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id INT(11) NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    scope ENUM('platform','school') NOT NULL DEFAULT 'school',
    is_system TINYINT(1) NOT NULL DEFAULT 1,
    level INT(11) NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code),
    KEY idx_permissions_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT(11) NOT NULL,
    permission_id INT(11) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (role_id, permission_id),
    KEY idx_role_permissions_permission (permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- School membership: a user may hold several roles in the same school
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_memberships (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    school_id INT(11) NOT NULL,
    role_id INT(11) NOT NULL,
    status ENUM('active','pending','suspended','inactive') NOT NULL DEFAULT 'active',
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    joined_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_membership (user_id, school_id, role_id),
    KEY idx_membership_school (school_id, role_id, status),
    KEY idx_membership_user (user_id, status),
    CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_membership_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_membership_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Academic calendar
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    name VARCHAR(50) NOT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_academic_year (school_id, name),
    KEY idx_academic_year_current (school_id, is_current),
    CONSTRAINT fk_academic_year_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS terms (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    academic_year_id INT(11) NOT NULL,
    name VARCHAR(50) NOT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    is_current TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_term (academic_year_id, name),
    KEY idx_term_school (school_id, is_current),
    CONSTRAINT fk_term_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_term_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- People profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    school_id INT(11) NOT NULL,
    staff_number VARCHAR(50) DEFAULT NULL,
    qualification VARCHAR(255) DEFAULT NULL,
    specialization VARCHAR(255) DEFAULT NULL,
    employment_date DATE DEFAULT NULL,
    status ENUM('active','on_leave','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_teacher_user (user_id),
    UNIQUE KEY uq_teacher_staff (school_id, staff_number),
    KEY idx_teacher_school (school_id, status),
    CONSTRAINT fk_teacher_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) DEFAULT NULL,
    school_id INT(11) NOT NULL,
    admission_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('male','female','other') DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    class_id INT(11) DEFAULT NULL,
    guardian_name VARCHAR(255) DEFAULT NULL,
    guardian_phone VARCHAR(30) DEFAULT NULL,
    guardian_email VARCHAR(255) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    status ENUM('active','graduated','transferred','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_user (user_id),
    UNIQUE KEY uq_student_admission (school_id, admission_number),
    KEY idx_student_school_class (school_id, class_id, status),
    KEY idx_student_name (last_name, first_name),
    CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_student_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_profiles (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    school_id INT(11) DEFAULT NULL,
    occupation VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_parent_user (user_id),
    KEY idx_parent_school (school_id),
    CONSTRAINT fk_parent_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_student_links (
    id INT(11) NOT NULL AUTO_INCREMENT,
    parent_profile_id INT(11) NOT NULL,
    student_profile_id INT(11) NOT NULL,
    relationship ENUM('mother','father','guardian','other') NOT NULL DEFAULT 'guardian',
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_parent_student (parent_profile_id, student_profile_id),
    KEY idx_link_student (student_profile_id),
    CONSTRAINT fk_link_parent FOREIGN KEY (parent_profile_id) REFERENCES parent_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_link_student FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Assessment and marks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assessments (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    class_id INT(11) NOT NULL,
    subject_id INT(11) NOT NULL,
    term_id INT(11) DEFAULT NULL,
    teacher_id INT(11) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    type ENUM('quiz','test','assignment','exam','project') NOT NULL DEFAULT 'test',
    total_marks DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    weight DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    assessment_date DATE DEFAULT NULL,
    due_date DATE DEFAULT NULL,
    duration_minutes INT(11) DEFAULT NULL,
    status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
    created_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_assessment_school (school_id, status, assessment_date),
    KEY idx_assessment_class (class_id, subject_id),
    KEY idx_assessment_teacher (teacher_id),
    CONSTRAINT fk_assessment_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE SET NULL,
    CONSTRAINT fk_assessment_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_questions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    assessment_id INT(11) NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice','short_answer','essay','true_false') NOT NULL DEFAULT 'short_answer',
    options LONGTEXT DEFAULT NULL,
    correct_answer TEXT DEFAULT NULL,
    marks DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    sort_order INT(11) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_question_assessment (assessment_id, sort_order),
    CONSTRAINT fk_question_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_submissions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    assessment_id INT(11) NOT NULL,
    student_id INT(11) NOT NULL,
    submitted_at DATETIME DEFAULT NULL,
    answers LONGTEXT DEFAULT NULL,
    score DECIMAL(6,2) DEFAULT NULL,
    status ENUM('submitted','graded','late','missing') NOT NULL DEFAULT 'submitted',
    feedback TEXT DEFAULT NULL,
    graded_by INT(11) DEFAULT NULL,
    graded_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission (assessment_id, student_id),
    KEY idx_submission_student (student_id),
    CONSTRAINT fk_submission_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_student FOREIGN KEY (student_id) REFERENCES student_profiles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marks (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    assessment_id INT(11) DEFAULT NULL,
    student_id INT(11) NOT NULL,
    subject_id INT(11) NOT NULL,
    class_id INT(11) NOT NULL,
    term_id INT(11) DEFAULT NULL,
    teacher_id INT(11) DEFAULT NULL,
    score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    grade VARCHAR(5) DEFAULT NULL,
    remarks VARCHAR(255) DEFAULT NULL,
    status ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
    approved_by INT(11) DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_mark (student_id, subject_id, term_id, assessment_id),
    KEY idx_mark_school (school_id, status),
    KEY idx_mark_class (class_id, subject_id),
    KEY idx_mark_student (student_id, subject_id),
    CONSTRAINT fk_mark_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_mark_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE SET NULL,
    CONSTRAINT fk_mark_student FOREIGN KEY (student_id) REFERENCES student_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_mark_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT fk_mark_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_mark_term FOREIGN KEY (term_id) REFERENCES terms (id) ON DELETE SET NULL,
    CONSTRAINT fk_mark_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Attendance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_attendance (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    student_id INT(11) NOT NULL,
    class_id INT(11) DEFAULT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present','absent','late','excused') NOT NULL DEFAULT 'present',
    notes VARCHAR(255) DEFAULT NULL,
    recorded_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_attendance (student_id, attendance_date),
    KEY idx_student_attendance_school (school_id, attendance_date, status),
    KEY idx_student_attendance_class (class_id, attendance_date),
    CONSTRAINT fk_student_attendance_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_attendance_student FOREIGN KEY (student_id) REFERENCES student_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_attendance_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_attendance (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    teacher_id INT(11) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present','absent','late','excused','on_leave') NOT NULL DEFAULT 'present',
    check_in TIME DEFAULT NULL,
    check_out TIME DEFAULT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    recorded_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_teacher_attendance (teacher_id, attendance_date),
    KEY idx_teacher_attendance_school (school_id, attendance_date, status),
    CONSTRAINT fk_teacher_attendance_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_attendance_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Timetable
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timetable_slots (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    class_id INT(11) NOT NULL,
    subject_id INT(11) NOT NULL,
    teacher_id INT(11) DEFAULT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50) DEFAULT NULL,
    academic_year VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_timetable_slot (class_id, day_of_week, start_time, academic_year),
    KEY idx_timetable_school (school_id, day_of_week),
    KEY idx_timetable_teacher (teacher_id, day_of_week),
    CONSTRAINT fk_timetable_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_timetable_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_timetable_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT fk_timetable_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Digital library
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_resources (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    resource_type ENUM('book','textbook','ebook','article','video','past_paper','other') NOT NULL DEFAULT 'book',
    isbn VARCHAR(50) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    file_url VARCHAR(500) DEFAULT NULL,
    cover_url VARCHAR(500) DEFAULT NULL,
    total_copies INT(11) NOT NULL DEFAULT 1,
    available_copies INT(11) NOT NULL DEFAULT 1,
    status ENUM('active','archived') NOT NULL DEFAULT 'active',
    uploaded_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_library_school (school_id, status, resource_type),
    KEY idx_library_title (title),
    CONSTRAINT fk_library_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_library_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS library_loans (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    resource_id INT(11) NOT NULL,
    borrower_user_id INT(11) NOT NULL,
    student_id INT(11) DEFAULT NULL,
    borrowed_at DATETIME NOT NULL DEFAULT current_timestamp(),
    due_at DATETIME NOT NULL,
    returned_at DATETIME DEFAULT NULL,
    status ENUM('borrowed','returned','overdue','lost') NOT NULL DEFAULT 'borrowed',
    issued_by INT(11) DEFAULT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_loan_school (school_id, status, due_at),
    KEY idx_loan_resource (resource_id),
    KEY idx_loan_borrower (borrower_user_id),
    CONSTRAINT fk_loan_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_resource FOREIGN KEY (resource_id) REFERENCES library_resources (id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_borrower FOREIGN KEY (borrower_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_student FOREIGN KEY (student_id) REFERENCES student_profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Digital class diary
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_diaries (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    class_id INT(11) NOT NULL,
    subject_id INT(11) NOT NULL,
    teacher_id INT(11) DEFAULT NULL,
    lesson_date DATE NOT NULL,
    topic VARCHAR(255) NOT NULL,
    activities TEXT DEFAULT NULL,
    homework TEXT DEFAULT NULL,
    reflection TEXT DEFAULT NULL,
    syllabus_unit VARCHAR(255) DEFAULT NULL,
    status ENUM('draft','submitted','reviewed') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_diary_school (school_id, lesson_date),
    KEY idx_diary_class (class_id, lesson_date),
    KEY idx_diary_teacher (teacher_id, lesson_date),
    CONSTRAINT fk_diary_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_diary_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_diary_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT fk_diary_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- CPD and professional portfolio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cpd_activities (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    provider VARCHAR(255) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    hours DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    status ENUM('planned','ongoing','completed','cancelled') NOT NULL DEFAULT 'planned',
    created_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_cpd_school (school_id, status, start_date),
    CONSTRAINT fk_cpd_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_cpd_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cpd_enrollments (
    id INT(11) NOT NULL AUTO_INCREMENT,
    cpd_activity_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    status ENUM('enrolled','completed','withdrawn') NOT NULL DEFAULT 'enrolled',
    completed_at DATETIME DEFAULT NULL,
    certificate_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_cpd_enrollment (cpd_activity_id, user_id),
    KEY idx_cpd_enrollment_user (user_id, status),
    CONSTRAINT fk_cpd_enrollment_activity FOREIGN KEY (cpd_activity_id) REFERENCES cpd_activities (id) ON DELETE CASCADE,
    CONSTRAINT fk_cpd_enrollment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS professional_portfolios (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    school_id INT(11) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    evidence_url VARCHAR(500) DEFAULT NULL,
    achieved_on DATE DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_portfolio_user (user_id, achieved_on),
    CONSTRAINT fk_portfolio_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Communication, audit, registrations, settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    audience ENUM('all','teachers','students','parents','staff','admins') NOT NULL DEFAULT 'all',
    priority ENUM('normal','high','urgent') NOT NULL DEFAULT 'normal',
    created_by INT(11) DEFAULT NULL,
    published_at DATETIME NOT NULL DEFAULT current_timestamp(),
    expires_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_announcement_school (school_id, published_at),
    KEY idx_announcement_audience (audience, published_at),
    CONSTRAINT fk_announcement_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_announcement_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_notifications (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    school_id INT(11) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT DEFAULT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    link VARCHAR(500) DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_notification_user (user_id, is_read, created_at),
    KEY idx_notification_school (school_id, created_at),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT(20) NOT NULL AUTO_INCREMENT,
    user_id INT(11) DEFAULT NULL,
    school_id INT(11) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) DEFAULT NULL,
    entity VARCHAR(50) DEFAULT NULL,
    entity_id VARCHAR(50) DEFAULT NULL,
    details LONGTEXT DEFAULT NULL,
    ip_address VARCHAR(64) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_audit_school (school_id, created_at),
    KEY idx_audit_user (user_id, created_at),
    KEY idx_audit_module (module, created_at),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registration_requests (
    id INT(11) NOT NULL AUTO_INCREMENT,
    request_type ENUM('school','user') NOT NULL DEFAULT 'school',
    school_id INT(11) DEFAULT NULL,
    school_name VARCHAR(255) DEFAULT NULL,
    district VARCHAR(100) DEFAULT NULL,
    province VARCHAR(100) DEFAULT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    role_code VARCHAR(50) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT(11) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    review_notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_registration_status (status, created_at),
    KEY idx_registration_school (school_id),
    CONSTRAINT fk_registration_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_registration_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(100) NOT NULL,
    setting_value LONGTEXT DEFAULT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_settings (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value LONGTEXT DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_school_setting (school_id, setting_key),
    CONSTRAINT fk_school_setting_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules (
    id INT(11) NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    icon VARCHAR(50) DEFAULT NULL,
    audience VARCHAR(255) DEFAULT NULL,
    route VARCHAR(100) DEFAULT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT(11) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_modules_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_modules (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_school_module (school_id, module_code),
    CONSTRAINT fk_school_module_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS generated_reports (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) DEFAULT NULL,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    parameters LONGTEXT DEFAULT NULL,
    generated_by INT(11) DEFAULT NULL,
    file_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_report_school (school_id, created_at),
    CONSTRAINT fk_report_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE SET NULL,
    CONSTRAINT fk_report_user FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Additive columns on existing lesson-planner tables
-- ============================================================================
ALTER TABLE users
    MODIFY COLUMN role ENUM(
        'admin','teacher','super_admin','school_admin','headteacher','dos',
        'student','parent','librarian','secretary','accountant','ict_admin',
        'exam_officer','hod','cpd_coordinator','staff'
    ) NOT NULL DEFAULT 'teacher';

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER school_name,
    ADD COLUMN IF NOT EXISTS is_email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_suspended,
    ADD COLUMN IF NOT EXISTS last_login_at DATETIME DEFAULT NULL AFTER is_email_verified,
    ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500) DEFAULT NULL AFTER last_login_at,
    ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en' AFTER profile_photo,
    ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'light' AFTER language;

ALTER TABLE users
    ADD INDEX IF NOT EXISTS idx_users_school (school_id);

ALTER TABLE classes
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER id,
    ADD COLUMN IF NOT EXISTS stream VARCHAR(50) DEFAULT NULL AFTER name,
    ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT NULL AFTER stream,
    ADD COLUMN IF NOT EXISTS academic_year_id INT(11) DEFAULT NULL AFTER academic_year;

ALTER TABLE classes
    ADD INDEX IF NOT EXISTS idx_classes_school (school_id);

ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER id,
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL AFTER description;

ALTER TABLE subjects
    ADD INDEX IF NOT EXISTS idx_subjects_school (school_id);

ALTER TABLE class_subjects
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER id,
    ADD COLUMN IF NOT EXISTS teacher_id INT(11) DEFAULT NULL AFTER subject_id;

ALTER TABLE class_subjects
    ADD INDEX IF NOT EXISTS idx_class_subjects_school (school_id),
    ADD INDEX IF NOT EXISTS idx_class_subjects_teacher (teacher_id);

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER id;

ALTER TABLE lessons
    ADD INDEX IF NOT EXISTS idx_lessons_school (school_id);

ALTER TABLE lesson_plans
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER id;

ALTER TABLE lesson_plans
    ADD INDEX IF NOT EXISTS idx_lesson_plans_school (school_id);

ALTER TABLE teacher_schedules
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER id;

ALTER TABLE teacher_schedules
    ADD INDEX IF NOT EXISTS idx_teacher_schedules_school (school_id);

ALTER TABLE registration_requests
    ADD COLUMN IF NOT EXISTS school_id INT(11) DEFAULT NULL AFTER request_type;

ALTER TABLE registration_requests
    ADD INDEX IF NOT EXISTS idx_registration_school (school_id);

-- ============================================================================
-- End of migration
-- ============================================================================
