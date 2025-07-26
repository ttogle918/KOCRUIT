#!/usr/bin/env python3
"""
기존 AI 면접 평가 데이터 정리 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.application import Application, InterviewStatus
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem

def clear_ai_interview_data():
    """기존 AI 면접 평가 데이터 정리"""
    db = next(get_db())
    
    try:
        print("=== 기존 AI 면접 평가 데이터 정리 ===\n")
        
        # 1. AI 면접 평가 항목들 삭제
        ai_evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluation_type == 'AI'
        ).all()
        
        print(f"삭제할 AI 면접 평가 수: {len(ai_evaluations)}")
        
        for evaluation in ai_evaluations:
            # 평가 항목들 먼저 삭제
            items = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id == evaluation.id
            ).all()
            
            print(f"  - 평가 ID {evaluation.id}: {len(items)}개 항목 삭제")
            for item in items:
                db.delete(item)
            
            # 평가 자체 삭제
            db.delete(evaluation)
        
        # 2. Application 테이블의 ai_interview_score 초기화
        applications_with_score = db.query(Application).filter(
            Application.ai_interview_score.isnot(None)
        ).all()
        
        print(f"ai_interview_score 초기화할 지원자 수: {len(applications_with_score)}")
        
        for app in applications_with_score:
            app.ai_interview_score = None
            print(f"  - 지원자 ID {app.id}: ai_interview_score 초기화")
        
        # 3. AI 면접 상태 초기화
        ai_completed_applications = db.query(Application).filter(
            Application.interview_status.in_([
                InterviewStatus.AI_INTERVIEW_COMPLETED,
                InterviewStatus.AI_INTERVIEW_PASSED,
                InterviewStatus.AI_INTERVIEW_FAILED
            ])
        ).all()
        
        print(f"AI 면접 상태 초기화할 지원자 수: {len(ai_completed_applications)}")
        
        for app in ai_completed_applications:
            app.interview_status = InterviewStatus.AI_INTERVIEW_SCHEDULED
            print(f"  - 지원자 ID {app.id}: 면접 상태를 AI_INTERVIEW_SCHEDULED로 초기화")
        
        # 4. 변경사항 저장
        db.commit()
        
        print(f"\n✅ 데이터 정리 완료!")
        print(f"   - 삭제된 AI 평가: {len(ai_evaluations)}개")
        print(f"   - 초기화된 ai_interview_score: {len(applications_with_score)}개")
        print(f"   - 초기화된 면접 상태: {len(ai_completed_applications)}개")
        
    except Exception as e:
        print(f"❌ 데이터 정리 실패: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clear_ai_interview_data() 