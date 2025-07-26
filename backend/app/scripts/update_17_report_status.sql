-- 17번 공고의 보고서 상태 업데이트
-- 최종 선발자가 선정된 후 보고서 버튼들이 활성화되도록 설정

USE kocruit;

-- JobPost 테이블에 보고서 상태 컬럼이 없으면 추가
ALTER TABLE jobpost 
ADD COLUMN IF NOT EXISTS interview_report_done BOOLEAN DEFAULT FALSE COMMENT '면접 보고서 완료 여부',
ADD COLUMN IF NOT EXISTS final_report_done BOOLEAN DEFAULT FALSE COMMENT '최종 보고서 완료 여부';

-- 17번 공고의 보고서 상태를 TRUE로 설정
-- final_status = 'SELECTED'인 지원자가 있으므로 보고서 완료로 설정
UPDATE jobpost 
SET 
    interview_report_done = TRUE,
    final_report_done = TRUE
WHERE id = 17
AND EXISTS (
    SELECT 1 FROM application a 
    WHERE a.job_post_id = 17 
    AND a.final_status = 'SELECTED'
);

-- 업데이트 결과 확인
SELECT 
    id,
    title,
    headcount,
    interview_report_done,
    final_report_done
FROM jobpost 
WHERE id = 17;

-- 최종 선발자 현황 확인
SELECT 
    '17번 공고 최종 선발 현황' as info,
    COUNT(*) as total_selected,
    AVG(a.final_score) as avg_final_score,
    MIN(a.final_score) as min_final_score,
    MAX(a.final_score) as max_final_score
FROM application a
WHERE a.job_post_id = 17
AND a.final_status = 'SELECTED'; 