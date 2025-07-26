-- JobPost 테이블에 보고서 상태 컬럼 추가
-- 면접 보고서와 최종 보고서 완료 여부를 추적하기 위한 컬럼

USE kocruit;

-- JobPost 테이블에 보고서 상태 컬럼 추가
ALTER TABLE jobpost 
ADD COLUMN interview_report_done BOOLEAN DEFAULT FALSE COMMENT '면접 보고서 완료 여부',
ADD COLUMN final_report_done BOOLEAN DEFAULT FALSE COMMENT '최종 보고서 완료 여부';

-- 기존 데이터에 대해 보고서 상태 업데이트
-- 최종 합격자가 있는 공고는 면접 보고서 완료로 설정
UPDATE jobpost jp
SET interview_report_done = TRUE
WHERE EXISTS (
    SELECT 1 FROM application a 
    WHERE a.job_post_id = jp.id 
    AND a.status = 'PASSED'
    AND a.document_status = 'PASSED'
);

-- 최종 합격자가 있는 공고는 최종 보고서 완료로 설정
UPDATE jobpost jp
SET final_report_done = TRUE
WHERE EXISTS (
    SELECT 1 FROM application a 
    WHERE a.job_post_id = jp.id 
    AND a.status = 'PASSED'
    AND a.document_status = 'PASSED'
);

-- 변경사항 확인
SELECT 
    id,
    title,
    interview_report_done,
    final_report_done,
    status
FROM jobpost
ORDER BY id; 