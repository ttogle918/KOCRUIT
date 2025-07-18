-- 현재 evaluation 데이터 확인 쿼리
SELECT id, evaluator_id, total_score, summary 
FROM interview_evaluation 
WHERE evaluator_id = 3108 
ORDER BY id;
