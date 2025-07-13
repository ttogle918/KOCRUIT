-- Migration script to add job_post_id column to schedule table
-- This script should be run on existing databases to add the missing column

USE kocruit;

-- Add job_post_id column to schedule table
ALTER TABLE schedule 
ADD COLUMN job_post_id INT,
ADD FOREIGN KEY (job_post_id) REFERENCES jobpost(id);

-- Update existing interview schedules to have proper job_post_id if needed
-- This is optional and depends on your existing data structure
-- UPDATE schedule SET job_post_id = (SELECT id FROM jobpost WHERE title = schedule.title LIMIT 1) 
-- WHERE schedule_type = 'interview' AND job_post_id IS NULL; 