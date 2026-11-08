ALTER TABLE `lessons` ADD COLUMN `is_completed` TINYINT(1) DEFAULT 0;
ALTER TABLE `lessons` ADD COLUMN `teacher_reflection` TEXT DEFAULT NULL;
