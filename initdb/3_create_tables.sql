-- kocruit.application_backup definition
USE kocruit;
CREATE TABLE `application_backup` (
  `id` int NOT NULL DEFAULT '0',
  `user_id` int NOT NULL,
  `resume_id` int DEFAULT NULL,
  `job_post_id` int NOT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  `ai_score` decimal(5,2) DEFAULT NULL,
  `human_score` decimal(5,2) DEFAULT NULL,
  `final_score` decimal(5,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `application_source` varchar(255) DEFAULT NULL,
  `pass_reason` text,
  `fail_reason` text,
  `interview_status` enum('AI_INTERVIEW_PENDING','AI_INTERVIEW_SCHEDULED','AI_INTERVIEW_IN_PROGRESS','AI_INTERVIEW_COMPLETED','AI_INTERVIEW_PASSED','AI_INTERVIEW_FAILED','FIRST_INTERVIEW_SCHEDULED','FIRST_INTERVIEW_IN_PROGRESS','FIRST_INTERVIEW_COMPLETED','FIRST_INTERVIEW_PASSED','FIRST_INTERVIEW_FAILED','SECOND_INTERVIEW_SCHEDULED','SECOND_INTERVIEW_IN_PROGRESS','SECOND_INTERVIEW_COMPLETED','SECOND_INTERVIEW_PASSED','SECOND_INTERVIEW_FAILED','FINAL_INTERVIEW_SCHEDULED','FINAL_INTERVIEW_IN_PROGRESS','FINAL_INTERVIEW_COMPLETED','FINAL_INTERVIEW_PASSED','FINAL_INTERVIEW_FAILED','CANCELLED','REJECT') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'AI_INTERVIEW_PENDING',
  `document_status` enum('PENDING','REVIEWING','PASSED','REJECTED') DEFAULT 'PENDING',
  `written_test_status` enum('PENDING','IN_PROGRESS','PASSED','FAILED') NOT NULL DEFAULT 'PENDING',
  `written_test_score` float DEFAULT NULL,
  `ai_interview_score` decimal(5,2) DEFAULT NULL,
  `ai_interview_pass_reason` text,
  `ai_interview_fail_reason` text,
  `practical_score` float DEFAULT NULL,
  `executive_score` float DEFAULT NULL,
  `final_status` enum('PENDING','SELECTED','NOT_SELECTED') NOT NULL DEFAULT 'PENDING' COMMENT '최종 선발 상태'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.company definition

CREATE TABLE `company` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `bus_num` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `values_text` text COMMENT '회사 인재상·핵심 가치(줄바꿈, 쉼표 구분)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `bus_num` (`bus_num`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.email_verification_tokens definition

CREATE TABLE `email_verification_tokens` (
  `token` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `is_verified` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `ix_email_verification_tokens_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.high_performers definition

CREATE TABLE `high_performers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `education_level` enum('HIGH_SCHOOL','BACHELOR','MASTER','PHD') NOT NULL,
  `major` varchar(100) DEFAULT NULL,
  `certifications` json DEFAULT NULL,
  `total_experience_years` float DEFAULT NULL,
  `career_path` json DEFAULT NULL,
  `current_position` varchar(100) DEFAULT NULL,
  `promotion_speed_years` float DEFAULT NULL,
  `kpi_score` float DEFAULT NULL,
  `notable_projects` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `high_performers_chk_1` CHECK (((`kpi_score` >= 0) and (`kpi_score` <= 100)))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_evaluation_backup definition

CREATE TABLE `interview_evaluation_backup` (
  `id` int NOT NULL DEFAULT '0',
  `interview_id` int NOT NULL,
  `evaluator_id` int DEFAULT NULL,
  `is_ai` tinyint(1) DEFAULT '0',
  `evaluation_type` varchar(20) NOT NULL DEFAULT 'AI',
  `total_score` decimal(5,2) DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `summary` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_type_enum definition

CREATE TABLE `interview_type_enum` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_name` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.users definition

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'USER',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `birth_date` date DEFAULT NULL,
  `user_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.admin_user definition

CREATE TABLE `admin_user` (
  `id` int NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `admin_user_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.applicant_user definition

CREATE TABLE `applicant_user` (
  `id` int NOT NULL,
  `resume_file_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `applicant_user_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.applicantuser definition

CREATE TABLE `applicantuser` (
  `id` int NOT NULL,
  `resume_file_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `applicantuser_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.department definition

CREATE TABLE `department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `job_function` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `company_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `department_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.job definition

CREATE TABLE `job` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `company` varchar(100) DEFAULT NULL,
  `description` text,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_job_id` (`id`),
  CONSTRAINT `job_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.jobpost definition

CREATE TABLE `jobpost` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `qualifications` text,
  `conditions` text,
  `job_details` text,
  `procedures` text,
  `headcount` int DEFAULT NULL,
  `start_date` varchar(50) DEFAULT NULL,
  `end_date` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `deadline` varchar(50) DEFAULT NULL,
  `team_members` text,
  `weights` text,
  `status` varchar(20) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `schedules` text,
  `interview_report_done` tinyint(1) DEFAULT '0' COMMENT '면접 보고서 완료 여부',
  `final_report_done` tinyint(1) DEFAULT '0' COMMENT '최종 보고서 완료 여부',
  `progress_status` varchar(50) DEFAULT 'DRAFT',
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_jobpost_company_status` (`company_id`,`status`),
  CONSTRAINT `jobpost_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`),
  CONSTRAINT `jobpost_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
  CONSTRAINT `jobpost_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.notification definition

CREATE TABLE `notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message` text,
  `user_id` int DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `notification_chk_1` CHECK ((`is_read` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.post_interview definition

CREATE TABLE `post_interview` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `interview_date` varchar(10) NOT NULL,
  `interview_time` varchar(5) NOT NULL,
  `location` varchar(255) NOT NULL,
  `interview_type` varchar(20) DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `ix_post_interview_id` (`id`),
  CONSTRAINT `post_interview_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.resume definition

CREATE TABLE `resume` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text,
  `file_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `plagiarism_score` float DEFAULT NULL,
  `plagiarism_checked_at` datetime DEFAULT NULL,
  `most_similar_resume_id` int DEFAULT NULL,
  `similarity_threshold` float DEFAULT '0.9',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `resume_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2952 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.spec definition

CREATE TABLE `spec` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resume_id` int NOT NULL,
  `spec_type` varchar(255) NOT NULL,
  `spec_title` varchar(255) NOT NULL,
  `spec_description` text,
  PRIMARY KEY (`id`),
  KEY `resume_id` (`resume_id`),
  CONSTRAINT `spec_ibfk_1` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=82630 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.statistics_analysis definition

CREATE TABLE `statistics_analysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `chart_type` varchar(50) NOT NULL,
  `chart_data` json NOT NULL,
  `analysis` text NOT NULL,
  `insights` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `is_llm_used` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `ix_statistics_analysis_id` (`id`),
  CONSTRAINT `statistics_analysis_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.weight definition

CREATE TABLE `weight` (
  `id` int NOT NULL AUTO_INCREMENT,
  `target_type` varchar(255) NOT NULL,
  `jobpost_id` int DEFAULT NULL,
  `field_name` varchar(255) NOT NULL,
  `weight_value` float DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jobpost_id` (`jobpost_id`),
  CONSTRAINT `weight_ibfk_1` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=875 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.written_test_question definition

CREATE TABLE `written_test_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jobpost_id` int NOT NULL,
  `question_type` varchar(20) NOT NULL,
  `question_text` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_written_test_jobpost` (`jobpost_id`),
  CONSTRAINT `fk_written_test_jobpost` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.ai_insights definition

CREATE TABLE `ai_insights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `analysis_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `analysis_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `analysis_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'completed',
  `langgraph_execution_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `execution_time` float DEFAULT NULL,
  `score_analysis` json DEFAULT NULL,
  `correlation_analysis` json DEFAULT NULL,
  `trend_analysis` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `predictions` json DEFAULT NULL,
  `advanced_insights` json DEFAULT NULL,
  `pattern_analysis` json DEFAULT NULL,
  `risk_assessment` json DEFAULT NULL,
  `optimization_suggestions` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_post_id` (`job_post_id`),
  KEY `idx_analysis_date` (`analysis_date`),
  KEY `idx_analysis_type` (`analysis_type`),
  CONSTRAINT `ai_insights_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- kocruit.ai_insights_comparisons definition

CREATE TABLE `ai_insights_comparisons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `compared_job_post_id` int NOT NULL,
  `comparison_metrics` json DEFAULT NULL,
  `similarity_score` float DEFAULT NULL,
  `key_differences` json DEFAULT NULL,
  `advanced_comparison` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_post_id` (`job_post_id`),
  KEY `idx_compared_job_post_id` (`compared_job_post_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `ai_insights_comparisons_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_insights_comparisons_ibfk_2` FOREIGN KEY (`compared_job_post_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- kocruit.applicant_statistics_report definition

CREATE TABLE `applicant_statistics_report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `company_id` int NOT NULL,
  `total_applicants` int DEFAULT NULL,
  `passed_applicants` int DEFAULT NULL,
  `rejected_applicants` int DEFAULT NULL,
  `age_distribution` json DEFAULT NULL,
  `gender_distribution` json DEFAULT NULL,
  `education_distribution` json DEFAULT NULL,
  `experience_distribution` json DEFAULT NULL,
  `certificate_distribution` json DEFAULT NULL,
  `province_distribution` json DEFAULT NULL,
  `ai_analysis` text,
  `insights` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `status` enum('PENDING','GENERATING','COMPLETED','FAILED') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_applicant_statistics_report_id` (`id`),
  CONSTRAINT `applicant_statistics_report_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `applicant_statistics_report_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.application definition

CREATE TABLE `application` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `resume_id` int DEFAULT NULL,
  `job_post_id` int NOT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  `ai_score` decimal(5,2) DEFAULT NULL,
  `human_score` decimal(5,2) DEFAULT NULL,
  `final_score` decimal(5,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `application_source` varchar(255) DEFAULT NULL,
  `pass_reason` text,
  `fail_reason` text,
  `interview_status` enum('AI_INTERVIEW_SCHEDULED','AI_INTERVIEW_IN_PROGRESS','AI_INTERVIEW_COMPLETED','AI_INTERVIEW_PASSED','AI_INTERVIEW_FAILED','FIRST_INTERVIEW_SCHEDULED','FIRST_INTERVIEW_IN_PROGRESS','FIRST_INTERVIEW_COMPLETED','FIRST_INTERVIEW_PASSED','FIRST_INTERVIEW_FAILED','SECOND_INTERVIEW_SCHEDULED','SECOND_INTERVIEW_IN_PROGRESS','SECOND_INTERVIEW_COMPLETED','SECOND_INTERVIEW_PASSED','SECOND_INTERVIEW_FAILED','FINAL_INTERVIEW_SCHEDULED','FINAL_INTERVIEW_IN_PROGRESS','FINAL_INTERVIEW_COMPLETED','FINAL_INTERVIEW_PASSED','FINAL_INTERVIEW_FAILED','') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `document_status` enum('PENDING','REVIEWING','PASSED','REJECTED') DEFAULT 'PENDING',
  `written_test_status` enum('PENDING','IN_PROGRESS','PASSED','FAILED') NOT NULL DEFAULT 'PENDING',
  `written_test_score` float DEFAULT NULL,
  `ai_interview_score` decimal(5,2) DEFAULT NULL,
  `ai_interview_pass_reason` text,
  `ai_interview_fail_reason` text,
  `executive_score` float DEFAULT NULL,
  `practical_score` float DEFAULT NULL,
  `final_status` enum('PENDING','SELECTED','NOT_SELECTED') NOT NULL DEFAULT 'PENDING' COMMENT '최종 선발 상태',
  `ai_interview_video_url` varchar(400) DEFAULT '',
  `ai_interview_status` enum('PENDING','SCHEDULED','IN_PROGRESS','COMPLETED','PASSED','FAILED') DEFAULT NULL,
  `practical_interview_status` enum('PENDING','SCHEDULED','IN_PROGRESS','COMPLETED','PASSED','FAILED') DEFAULT NULL,
  `executive_interview_status` enum('PENDING','SCHEDULED','IN_PROGRESS','COMPLETED','PASSED','FAILED') DEFAULT NULL,
  `interview_stage` enum('AI_INTERVIEW','PRACTICAL_INTERVIEW','EXECUTIVE_INTERVIEW','FINAL_INTERVIEW') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `resume_id` (`resume_id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `idx_application_ai_interview_status` (`ai_interview_status`),
  KEY `idx_application_first_interview_status` (`practical_interview_status`),
  KEY `idx_application_second_interview_status` (`executive_interview_status`),
  KEY `idx_practical_interview_status` (`practical_interview_status`),
  KEY `idx_executive_interview_status` (`executive_interview_status`),
  CONSTRAINT `application_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `application_ibfk_2` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`),
  CONSTRAINT `application_ibfk_3` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `application_chk_1` CHECK ((`status` in (_utf8mb4'WAITING',_utf8mb4'PASSED',_utf8mb4'REJECTED'))),
  CONSTRAINT `chk_ai_interview_status` CHECK ((`ai_interview_status` in (_utf8mb4'PENDING',_utf8mb4'SCHEDULED',_utf8mb4'IN_PROGRESS',_utf8mb4'COMPLETED',_utf8mb4'PASSED',_utf8mb4'FAILED',_utf8mb4'CANCELLED'))),
  CONSTRAINT `chk_executive_interview_status` CHECK ((`executive_interview_status` in (_utf8mb4'PENDING',_utf8mb4'SCHEDULED',_utf8mb4'IN_PROGRESS',_utf8mb4'COMPLETED',_utf8mb4'PASSED',_utf8mb4'FAILED',_utf8mb4'CANCELLED'))),
  CONSTRAINT `chk_practical_interview_status` CHECK ((`practical_interview_status` in (_utf8mb4'PENDING',_utf8mb4'SCHEDULED',_utf8mb4'IN_PROGRESS',_utf8mb4'COMPLETED',_utf8mb4'PASSED',_utf8mb4'FAILED',_utf8mb4'CANCELLED')))
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.application_backup_2507242030 definition

CREATE TABLE `application_backup_2507242030` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `resume_id` int DEFAULT NULL,
  `job_post_id` int NOT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  `ai_score` decimal(5,2) DEFAULT NULL,
  `human_score` decimal(5,2) DEFAULT NULL,
  `final_score` decimal(5,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `application_source` varchar(255) DEFAULT NULL,
  `pass_reason` text,
  `fail_reason` text,
  `interview_status` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `document_status` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `written_test_status` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `written_test_score` float DEFAULT NULL,
  `ai_interview_score` decimal(5,2) DEFAULT NULL,
  `ai_interview_pass_reason` text,
  `ai_interview_fail_reason` text,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `resume_id` (`resume_id`),
  KEY `job_post_id` (`job_post_id`),
  CONSTRAINT `application_backup_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `application_backup_ibfk_2` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`),
  CONSTRAINT `application_backup_ibfk_3` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `application_backup_chk_1` CHECK ((`status` in (_utf8mb4'WAITING',_utf8mb4'PASSED',_utf8mb4'REJECTED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.application_status_history definition

CREATE TABLE `application_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL,
  `status` enum('PENDING','REVIEWING','INTERVIEW','PASSED','REJECTED') DEFAULT NULL,
  `comment` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `ix_application_status_history_id` (`id`),
  CONSTRAINT `application_status_history_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.company_user definition

CREATE TABLE `company_user` (
  `id` int NOT NULL,
  `company_id` int DEFAULT NULL,
  `bus_num` varchar(50) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `ranks` varchar(50) DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `company_user_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`),
  CONSTRAINT `company_user_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`),
  CONSTRAINT `company_user_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.companyuser definition

CREATE TABLE `companyuser` (
  `id` int NOT NULL,
  `company_id` int DEFAULT NULL,
  `bus_num` varchar(50) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `ranks` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `companyuser_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`),
  CONSTRAINT `companyuser_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`),
  CONSTRAINT `companyuser_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.document_screening_report definition

CREATE TABLE `document_screening_report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `company_id` int NOT NULL,
  `total_applications` int DEFAULT NULL,
  `passed_applications` int DEFAULT NULL,
  `rejected_applications` int DEFAULT NULL,
  `average_score` decimal(5,2) DEFAULT NULL,
  `pass_threshold` decimal(5,2) DEFAULT NULL,
  `score_distribution` json DEFAULT NULL,
  `evaluation_criteria` json DEFAULT NULL,
  `pass_reasons_summary` json DEFAULT NULL,
  `fail_reasons_summary` json DEFAULT NULL,
  `ai_evaluation_summary` text,
  `evaluation_insights` json DEFAULT NULL,
  `status` enum('PENDING','GENERATING','COMPLETED','FAILED') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_document_screening_report_id` (`id`),
  CONSTRAINT `document_screening_report_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `document_screening_report_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.evaluation_criteria definition

CREATE TABLE `evaluation_criteria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int DEFAULT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `suggested_criteria` json NOT NULL,
  `weight_recommendations` json NOT NULL,
  `evaluation_questions` json NOT NULL,
  `scoring_guidelines` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `evaluation_items` json DEFAULT NULL COMMENT '면접관이 실제로 점수를 매길 수 있는 구체적 평가 항목들',
  `evaluation_type` enum('job_based','resume_based') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'job_based',
  `application_id` int DEFAULT NULL,
  `resume_id` int DEFAULT NULL,
  `interview_stage` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_weight` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_total_score` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_job_post_id` (`job_post_id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_resume_id` (`resume_id`),
  CONSTRAINT `evaluation_criteria_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluation_criteria_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_evaluation_criteria_resume` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=305 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- kocruit.field_name_score definition

CREATE TABLE `field_name_score` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `field_name` varchar(255) NOT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `field_name_score_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=848 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.final_report definition

CREATE TABLE `final_report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `company_id` int NOT NULL,
  `total_applications` int DEFAULT NULL,
  `document_passed` int DEFAULT NULL,
  `interview_passed` int DEFAULT NULL,
  `final_selected` int DEFAULT NULL,
  `final_rejected` int DEFAULT NULL,
  `selection_rate` decimal(5,2) DEFAULT NULL,
  `average_final_score` decimal(5,2) DEFAULT NULL,
  `document_screening_summary` json DEFAULT NULL,
  `interview_summary` json DEFAULT NULL,
  `final_selection_summary` json DEFAULT NULL,
  `overall_analysis` text,
  `key_insights` json DEFAULT NULL,
  `final_recommendations` json DEFAULT NULL,
  `next_steps` json DEFAULT NULL,
  `status` enum('PENDING','GENERATING','COMPLETED','FAILED') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_final_report_id` (`id`),
  CONSTRAINT `final_report_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `final_report_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.growth_prediction_result definition

CREATE TABLE `growth_prediction_result` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `jobpost_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `total_score` float NOT NULL,
  `detail` json DEFAULT NULL,
  `comparison_chart_data` json DEFAULT NULL,
  `reasons` json DEFAULT NULL,
  `boxplot_data` json DEFAULT NULL,
  `detail_explanation` json DEFAULT NULL,
  `item_table` json DEFAULT NULL,
  `narrative` text,
  `analysis_version` varchar(50) DEFAULT NULL,
  `analysis_duration` float DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `jobpost_id` (`jobpost_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_growth_prediction_result_id` (`id`),
  CONSTRAINT `growth_prediction_result_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `growth_prediction_result_ibfk_2` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `growth_prediction_result_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.highlight_result definition

CREATE TABLE `highlight_result` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `jobpost_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `yellow_highlights` json DEFAULT NULL,
  `red_highlights` json DEFAULT NULL,
  `orange_highlights` json DEFAULT NULL,
  `purple_highlights` json DEFAULT NULL,
  `blue_highlights` json DEFAULT NULL,
  `all_highlights` json DEFAULT NULL,
  `analysis_version` varchar(50) DEFAULT NULL,
  `analysis_duration` float DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `jobpost_id` (`jobpost_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_highlight_result_id` (`id`),
  CONSTRAINT `highlight_result_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `highlight_result_ibfk_2` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `highlight_result_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_evaluation definition

CREATE TABLE `interview_evaluation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interview_id` int NOT NULL,
  `evaluator_id` int DEFAULT NULL,
  `is_ai` tinyint(1) DEFAULT '0',
  `evaluation_type` varchar(20) NOT NULL DEFAULT 'AI',
  `total_score` decimal(5,2) DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `summary` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `application_id` int DEFAULT NULL COMMENT '지원서 ID',
  `resume_id` int DEFAULT NULL COMMENT '이력서 ID',
  `interview_stage` varchar(20) DEFAULT NULL COMMENT '면접 단계 (practical/executive)',
  `interview_date` timestamp NULL DEFAULT NULL COMMENT '면접 날짜',
  `interview_duration` int DEFAULT NULL COMMENT '면접 소요 시간 (분)',
  `location` varchar(255) DEFAULT NULL COMMENT '면접 장소',
  `notes` text COMMENT '면접관 메모',
  PRIMARY KEY (`id`),
  KEY `interview_id` (`interview_id`),
  KEY `interview_evaluation_ibfk_2` (`evaluator_id`),
  KEY `fk_interview_evaluation_resume` (`resume_id`),
  KEY `idx_interview_evaluation_application_id` (`application_id`),
  KEY `idx_interview_evaluation_interview_stage` (`interview_stage`),
  KEY `idx_interview_evaluation_date` (`interview_date`),
  CONSTRAINT `fk_interview_evaluation_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `fk_interview_evaluation_resume` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`),
  CONSTRAINT `interview_evaluation_ibfk_2` FOREIGN KEY (`evaluator_id`) REFERENCES `company_user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `interview_evaluation_chk_1` CHECK ((`is_ai` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_evaluation_item definition

CREATE TABLE `interview_evaluation_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluation_id` int NOT NULL,
  `evaluate_type` text NOT NULL,
  `evaluate_score` decimal(5,2) NOT NULL,
  `grade` text,
  `comment` text,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `evaluation_id` (`evaluation_id`),
  CONSTRAINT `interview_evaluation_item_ibfk_1` FOREIGN KEY (`evaluation_id`) REFERENCES `interview_evaluation` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3459 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_question definition

CREATE TABLE `interview_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `question_text` varchar(1000) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `difficulty` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `job_post_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_interview_question_type_category` (`type`,`category`),
  KEY `idx_interview_question_app_type` (`application_id`,`type`),
  KEY `fk_interview_question_company` (`company_id`),
  KEY `fk_interview_question_job_post` (`job_post_id`),
  KEY `idx_interview_question_is_active` (`is_active`),
  KEY `idx_interview_question_type_active` (`type`,`is_active`),
  CONSTRAINT `fk_interview_question_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `fk_interview_question_company` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`),
  CONSTRAINT `fk_interview_question_job_post` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2599 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_question_log definition

CREATE TABLE `interview_question_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `interview_type` varchar(50) NOT NULL DEFAULT 'AI_INTERVIEW',
  `question_id` int DEFAULT NULL,
  `question_text` text NOT NULL,
  `answer_text` text,
  `answer_text_transcribed` text,
  `emotion` varchar(16) DEFAULT NULL,
  `attitude` varchar(16) DEFAULT NULL,
  `answer_score` float DEFAULT NULL,
  `answer_feedback` text,
  `answer_audio_url` varchar(255) DEFAULT NULL,
  `answer_video_url` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `stt_transcription` text COMMENT 'STT로 변환된 답변 텍스트',
  `stt_language` varchar(10) DEFAULT 'ko' COMMENT 'STT 언어 코드',
  `stt_segments` json DEFAULT NULL COMMENT 'STT 세그먼트 정보 (시간별)',
  `stt_avg_logprob` float DEFAULT NULL COMMENT 'STT 평균 로그 확률',
  `stt_compression_ratio` float DEFAULT NULL COMMENT 'STT 압축 비율',
  `stt_no_speech_prob` float DEFAULT NULL COMMENT 'STT 무음 확률',
  `stt_processing_time` float DEFAULT NULL COMMENT 'STT 처리 시간 (초)',
  `stt_model_version` varchar(50) DEFAULT NULL COMMENT '사용된 STT 모델 버전',
  `audio_filename` varchar(255) DEFAULT NULL COMMENT '오디오 파일명',
  `audio_duration_seconds` float DEFAULT NULL COMMENT '오디오 길이 (초)',
  `audio_file_size` int DEFAULT NULL COMMENT '오디오 파일 크기 (bytes)',
  `audio_channels` int DEFAULT NULL COMMENT '오디오 채널 수',
  `audio_sample_rate` int DEFAULT NULL COMMENT '오디오 샘플레이트',
  `insert_new_log` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_job_post_id` (`job_post_id`),
  KEY `idx_question_id` (`question_id`),
  KEY `idx_interview_question_log_type` (`interview_type`),
  KEY `idx_interview_question_log_app_type` (`application_id`,`interview_type`),
  KEY `idx_interview_question_log_stt_language` (`stt_language`),
  KEY `idx_interview_question_log_audio_filename` (`audio_filename`),
  CONSTRAINT `fk_interview_question_log_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `fk_interview_question_log_job_post` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `fk_interview_question_log_question` FOREIGN KEY (`question_id`) REFERENCES `interview_question` (`id`),
  CONSTRAINT `interview_question_log_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `interview_question_log_ibfk_2` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `interview_question_log_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `interview_question` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=847 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_report definition

CREATE TABLE `interview_report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `company_id` int NOT NULL,
  `total_interviews` int DEFAULT NULL,
  `ai_interviews` int DEFAULT NULL,
  `first_interviews` int DEFAULT NULL,
  `second_interviews` int DEFAULT NULL,
  `final_interviews` int DEFAULT NULL,
  `passed_interviews` int DEFAULT NULL,
  `failed_interviews` int DEFAULT NULL,
  `average_interview_score` decimal(5,2) DEFAULT NULL,
  `interview_scores_distribution` json DEFAULT NULL,
  `evaluation_criteria_scores` json DEFAULT NULL,
  `interviewer_feedback` json DEFAULT NULL,
  `common_questions` json DEFAULT NULL,
  `ai_interview_summary` text,
  `ai_interview_insights` json DEFAULT NULL,
  `status` enum('PENDING','GENERATING','COMPLETED','FAILED') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_interview_report_id` (`id`),
  CONSTRAINT `interview_report_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `interview_report_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interviewer_profile definition

CREATE TABLE `interviewer_profile` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluator_id` int NOT NULL,
  `latest_evaluation_id` int DEFAULT NULL,
  `strictness_score` decimal(5,2) DEFAULT NULL,
  `leniency_score` decimal(5,2) DEFAULT NULL,
  `consistency_score` decimal(5,2) DEFAULT NULL,
  `tech_focus_score` decimal(5,2) DEFAULT NULL,
  `personality_focus_score` decimal(5,2) DEFAULT NULL,
  `detail_level_score` decimal(5,2) DEFAULT NULL,
  `experience_score` decimal(5,2) DEFAULT NULL,
  `accuracy_score` decimal(5,2) DEFAULT NULL,
  `total_interviews` int DEFAULT NULL,
  `avg_score_given` decimal(5,2) DEFAULT NULL,
  `score_variance` decimal(5,2) DEFAULT NULL,
  `pass_rate` decimal(5,2) DEFAULT NULL,
  `avg_tech_score` decimal(5,2) DEFAULT NULL,
  `avg_personality_score` decimal(5,2) DEFAULT NULL,
  `avg_memo_length` decimal(8,2) DEFAULT NULL,
  `strictness_percentile` decimal(5,2) DEFAULT NULL,
  `consistency_percentile` decimal(5,2) DEFAULT NULL,
  `last_evaluation_date` datetime DEFAULT NULL,
  `profile_version` int DEFAULT NULL,
  `confidence_level` decimal(5,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `evaluator_id` (`evaluator_id`),
  KEY `latest_evaluation_id` (`latest_evaluation_id`),
  KEY `ix_interviewer_profile_id` (`id`),
  KEY `idx_interviewer_profile_focus` (`tech_focus_score`,`personality_focus_score`),
  KEY `idx_interviewer_profile_scores` (`strictness_score`,`consistency_score`),
  KEY `idx_interviewer_profile_evaluator` (`evaluator_id`),
  CONSTRAINT `interviewer_profile_ibfk_1` FOREIGN KEY (`evaluator_id`) REFERENCES `company_user` (`id`),
  CONSTRAINT `interviewer_profile_ibfk_2` FOREIGN KEY (`latest_evaluation_id`) REFERENCES `interview_evaluation` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interviewer_profile_history definition

CREATE TABLE `interviewer_profile_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interviewer_profile_id` int NOT NULL,
  `evaluation_id` int DEFAULT NULL,
  `old_values` text,
  `new_values` text,
  `change_type` varchar(50) NOT NULL,
  `change_reason` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `evaluation_id` (`evaluation_id`),
  KEY `idx_profile_history_evaluator` (`interviewer_profile_id`),
  KEY `idx_profile_history_date` (`created_at`),
  KEY `ix_interviewer_profile_history_id` (`id`),
  CONSTRAINT `interviewer_profile_history_ibfk_1` FOREIGN KEY (`interviewer_profile_id`) REFERENCES `interviewer_profile` (`id`),
  CONSTRAINT `interviewer_profile_history_ibfk_2` FOREIGN KEY (`evaluation_id`) REFERENCES `interview_evaluation` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.job_aptitude_report definition

CREATE TABLE `job_aptitude_report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `company_id` int NOT NULL,
  `total_analyzed` int DEFAULT NULL,
  `comprehensive_analysis_count` int DEFAULT NULL,
  `detailed_analysis_count` int DEFAULT NULL,
  `comparison_analysis_count` int DEFAULT NULL,
  `impact_analysis_count` int DEFAULT NULL,
  `comprehensive_summary` json DEFAULT NULL,
  `detailed_summary` json DEFAULT NULL,
  `comparison_summary` json DEFAULT NULL,
  `impact_summary` json DEFAULT NULL,
  `aptitude_analysis` text,
  `key_findings` json DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `status` enum('PENDING','GENERATING','COMPLETED','FAILED') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_job_aptitude_report_id` (`id`),
  CONSTRAINT `job_aptitude_report_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `job_aptitude_report_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.jobpost_role definition

CREATE TABLE `jobpost_role` (
  `jobpost_id` int NOT NULL,
  `company_user_id` int NOT NULL,
  `role` varchar(30) NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`jobpost_id`,`company_user_id`,`role`),
  KEY `company_user_id` (`company_user_id`),
  CONSTRAINT `jobpost_role_ibfk_1` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jobpost_role_ibfk_2` FOREIGN KEY (`company_user_id`) REFERENCES `company_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jobpost_role_chk_1` CHECK ((`role` in (_utf8mb4'MANAGER',_utf8mb4'MEMBER')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.langgraph_generated_data definition

CREATE TABLE `langgraph_generated_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `resume_id` int NOT NULL,
  `application_id` int DEFAULT NULL,
  `job_post_id` int DEFAULT NULL,
  `company_name` varchar(255) NOT NULL,
  `applicant_name` varchar(255) NOT NULL,
  `data_type` varchar(50) NOT NULL,
  `interview_stage` varchar(20) DEFAULT NULL,
  `evaluator_type` varchar(20) DEFAULT NULL,
  `generated_data` json NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `cache_key` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cache_key` (`cache_key`),
  KEY `resume_id` (`resume_id`),
  KEY `application_id` (`application_id`),
  KEY `job_post_id` (`job_post_id`),
  CONSTRAINT `langgraph_generated_data_ibfk_1` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`),
  CONSTRAINT `langgraph_generated_data_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `langgraph_generated_data_ibfk_3` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.media_analysis definition

CREATE TABLE `media_analysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `video_path` varchar(500) NOT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `analysis_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT 'completed',
  `frame_count` int DEFAULT NULL,
  `fps` float DEFAULT NULL,
  `duration` float DEFAULT NULL,
  `smile_frequency` float DEFAULT NULL,
  `eye_contact_ratio` float DEFAULT NULL,
  `emotion_variation` float DEFAULT NULL,
  `confidence_score` float DEFAULT NULL,
  `posture_changes` int DEFAULT NULL,
  `nod_count` int DEFAULT NULL,
  `posture_score` float DEFAULT NULL,
  `hand_gestures` json DEFAULT NULL,
  `eye_aversion_count` int DEFAULT NULL,
  `focus_ratio` float DEFAULT NULL,
  `gaze_consistency` float DEFAULT NULL,
  `audio_speech_rate` int DEFAULT NULL,
  `audio_clarity_score` float DEFAULT NULL,
  `volume_consistency` float DEFAULT NULL,
  `audio_transcription` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `overall_score` float DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `detailed_analysis` json DEFAULT NULL,
  `total_duration` float DEFAULT NULL COMMENT '총 영상 길이 (초)',
  `speaking_time` float DEFAULT NULL COMMENT '실제 발화 시간 (초)',
  `silence_ratio` float DEFAULT NULL COMMENT '침묵 비율 (0.0-1.0)',
  `speaking_speed_wpm` int DEFAULT NULL COMMENT '분당 발화 속도 (단어)',
  `avg_energy` float DEFAULT NULL COMMENT '평균 에너지',
  `avg_pitch` float DEFAULT NULL COMMENT '평균 피치 (Hz)',
  `segment_count` int DEFAULT NULL COMMENT '음성 세그먼트 수',
  `avg_segment_duration` float DEFAULT NULL COMMENT '평균 세그먼트 길이 (초)',
  `emotion` varchar(50) DEFAULT NULL COMMENT '감정 상태 (긍정적/부정적/중립)',
  `attitude` varchar(50) DEFAULT NULL COMMENT '태도 (적극적/소극적/보통)',
  `posture` varchar(50) DEFAULT NULL COMMENT '자세 상태 (좋음/보통/나쁨)',
  `feedback` text COMMENT 'AI 피드백 및 개선사항',
  `question_count` int DEFAULT NULL COMMENT '총 질문 수',
  `answer_quality_score` float DEFAULT NULL COMMENT '답변 품질 점수',
  `response_time_avg` float DEFAULT NULL COMMENT '평균 응답 시간 (초)',
  `topic_coverage_score` float DEFAULT NULL COMMENT '주제 커버리지 점수',
  `video_quality_score` float DEFAULT NULL COMMENT '영상 품질 점수',
  `audio_quality_score` float DEFAULT NULL COMMENT '오디오 품질 점수',
  `processing_time` float DEFAULT NULL COMMENT '분석 처리 시간 (초)',
  `model_version` varchar(100) DEFAULT NULL COMMENT '사용된 AI 모델 버전',
  `speech_rate` float DEFAULT NULL COMMENT '분당 발화 속도 (단어)',
  `clarity_score` float DEFAULT NULL COMMENT '명확도 점수',
  `transcription` text COMMENT '음성 전사 텍스트',
  `audio_analysis` json DEFAULT NULL COMMENT '오디오 분석 결과 (JSON)',
  `facial_expressions` json DEFAULT NULL COMMENT '얼굴 표정 분석 결과 (JSON)',
  `posture_analysis` json DEFAULT NULL COMMENT '자세 분석 결과 (JSON)',
  `gaze_analysis` json DEFAULT NULL COMMENT '시선 분석 결과 (JSON)',
  `speaker_analysis` json DEFAULT NULL COMMENT '화자 분석 결과 (JSON)',
  `emotion_analysis` json DEFAULT NULL COMMENT '감정 분석 결과 (JSON)',
  `context_analysis` json DEFAULT NULL COMMENT '맥락 분석 결과 (JSON)',
  `analysis_method` varchar(100) DEFAULT NULL COMMENT '분석 방법 (whisper, video, combined)',
  `analysis_version` varchar(50) DEFAULT NULL COMMENT '분석 모델 버전',
  `confidence_level` float DEFAULT NULL COMMENT '분석 신뢰도 (0.0-1.0)',
  `processing_priority` int DEFAULT '0' COMMENT '처리 우선순위',
  `retry_count` int DEFAULT '0' COMMENT '재시도 횟수',
  `last_error` text COMMENT '마지막 오류 메시지',
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_analysis_timestamp` (`analysis_timestamp`),
  KEY `idx_status` (`status`),
  KEY `idx_media_analysis_application_id` (`application_id`),
  KEY `idx_media_analysis_status` (`status`),
  KEY `idx_media_analysis_timestamp` (`analysis_timestamp`),
  KEY `idx_media_analysis_overall_score` (`overall_score`),
  CONSTRAINT `media_analysis_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_attitude` CHECK ((`attitude` in (_utf8mb4'적극적',_utf8mb4'소극적',_utf8mb4'보통'))),
  CONSTRAINT `chk_emotion` CHECK ((`emotion` in (_utf8mb4'긍정적',_utf8mb4'부정적',_utf8mb4'중립'))),
  CONSTRAINT `chk_overall_score` CHECK (((`overall_score` >= 0.0) and (`overall_score` <= 5.0))),
  CONSTRAINT `chk_posture` CHECK ((`posture` in (_utf8mb4'좋음',_utf8mb4'보통',_utf8mb4'나쁨'))),
  CONSTRAINT `chk_silence_ratio` CHECK (((`silence_ratio` >= 0.0) and (`silence_ratio` <= 1.0)))
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.personal_question_result definition

CREATE TABLE `personal_question_result` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `jobpost_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `questions` json DEFAULT NULL,
  `question_bundle` json DEFAULT NULL,
  `job_matching_info` text,
  `analysis_version` varchar(50) DEFAULT NULL,
  `analysis_duration` float DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `jobpost_id` (`jobpost_id`),
  KEY `company_id` (`company_id`),
  KEY `ix_personal_question_result_id` (`id`),
  CONSTRAINT `personal_question_result_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`) ON DELETE CASCADE,
  CONSTRAINT `personal_question_result_ibfk_2` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`) ON DELETE SET NULL,
  CONSTRAINT `personal_question_result_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.question_media_analysis definition

CREATE TABLE `question_media_analysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `question_log_id` int NOT NULL,
  `question_text` text NOT NULL,
  `question_start_time` float DEFAULT NULL,
  `question_end_time` float DEFAULT NULL,
  `answer_start_time` float DEFAULT NULL,
  `answer_end_time` float DEFAULT NULL,
  `analysis_timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) DEFAULT NULL,
  `smile_frequency` float DEFAULT NULL,
  `eye_contact_ratio` float DEFAULT NULL,
  `emotion_variation` float DEFAULT NULL,
  `confidence_score` float DEFAULT NULL,
  `posture_changes` int DEFAULT NULL,
  `nod_count` int DEFAULT NULL,
  `posture_score` float DEFAULT NULL,
  `hand_gestures` json DEFAULT NULL,
  `eye_aversion_count` int DEFAULT NULL,
  `focus_ratio` float DEFAULT NULL,
  `gaze_consistency` float DEFAULT NULL,
  `speech_rate` int DEFAULT NULL,
  `clarity_score` float DEFAULT NULL,
  `volume_consistency` float DEFAULT NULL,
  `transcription` text,
  `question_score` float DEFAULT NULL,
  `question_feedback` text,
  `detailed_analysis` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_question_video_analysis_question_log_id` (`question_log_id`),
  KEY `ix_question_video_analysis_id` (`id`),
  KEY `ix_question_video_analysis_application_id` (`application_id`),
  CONSTRAINT `question_media_analysis_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `question_media_analysis_ibfk_2` FOREIGN KEY (`question_log_id`) REFERENCES `interview_question_log` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.resume_memo definition

CREATE TABLE `resume_memo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `application_id` int DEFAULT NULL,
  `content` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `resume_memo_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `company_user` (`id`),
  CONSTRAINT `resume_memo_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.schedule definition

CREATE TABLE `schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_type` varchar(255) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `location` varchar(255) DEFAULT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(255) DEFAULT NULL,
  `job_post_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `job_post_id` (`job_post_id`),
  CONSTRAINT `schedule_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `company_user` (`id`),
  CONSTRAINT `schedule_ibfk_2` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.schedule_interview definition

CREATE TABLE `schedule_interview` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `schedule_date` timestamp NULL DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `application_id` int DEFAULT NULL,
  `interviewer_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `user_id` (`user_id`),
  KEY `fk_schedule_interview_application` (`application_id`),
  KEY `fk_schedule_interview_interviewer` (`interviewer_id`),
  CONSTRAINT `fk_schedule_interview_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `fk_schedule_interview_interviewer` FOREIGN KEY (`interviewer_id`) REFERENCES `company_user` (`id`),
  CONSTRAINT `schedule_interview_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `schedule` (`id`),
  CONSTRAINT `schedule_interview_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `company_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.schedule_interview_applicant definition

CREATE TABLE `schedule_interview_applicant` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_interview_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `status` varchar(20) DEFAULT 'WAITING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `interview_status` varchar(50) DEFAULT 'NOT_SCHEDULED',
  PRIMARY KEY (`id`),
  KEY `schedule_interview_id` (`schedule_interview_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `schedule_interview_applicant_ibfk_1` FOREIGN KEY (`schedule_interview_id`) REFERENCES `schedule_interview` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedule_interview_applicant_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `applicant_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.stt_analysis definition

CREATE TABLE `stt_analysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `audio_filename` varchar(255) NOT NULL,
  `audio_path` varchar(500) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `duration_ms` int DEFAULT NULL,
  `duration_seconds` float DEFAULT NULL,
  `channels` int DEFAULT NULL,
  `sample_rate` int DEFAULT NULL,
  `transcription_text` text NOT NULL,
  `language` varchar(10) DEFAULT NULL,
  `segments` json DEFAULT NULL,
  `analysis_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `model_version` varchar(50) DEFAULT NULL,
  `avg_logprob` float DEFAULT NULL,
  `compression_ratio` float DEFAULT NULL,
  `no_speech_prob` float DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `processing_time` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_stt_analysis_id` (`id`),
  KEY `ix_stt_analysis_application_id` (`application_id`),
  CONSTRAINT `stt_analysis_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.stt_analysis_batch definition

CREATE TABLE `stt_analysis_batch` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `batch_name` varchar(255) DEFAULT NULL,
  `analysis_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `file_count` int NOT NULL,
  `file_order` json DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `completed_files` int DEFAULT NULL,
  `failed_files` int DEFAULT NULL,
  `error_log` text,
  PRIMARY KEY (`id`),
  KEY `ix_stt_analysis_batch_application_id` (`application_id`),
  KEY `ix_stt_analysis_batch_id` (`id`),
  CONSTRAINT `stt_analysis_batch_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.written_test_answer definition

CREATE TABLE `written_test_answer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `jobpost_id` int NOT NULL,
  `question_id` int NOT NULL,
  `answer_text` text NOT NULL,
  `score` float DEFAULT NULL,
  `feedback` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `jobpost_id` (`jobpost_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `written_test_answer_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `written_test_answer_ibfk_2` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `written_test_answer_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `written_test_question` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=205 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.ai_interview_schedule definition

CREATE TABLE `ai_interview_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `applicant_user_id` int NOT NULL,
  `scheduled_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(255) DEFAULT 'SCHEDULED',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_job_post_id` (`job_post_id`),
  KEY `idx_applicant_user_id` (`applicant_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_scheduled_at` (`scheduled_at`),
  CONSTRAINT `fk_ai_schedule_application` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_schedule_jobpost` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_schedule_user` FOREIGN KEY (`applicant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.analysis_result definition

CREATE TABLE `analysis_result` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `resume_id` int NOT NULL,
  `jobpost_id` int DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `analysis_type` varchar(50) NOT NULL,
  `analysis_data` json NOT NULL,
  `analysis_version` varchar(50) DEFAULT NULL,
  `analysis_duration` float DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `resume_id` (`resume_id`),
  KEY `jobpost_id` (`jobpost_id`),
  KEY `company_id` (`company_id`),
  CONSTRAINT `analysis_result_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `analysis_result_ibfk_2` FOREIGN KEY (`resume_id`) REFERENCES `resume` (`id`),
  CONSTRAINT `analysis_result_ibfk_3` FOREIGN KEY (`jobpost_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `analysis_result_ibfk_4` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.application_view_log definition

CREATE TABLE `application_view_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL,
  `viewer_id` int DEFAULT NULL,
  `action` enum('VIEW','DOWNLOAD') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `viewer_id` (`viewer_id`),
  KEY `ix_application_view_log_id` (`id`),
  CONSTRAINT `application_view_log_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`),
  CONSTRAINT `application_view_log_ibfk_2` FOREIGN KEY (`viewer_id`) REFERENCES `companyuser` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.evaluation_detail definition

CREATE TABLE `evaluation_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluation_id` int NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `grade` varchar(10) DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `evaluation_id` (`evaluation_id`),
  CONSTRAINT `evaluation_detail_ibfk_1` FOREIGN KEY (`evaluation_id`) REFERENCES `interview_evaluation` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_panel definition

CREATE TABLE `interview_panel` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `schedule_id` int NOT NULL,
  `panel_name` varchar(255) NOT NULL,
  `panel_description` text,
  `status` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_post_id` (`job_post_id`),
  KEY `schedule_id` (`schedule_id`),
  KEY `ix_interview_panel_id` (`id`),
  CONSTRAINT `interview_panel_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`),
  CONSTRAINT `interview_panel_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `schedule` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_panel_assignment definition

CREATE TABLE `interview_panel_assignment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `schedule_id` int NOT NULL,
  `assignment_type` enum('SAME_DEPARTMENT','HR_DEPARTMENT') NOT NULL,
  `required_count` int NOT NULL DEFAULT '1',
  `status` enum('PENDING','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_panel_assignment_job_post` (`job_post_id`),
  KEY `idx_panel_assignment_schedule` (`schedule_id`),
  CONSTRAINT `interview_panel_assignment_ibfk_1` FOREIGN KEY (`job_post_id`) REFERENCES `jobpost` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_panel_assignment_ibfk_2` FOREIGN KEY (`schedule_id`) REFERENCES `schedule` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_panel_member definition

CREATE TABLE `interview_panel_member` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `company_user_id` int NOT NULL,
  `role` enum('INTERVIEWER','LEAD_INTERVIEWER') DEFAULT 'INTERVIEWER',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_panel_member` (`assignment_id`,`company_user_id`),
  KEY `company_user_id` (`company_user_id`),
  KEY `idx_panel_member_assignment` (`assignment_id`),
  CONSTRAINT `interview_panel_member_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `interview_panel_assignment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_panel_member_ibfk_2` FOREIGN KEY (`company_user_id`) REFERENCES `company_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- kocruit.interview_panel_request definition

CREATE TABLE `interview_panel_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `company_user_id` int NOT NULL,
  `notification_id` int DEFAULT NULL,
  `status` enum('PENDING','ACCEPTED','REJECTED') DEFAULT 'PENDING',
  `response_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notification_id` (`notification_id`),
  KEY `idx_panel_request_assignment` (`assignment_id`),
  KEY `idx_panel_request_company_user` (`company_user_id`),
  KEY `idx_panel_request_status` (`status`),
  CONSTRAINT `interview_panel_request_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `interview_panel_assignment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_panel_request_ibfk_2` FOREIGN KEY (`company_user_id`) REFERENCES `company_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_panel_request_ibfk_3` FOREIGN KEY (`notification_id`) REFERENCES `notification` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=180 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;