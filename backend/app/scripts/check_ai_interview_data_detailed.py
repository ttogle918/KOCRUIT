#!/usr/bin/env python3
"""
AI 면접 데이터 상세 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.job import JobPost
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.user import User
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem

def check_ai_interview_data_detailed():
    """AI 면접 데이터 상세 확인"""
    db = next(get_db())
    
    try:
        print("=== AI 면접 데이터 상세 확인 ===\n")
        
        # 1. 전체 AI 면접 평가 조회
        evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluation_type == 'AI'
        ).all()
        
        print(f"📊 전체 AI 면접 평가 수: {len(evaluations)}")
        
        for evaluation in evaluations:
            print(f"\n🔍 평가 ID: {evaluation.id}")
            print(f"   - 지원자 ID: {evaluation.interview_id}")
            print(f"   - 총점: {evaluation.total_score}")
            print(f"   - 상태: {evaluation.status}")
            print(f"   - 생성일: {evaluation.created_at}")
            
            # 개별 평가 항목 조회
            items = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id == evaluation.id
            ).all()
            
            print(f"   - 평가 항목 수: {len(items)}")
            for item in items:
                print(f"     * {item.evaluate_type}: {item.evaluate_score} ({item.grade}) - {item.comment}")
        
        # 2. Application 테이블의 ai_interview_score 확인
        print(f"\n=== Application 테이블 ai_interview_score 확인 ===")
        applications_with_score = db.query(Application).filter(
            Application.ai_interview_score.isnot(None)
        ).all()
        
        print(f"ai_interview_score가 있는 지원자 수: {len(applications_with_score)}")
        
        for app in applications_with_score:
            user = db.query(User).filter(User.id == app.user_id).first()
            print(f"  - {user.name if user else 'Unknown'} (ID: {app.id}): {app.ai_interview_score}")
        
        # 3. 면접 상태별 분류
        print(f"\n=== 면접 상태별 분류 ===")
        status_counts = {}
        for status in InterviewStatus:
            count = db.query(Application).filter(
                Application.interview_status == status
            ).count()
            if count > 0:
                status_counts[status.value] = count
        
        for status, count in status_counts.items():
            print(f"  - {status}: {count}명")
        
        # 4. AI 면접 완료된 지원자들의 점수 확인
        print(f"\n=== AI 면접 완료된 지원자 점수 확인 ===")
        completed_applications = db.query(Application).filter(
            Application.interview_status.in_([
                InterviewStatus.AI_INTERVIEW_COMPLETED,
                InterviewStatus.AI_INTERVIEW_PASSED,
                InterviewStatus.AI_INTERVIEW_FAILED
            ])
        ).all()
        
        print(f"AI 면접 완료된 지원자 수: {len(completed_applications)}")
        
        for app in completed_applications:
            user = db.query(User).filter(User.id == app.user_id).first()
            evaluation = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id == app.id,
                InterviewEvaluation.evaluation_type == 'AI'
            ).first()
            
            print(f"  - {user.name if user else 'Unknown'} (ID: {app.id})")
            print(f"    * 면접 상태: {app.interview_status}")
            print(f"    * ai_interview_score: {app.ai_interview_score}")
            print(f"    * evaluation.total_score: {evaluation.total_score if evaluation else 'None'}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_ai_interview_data_detailed() 