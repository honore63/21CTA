-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 30, 2026 at 06:12 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lessonplan_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_generation_logs`
--

CREATE TABLE `ai_generation_logs` (
  `id` int(11) NOT NULL,
  `lesson_plan_id` int(11) NOT NULL,
  `prompt_used` text DEFAULT NULL,
  `materials_referenced` text DEFAULT NULL COMMENT 'JSON array of material IDs used',
  `ai_provider` varchar(50) DEFAULT NULL COMMENT 'gemini or groq',
  `generation_time` float DEFAULT NULL COMMENT 'Time in seconds',
  `tokens_used` int(11) DEFAULT NULL COMMENT 'Approximate tokens used',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ai_generation_logs`
--


-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `class_size` int(11) NOT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `classes`
--


-- --------------------------------------------------------

--
-- Table structure for table `class_subjects`
--

CREATE TABLE `class_subjects` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `class_subjects`
--


-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `lesson_number` int(11) NOT NULL,
  `lesson_title` varchar(255) NOT NULL,
  `duration` int(11) NOT NULL COMMENT 'Duration in minutes',
  `teaching_date` date DEFAULT NULL,
  `term` varchar(50) DEFAULT NULL,
  `location` enum('inside','outside') DEFAULT 'inside',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_name` varchar(255) DEFAULT NULL,
  `teacher_name` varchar(255) DEFAULT NULL,
  `class_size` int(11) DEFAULT 40
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lessons`
--


-- --------------------------------------------------------

--
-- Table structure for table `lesson_materials`
--

