#!/usr/bin/env python3
"""
실무진 면접 데이터 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text, and_
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.application import Application, InterviewStatus
from app.models.interview_question_log import InterviewQuestionLog, InterviewType
from app.models.user import User
from app.models.job import JobPost

def check_interview_data():
    """실무진 면접 데이터 상태 확인"""
    
    # DB 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("=== 실무진 면접 데이터 상태 확인 ===\n")
        
        # 1. AI_INTERVIEW_PASSED 상태인 지원자들 확인
        ai_passed_applications = db.query(Application).filter(
            and_(
                Application.interview_status == InterviewStatus.AI_INTERVIEW_PASSED.value,
                Application.interview_status.isnot(None)
            )
        ).all()
        
        print(f"📊 AI_INTERVIEW_PASSED 상태인 지원자: {len(ai_passed_applications)}명")
        
        for app in ai_passed_applications:
            user = db.query(User).filter(User.id == app.user_id).first()
            job_post = db.query(JobPost).filter(JobPost.id == app.job_post_id).first()
            print(f"  - 지원자 ID {app.user_id} ({user.name if user else 'Unknown'}): {job_post.title if job_post else 'Unknown'}")
        
        # 2. 실무진 면접 질답 데이터 확인
        first_interview_logs = db.query(InterviewQuestionLog).filter(
            InterviewQuestionLog.interview_type == InterviewType.FIRST_INTERVIEW
        ).all()
        
        print(f"\n📝 실무진 면접 질답 데이터: {len(first_interview_logs)}개")
        
        # 3. 지원자별 실무진 면접 질답 개수 확인
        application_question_counts = {}
        for log in first_interview_logs:
            app_id = log.application_id
            if app_id not in application_question_counts:
                application_question_counts[app_id] = 0
            application_question_counts[app_id] += 1
        
        print(f"\n📋 지원자별 실무진 면접 질답 개수:")
        for app_id, count in sorted(application_question_counts.items()):
            user = db.query(User).filter(User.id == app_id).first()
            print(f"  - 지원자 ID {app_id} ({user.name if user else 'Unknown'}): {count}개 질답")
        
        # 4. AI_INTERVIEW_PASSED 상태이면서 실무진 면접 질답이 있는 지원자 확인
        print(f"\n🎯 AI_INTERVIEW_PASSED + 실무진 면접 질답 보유 지원자:")
        target_applications = []
        
        for app in ai_passed_applications:
            question_count = application_question_counts.get(app.id, 0)
            user = db.query(User).filter(User.id == app.user_id).first()
            job_post = db.query(JobPost).filter(JobPost.id == app.job_post_id).first()
            
            if question_count > 0:
                target_applications.append(app)
                print(f"  ✅ 지원자 ID {app.user_id} ({user.name if user else 'Unknown'}): {question_count}개 질답")
            else:
                print(f"  ❌ 지원자 ID {app.user_id} ({user.name if user else 'Unknown'}): 질답 없음")
        
        print(f"\n📊 최종 평가 대상자: {len(target_applications)}명")
        
        # 5. 기존 평가 데이터 확인
        from app.models.interview_evaluation import InterviewEvaluation, EvaluationType
        
        existing_evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
        ).all()
        
        print(f"\n📈 기존 실무진 면접 평가 데이터: {len(existing_evaluations)}개")
        
        for eval in existing_evaluations:
            application = db.query(Application).filter(Application.id == eval.interview_id).first()
            user = db.query(User).filter(User.id == application.user_id).first() if application else None
            print(f"  - 평가 ID {eval.id}: 지원자 ID {eval.interview_id} ({user.name if user else 'Unknown'}) - {eval.total_score}점")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_interview_data() 