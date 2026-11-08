CREATE TABLE IF NOT EXISTS `syllabuses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(255) NOT NULL,
  `grade_level` varchar(50) DEFAULT NULL,
  `content_text` longtext DEFAULT NULL,
  `structured_data` longtext DEFAULT NULL COMMENT 'JSON storage of units and lessons',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add syllabus_id to subjects if needed, but linking via name/grade might be more flexible.
-- For now, let's just keep it as a standalone lookup table.