CREATE TABLE `lesson_materials` (
  `lesson_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lesson_materials`
--


-- --------------------------------------------------------

--
-- Table structure for table `lesson_plans`
--

CREATE TABLE `lesson_plans` (
  `id` int(11) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `content` longtext NOT NULL COMMENT 'JSON formatted lesson plan',
  `version` int(11) DEFAULT 1,
  `generated_by_ai` tinyint(1) DEFAULT 1,
  `ai_provider` varchar(50) DEFAULT NULL COMMENT 'gemini or groq',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lesson_plans`
--


-- --------------------------------------------------------

--
-- Table structure for table `reference_materials`
--

CREATE TABLE `reference_materials` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `extracted_text` longtext DEFAULT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reference_materials`
--


-- --------------------------------------------------------

--
-- Table structure for table `special_needs_learners`
--

CREATE TABLE `special_needs_learners` (
  `id` int(11) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `type` varchar(255) NOT NULL COMMENT 'e.g., visual impairment, hearing impairment, physical disability',
  `number_of_learners` int(11) NOT NULL,
  `accommodations` text DEFAULT NULL COMMENT 'Specific accommodations needed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `special_needs_learners`
--


-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_custom` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--


-- --------------------------------------------------------

--
-- Table structure for table `teaching_materials`
--

CREATE TABLE `teaching_materials` (
  `id` int(11) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploader_role` enum('admin','teacher') NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(50) NOT NULL COMMENT 'pdf, doc, docx, ppt, pptx, jpg, png',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'File size in bytes',
  `subject_id` int(11) DEFAULT NULL,
  `material_type` enum('lesson_plan','teacher_guide','book','agenda','reference','other') NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teaching_materials`
--


-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` int(11) NOT NULL,
  `class_subject_id` int(11) NOT NULL,
  `unit_number` int(11) NOT NULL,
  `unit_title` varchar(255) NOT NULL,
  `key_competences` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `units`
--


-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','teacher') NOT NULL DEFAULT 'teacher',
  `school_name` varchar(255) DEFAULT NULL,
  `is_suspended` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--


-- --------------------------------------------------------

--
-- Stand-in structure for view `v_lesson_plans_overview`
-- (See below for the actual view)
--
CREATE TABLE `v_lesson_plans_overview` (
`lesson_plan_id` int(11)
,`lesson_id` int(11)
,`lesson_number` int(11)
,`lesson_title` varchar(255)
,`duration` int(11)
,`teaching_date` date
,`term` varchar(50)
,`unit_number` int(11)
,`unit_title` varchar(255)
,`subject_name` varchar(255)
,`class_name` varchar(255)
,`teacher_name` varchar(255)
,`version` int(11)
,`generated_by_ai` tinyint(1)
,`ai_provider` varchar(50)
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_teacher_classes`
-- (See below for the actual view)
--
CREATE TABLE `v_teacher_classes` (
`class_id` int(11)
,`class_name` varchar(255)
,`class_size` int(11)
,`academic_year` varchar(20)
,`teacher_id` int(11)
,`teacher_name` varchar(255)
,`school_name` varchar(255)
,`subject_count` bigint(21)
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Structure for view `v_lesson_plans_overview`
--
DROP TABLE IF EXISTS `v_lesson_plans_overview`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_lesson_plans_overview`  AS SELECT `lp`.`id` AS `lesson_plan_id`, `l`.`id` AS `lesson_id`, `l`.`lesson_number` AS `lesson_number`, `l`.`lesson_title` AS `lesson_title`, `l`.`duration` AS `duration`, `l`.`teaching_date` AS `teaching_date`, `l`.`term` AS `term`, `u`.`unit_number` AS `unit_number`, `u`.`unit_title` AS `unit_title`, `s`.`name` AS `subject_name`, `c`.`name` AS `class_name`, `t`.`full_name` AS `teacher_name`, `lp`.`version` AS `version`, `lp`.`generated_by_ai` AS `generated_by_ai`, `lp`.`ai_provider` AS `ai_provider`, `lp`.`created_at` AS `created_at`, `lp`.`updated_at` AS `updated_at` FROM ((((((`lesson_plans` `lp` join `lessons` `l` on(`lp`.`lesson_id` = `l`.`id`)) join `units` `u` on(`l`.`unit_id` = `u`.`id`)) join `class_subjects` `cs` on(`u`.`class_subject_id` = `cs`.`id`)) join `subjects` `s` on(`cs`.`subject_id` = `s`.`id`)) join `classes` `c` on(`cs`.`class_id` = `c`.`id`)) join `users` `t` on(`c`.`teacher_id` = `t`.`id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_teacher_classes`
--
DROP TABLE IF EXISTS `v_teacher_classes`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_teacher_classes`  AS SELECT `c`.`id` AS `class_id`, `c`.`name` AS `class_name`, `c`.`class_size` AS `class_size`, `c`.`academic_year` AS `academic_year`, `u`.`id` AS `teacher_id`, `u`.`full_name` AS `teacher_name`, `u`.`school_name` AS `school_name`, count(distinct `cs`.`subject_id`) AS `subject_count`, `c`.`created_at` AS `created_at` FROM ((`classes` `c` join `users` `u` on(`c`.`teacher_id` = `u`.`id`)) left join `class_subjects` `cs` on(`c`.`id` = `cs`.`class_id`)) GROUP BY `c`.`id`, `c`.`name`, `c`.`class_size`, `c`.`academic_year`, `u`.`id`, `u`.`full_name`, `u`.`school_name`, `c`.`created_at` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_generation_logs`
--
ALTER TABLE `ai_generation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lesson_plan` (`lesson_plan_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_teacher` (`teacher_id`);

--
-- Indexes for table `class_subjects`
--
ALTER TABLE `class_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_class_subject` (`class_id`,`subject_id`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_subject` (`subject_id`);

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_unit` (`unit_id`),
  ADD KEY `idx_teaching_date` (`teaching_date`),
  ADD KEY `idx_lesson_unit_number` (`unit_id`,`lesson_number`);

--
-- Indexes for table `lesson_materials`
--
ALTER TABLE `lesson_materials`
  ADD PRIMARY KEY (`lesson_id`,`material_id`),
  ADD KEY `material_id` (`material_id`);

--
-- Indexes for table `lesson_plans`
--
ALTER TABLE `lesson_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lesson` (`lesson_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `reference_materials`
--
ALTER TABLE `reference_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `teacher_id` (`teacher_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `special_needs_learners`
--
ALTER TABLE `special_needs_learners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lesson` (`lesson_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `teaching_materials`
--
ALTER TABLE `teaching_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_uploader` (`uploaded_by`),
  ADD KEY `idx_subject` (`subject_id`),
  ADD KEY `idx_material_type` (`material_type`),
  ADD KEY `idx_materials_type_subject` (`material_type`,`subject_id`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_class_subject` (`class_subject_id`),
  ADD KEY `idx_unit_class_subject_number` (`class_subject_id`,`unit_number`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_generation_logs`
--
ALTER TABLE `ai_generation_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `class_subjects`
--
ALTER TABLE `class_subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `lessons`
--
ALTER TABLE `lessons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `lesson_plans`
--
ALTER TABLE `lesson_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `reference_materials`
--
ALTER TABLE `reference_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `special_needs_learners`
--
ALTER TABLE `special_needs_learners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `teaching_materials`
--
ALTER TABLE `teaching_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ai_generation_logs`
--
ALTER TABLE `ai_generation_logs`
  ADD CONSTRAINT `ai_generation_logs_ibfk_1` FOREIGN KEY (`lesson_plan_id`) REFERENCES `lesson_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_subjects`
--
ALTER TABLE `class_subjects`
  ADD CONSTRAINT `class_subjects_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `class_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lessons`
--
ALTER TABLE `lessons`
  ADD CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lesson_materials`
--
ALTER TABLE `lesson_materials`
  ADD CONSTRAINT `lesson_materials_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lesson_materials_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `reference_materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `lesson_plans`
--
ALTER TABLE `lesson_plans`
  ADD CONSTRAINT `lesson_plans_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reference_materials`
--
ALTER TABLE `reference_materials`
  ADD CONSTRAINT `reference_materials_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reference_materials_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `special_needs_learners`
--
ALTER TABLE `special_needs_learners`
  ADD CONSTRAINT `special_needs_learners_ibfk_1` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `teaching_materials`
--
ALTER TABLE `teaching_materials`
  ADD CONSTRAINT `teaching_materials_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teaching_materials_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `units_ibfk_1` FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
