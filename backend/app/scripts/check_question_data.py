#!/usr/bin/env python3
"""
실무진 면접 질답 데이터 확인 스크립트
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

def check_question_data():
    """실무진 면접 질답 데이터 상태 확인"""
    
    # DB 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("=== 실무진 면접 질답 데이터 확인 ===\n")
        
        # 1. AI_INTERVIEW_PASSED 상태인 지원자들
        ai_passed_applications = db.query(Application).filter(
            and_(
                Application.interview_status == InterviewStatus.AI_INTERVIEW_PASSED.value,
                Application.interview_status.isnot(None)
            )
        ).all()
        
        print(f"📊 AI_INTERVIEW_PASSED 상태인 지원자: {len(ai_passed_applications)}명")
        
        for app in ai_passed_applications:
            user = db.query(User).filter(User.id == app.user_id).first()
            print(f"  - 지원자 ID {app.user_id} ({user.name if user else 'Unknown'})")
        
        # 2. 실무진 면접 질답 데이터 확인
        first_interview_logs = db.query(InterviewQuestionLog).filter(
            InterviewQuestionLog.interview_type == InterviewType.FIRST_INTERVIEW
        ).all()
        
        print(f"\n📝 실무진 면접 질답 데이터: {len(first_interview_logs)}개")
        
        # 3. 지원자별 질답 개수
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
        
        # 4. AI_INTERVIEW_PASSED + 실무진 면접 질답 보유 지원자
        print(f"\n🎯 AI_INTERVIEW_PASSED + 실무진 면접 질답 보유 지원자:")
        target_applications = []
        
        for app in ai_passed_applications:
            question_count = application_question_counts.get(app.id, 0)
            user = db.query(User).filter(User.id == app.user_id).first()
            
            if question_count > 0:
                target_applications.append(app)
                print(f"  ✅ 지원자 ID {app.user_id} ({user.name if user else 'Unknown'}): {question_count}개 질답")
                
                # 질답 내용 샘플 출력
                logs = db.query(InterviewQuestionLog).filter(
                    and_(
                        InterviewQuestionLog.application_id == app.id,
                        InterviewQuestionLog.interview_type == InterviewType.FIRST_INTERVIEW
                    )
                ).limit(2).all()
                
                for i, log in enumerate(logs):
                    print(f"    Q{i+1}: {log.question_text[:50]}...")
                    print(f"    A{i+1}: {log.answer_text[:50] if log.answer_text else '답변 없음'}...")
            else:
                print(f"  ❌ 지원자 ID {app.user_id} ({user.name if user else 'Unknown'}): 질답 없음")
        
        print(f"\n📊 최종 평가 대상자: {len(target_applications)}명")
        
        # 5. 질답 데이터가 없는 경우 원인 분석
        if len(target_applications) == 0:
            print(f"\n🚨 문제 분석:")
            print(f"   - AI_INTERVIEW_PASSED: {len(ai_passed_applications)}명")
            print(f"   - 실무진 면접 질답: {len(first_interview_logs)}개")
            print(f"   - 매칭되는 지원자: {len(target_applications)}명")
            
            # application_id 매칭 확인
            app_ids_with_questions = set(application_question_counts.keys())
            app_ids_ai_passed = {app.id for app in ai_passed_applications}
            
            print(f"   - 질답이 있는 application_id: {sorted(app_ids_with_questions)}")
            print(f"   - AI_PASSED인 application_id: {sorted(app_ids_ai_passed)}")
            
            # 교집합 확인
            intersection = app_ids_with_questions & app_ids_ai_passed
            print(f"   - 교집합 (매칭되는 ID): {sorted(intersection)}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_question_data() 