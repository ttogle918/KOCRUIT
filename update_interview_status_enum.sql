-- Update interview_status from NOT_SCHEDULED to AI_INTERVIEW_NOT_SCHEDULED
UPDATE application 
SET interview_status = 'AI_INTERVIEW_NOT_SCHEDULED' 
WHERE interview_status = 'NOT_SCHEDULED';

-- Verify the update
SELECT interview_status, COUNT(*) as count 
FROM application 
GROUP BY interview_status; 