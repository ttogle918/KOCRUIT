#!/usr/bin/env python3
"""
공고 17의 지원자들에게 AI 면접 일정을 확정하고 AI 면접 질문을 생성하는 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, InterviewStatus
from app.services.interview_question_service import InterviewQuestionService
from app.api.v1.interview_question import parse_job_post_data

def generate_ai_questions():
    db = SessionLocal()
    try:
        # 공고 17 조회
        job = db.query(JobPost).filter(JobPost.id == 17).first()
        if not job:
            print("JobPost 17 not found")
            return
        
        print(f"JobPost 17: {job.title}")
        
        # 모든 지원자를 AI 면접 일정 확정 상태로 변경
        applications = db.query(Application).filter(Application.job_post_id == 17).all()
        print(f"총 {len(applications)}명의 지원자에게 AI 면접 일정 확정")
        
        for app in applications:
            app.interview_status = InterviewStatus.AI_INTERVIEW_SCHEDULED.value
            print(f"  - App {app.id}: AI 면접 일정 확정")
        
        db.commit()
        print("AI 면접 일정 확정 완료")
        
        # AI 면접 질문 생성
        print("\n=== AI 면접 질문 생성 시작 ===")
        
        # 공고 정보 파싱
        company_name = job.company.name if job.company else "KOSA공공"
        job_info = parse_job_post_data(job)
        
        # 각 지원자에 대해 AI 면접 질문 생성
        total_questions = 0
        for app in applications:
            try:
                print(f"\n지원자 {app.id}에 대한 AI 면접 질문 생성 중...")
                
                # LangGraph를 사용한 AI 면접 질문 생성
                questions_data = InterviewQuestionService.generate_individual_questions_for_applicant(
                    db=db,
                    application_id=app.id,
                    company_name=company_name,
                    job_info=job_info
                )
                
                if questions_data and "questions" in questions_data:
                    questions_count = len(questions_data["questions"])
                    total_questions += questions_count
                    print(f"  ✅ {questions_count}개 질문 생성 완료")
                else:
                    print(f"  ❌ 질문 생성 실패")
                    
            except Exception as e:
                print(f"  ❌ 지원자 {app.id} 질문 생성 오류: {str(e)}")
        
        print(f"\n=== AI 면접 질문 생성 완료 ===")
        print(f"총 {len(applications)}명의 지원자, {total_questions}개 질문 생성")
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_ai_questions() 