#!/usr/bin/env python3
"""
AI 면접 평가 점수 상태 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.job import JobPost
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.user import User
from app.models.interview_evaluation import InterviewEvaluation

def check_ai_interview_scores():
    """AI 면접 평가 점수 상태 확인"""
    db = next(get_db())
    
    try:
        print("=== AI 면접 평가 점수 상태 확인 ===\n")
        
        # 모든 공고 조회
        job_posts = db.query(JobPost).all()
        
        for job_post in job_posts:
            print(f"📋 공고: {job_post.title} (ID: {job_post.id})")
            
            # 해당 공고의 지원자들 조회
            applications = db.query(Application).filter(
                Application.job_post_id == job_post.id,
                Application.document_status == DocumentStatus.PASSED
            ).all()
            
            print(f"   전체 지원자 수: {len(applications)}")
            
            ai_interview_completed = 0
            ai_interview_passed = 0
            ai_interview_failed = 0
            no_score = 0
            
            for app in applications:
                user = db.query(User).filter(User.id == app.user_id).first()
                
                # AI 면접 평가 조회
                evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.application_id == app.id,
                    InterviewEvaluation.interview_type == 'AI_INTERVIEW'
                ).first()
                
                status_info = f"  👤 {user.name if user else 'Unknown'} (ID: {app.id})"
                status_info += f" - 면접상태: {app.interview_status}"
                
                if evaluation and evaluation.total_score is not None:
                    status_info += f" - 점수: {evaluation.total_score}"
                    ai_interview_completed += 1
                    
                    if evaluation.total_score >= 70:  # 70점 이상을 합격으로 가정
                        status_info += " ✅ (합격)"
                        ai_interview_passed += 1
                    else:
                        status_info += " ❌ (불합격)"
                        ai_interview_failed += 1
                else:
                    status_info += " - 점수: 없음 ⚠️"
                    no_score += 1
                
                print(status_info)
            
            print(f"   📊 AI 면접 완료: {ai_interview_completed}")
            print(f"   ✅ AI 면접 합격: {ai_interview_passed}")
            print(f"   ❌ AI 면접 불합격: {ai_interview_failed}")
            print(f"   ⚠️  점수 없음: {no_score}")
            print()
        
        # 전체 통계
        print("=== 전체 통계 ===")
        total_applications = db.query(Application).filter(
            Application.document_status == DocumentStatus.PASSED
        ).count()
        
        total_evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_type == 'AI_INTERVIEW'
        ).count()
        
        total_with_score = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_type == 'AI_INTERVIEW',
            InterviewEvaluation.total_score.isnot(None)
        ).count()
        
        print(f"전체 지원자: {total_applications}")
        print(f"AI 면접 평가 기록: {total_evaluations}")
        print(f"점수 있는 평가: {total_with_score}")
        print(f"점수 없는 평가: {total_evaluations - total_with_score}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_ai_interview_scores() 