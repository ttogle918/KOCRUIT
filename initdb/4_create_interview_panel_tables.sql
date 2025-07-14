-- Migration script to create interview panel auto-assignment tables
-- This script adds tables for managing interview panel assignments and responses

USE kocruit;

-- Table for tracking interview panel assignments
CREATE TABLE interview_panel_assignment (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    job_post_id     INT NOT NULL,
    schedule_id     INT NOT NULL,
    assignment_type ENUM('SAME_DEPARTMENT', 'HR_DEPARTMENT') NOT NULL,
    required_count  INT NOT NULL DEFAULT 1,
    status          ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (job_post_id) REFERENCES jobpost(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES schedule(id) ON DELETE CASCADE
);

-- Table for tracking individual interviewer requests
CREATE TABLE interview_panel_request (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id         INT NOT NULL,
    company_user_id       INT NOT NULL,
    notification_id       INT,
    status               ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    response_at          TIMESTAMP NULL,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES interview_panel_assignment(id) ON DELETE CASCADE,
    FOREIGN KEY (company_user_id) REFERENCES company_user(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notification(id) ON DELETE SET NULL
);

-- Table for tracking final interview panel members
CREATE TABLE interview_panel_member (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id         INT NOT NULL,
    company_user_id       INT NOT NULL,
    role                  ENUM('INTERVIEWER', 'LEAD_INTERVIEWER') DEFAULT 'INTERVIEWER',
    assigned_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES interview_panel_assignment(id) ON DELETE CASCADE,
    FOREIGN KEY (company_user_id) REFERENCES company_user(id) ON DELETE CASCADE,
    UNIQUE KEY unique_panel_member (assignment_id, company_user_id)
);

-- Indexes for better performance
CREATE INDEX idx_panel_assignment_job_post ON interview_panel_assignment(job_post_id);
CREATE INDEX idx_panel_assignment_schedule ON interview_panel_assignment(schedule_id);
CREATE INDEX idx_panel_request_assignment ON interview_panel_request(assignment_id);
CREATE INDEX idx_panel_request_company_user ON interview_panel_request(company_user_id);
CREATE INDEX idx_panel_request_status ON interview_panel_request(status);
CREATE INDEX idx_panel_member_assignment ON interview_panel_member(assignment_id); 