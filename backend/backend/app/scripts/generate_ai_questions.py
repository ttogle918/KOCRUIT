#!/usr/bin/env python3
"""
LangGraph AI 면접 질문 생성 및 DB 저장 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, InterviewStatus
from app.models.interview_question import InterviewQuestion, QuestionType
from app.api.v1.interview_question import parse_job_post_data

def generate_langgraph_questions():
    """LangGraph로 AI 면접 질문 생성 및 DB 저장"""
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
        
        # 기존 AI 면접 질문 삭제
        deleted_count = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job.id,
            InterviewQuestion.types == QuestionType.AI_INTERVIEW
        ).delete()
        print(f"기존 AI 면접 질문 {deleted_count}개 삭제")
        
        # 공고 정보 파싱
        company_name = job.company.name if job.company else "KOSA공공"
        job_info = parse_job_post_data(job)
        
        # LangGraph 워크플로우 import
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), 'agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        total_questions = 0
        
        # 각 지원자에 대해 LangGraph AI 면접 질문 생성
        for app in applications:
            try:
                print(f"\n🔄 지원자 {app.id}에 대한 LangGraph 질문 생성 중...")
                
                # 지원자의 이력서 정보 조회
                resume_text = ""
                if app.resume_id:
                    from app.models.resume import Resume
                    resume = db.query(Resume).filter(Resume.id == app.resume_id).first()
                    if resume and resume.content:
                        resume_text = resume.content
                
                # LangGraph 워크플로우 실행
                workflow_result = generate_comprehensive_interview_questions(
                    resume_text=resume_text,
                    job_info=job_info,
                    company_name=company_name,
                    applicant_name=app.applicant.name if app.applicant else "",
                    interview_type="ai"
                )
                
                # 결과에서 AI 면접 질문 추출
                question_bundle = workflow_result.get("question_bundle", {})
                ai_questions = question_bundle.get("ai", {})
                
                # 질문 개수 계산 및 저장
                questions_count = 0
                for category, questions in ai_questions.items():
                    if isinstance(questions, list):
                        for question_text in questions:
                            interview_question = InterviewQuestion(
                                application_id=app.id,
                                job_post_id=None,
                                company_id=None,
                                type=QuestionType.AI_INTERVIEW,
                                question_text=question_text,
                                category=f"langgraph_{category}",
                                difficulty="medium"
                            )
                            db.add(interview_question)
                            questions_count += 1
                    elif isinstance(questions, dict) and "questions" in questions:
                        for question_text in questions["questions"]:
                            interview_question = InterviewQuestion(
                                application_id=app.id,
                                job_post_id=None,
                                company_id=None,
                                type=QuestionType.AI_INTERVIEW,
                                question_text=question_text,
                                category=f"langgraph_{category}",
                                difficulty="medium"
                            )
                            db.add(interview_question)
                            questions_count += 1
                
                total_questions += questions_count
                print(f"  ✅ {questions_count}개 LangGraph 질문 생성 완료")
                print(f"  📝 질문 카테고리: {list(ai_questions.keys())}")
                    
            except Exception as e:
                print(f"  ❌ 지원자 {app.id} LangGraph 질문 생성 오류: {str(e)}")
                import traceback
                print(f"  상세 오류: {traceback.format_exc()}")
        
        db.commit()
        print(f"\n🎉 LangGraph AI 면접 질문 생성 완료!")
        print(f"공고 {job.id}: {total_questions}개 LangGraph 질문 생성")
        print(f"지원자 {len(applications)}명: AI 면접 일정 확정")
        
    except Exception as e:
        print(f"❌ 스크립트 실행 실패: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎯 루트의 LangGraph 스크립트 실행 시작!")
    generate_langgraph_questions() 