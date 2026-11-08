-- ============================================================================
-- 21CTA public school portals
-- ----------------------------------------------------------------------------
-- Additive, rerunnable schema for school-owned public portal configuration.
-- Public APIs must require portal_status = 'approved' AND is_public = 1.
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_public_profiles (
    id INT(11) NOT NULL AUTO_INCREMENT,
    school_id INT(11) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    portal_status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    short_description VARCHAR(500) DEFAULT NULL,
    school_photo_url VARCHAR(500) DEFAULT NULL,
    hero_image_url VARCHAR(500) DEFAULT NULL,
    brand_primary VARCHAR(20) DEFAULT NULL,
    brand_accent VARCHAR(20) DEFAULT NULL,
    portal_sections JSON DEFAULT NULL,
    welcome_message TEXT DEFAULT NULL,
    history TEXT DEFAULT NULL,
    vision TEXT DEFAULT NULL,
    mission TEXT DEFAULT NULL,
    core_values TEXT DEFAULT NULL,
    headteacher_name VARCHAR(255) DEFAULT NULL,
    headteacher_message TEXT DEFAULT NULL,
    education_levels JSON DEFAULT NULL,
    facilities JSON DEFAULT NULL,
    admissions_info TEXT DEFAULT NULL,
    office_hours VARCHAR(255) DEFAULT NULL,
    map_url VARCHAR(500) DEFAULT NULL,
    social_links JSON DEFAULT NULL,
    seo_title VARCHAR(255) DEFAULT NULL,
    seo_description VARCHAR(500) DEFAULT NULL,
    approved_by INT(11) DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_school_public_profiles_school (school_id),
    UNIQUE KEY uq_school_public_profiles_slug (slug),
    KEY idx_school_public_profiles_visibility (portal_status, is_public, is_featured),
    CONSTRAINT fk_school_public_profiles_school FOREIGN KEY (school_id) REFERENCES schools (id) ON DELETE CASCADE,
    CONSTRAINT fk_school_public_profiles_approver FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS category VARCHAR(60) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_public TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_featured TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE library_resources
    ADD COLUMN IF NOT EXISTS visibility ENUM('public','school_members','teachers','students','admins') NOT NULL DEFAULT 'school_members',
    ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS education_level VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS language VARCHAR(40) NOT NULL DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS file_size BIGINT UNSIGNED DEFAULT NULL;
