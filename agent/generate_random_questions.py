#!/usr/bin/env python3
"""
LangGraph + 고정 질문 랜덤 선택 AI 면접 질문 생성 스크립트
"""

import sys
import os
import random
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, InterviewStatus
from app.models.interview_question import InterviewQuestion, QuestionType
from app.api.v1.interview_question import parse_job_post_data

def generate_fixed_questions(job, db):
    """고정 질문 생성"""
    print("🔄 고정 질문 생성 중...")
    
    # 공통 질문 (company_id 기반)
    common_questions = [
        "자기소개를 해주세요.",
        "본인의 장단점은 무엇인가요?",
        "실패 경험을 말해주시고, 어떻게 극복했나요?",
        "인생에서 가장 의미 있었던 경험은 무엇인가요?",
        "동료와 갈등이 생겼을 때 어떻게 해결하나요?",
        "마감 기한이 촉박한 업무가 주어진다면 어떻게 대처하겠습니까?",
        "고객이 불만을 제기할 때 당신의 대응 방식은?"
    ]
    
    # 직무별 시나리오 질문 (job_post_id 기반)
    job_specific_questions = [
        "업무 중 예상치 못한 문제가 발생했을 때 어떻게 해결하시겠습니까?",
        "새로운 기술이나 방법을 배워야 할 때 어떻게 접근하시나요?",
        "앞으로의 커리어 계획은 어떻게 되시나요?",
        "성공적인 직장생활을 위해 가장 중요한 것은 무엇이라고 생각하시나요?",
        "업무와 개인생활의 균형을 어떻게 맞추시겠습니까?",
        "직장에서 가장 중요하다고 생각하는 가치는 무엇인가요?"
    ]
    
    # 게임 테스트 (고정 데이터)
    game_tests = [
        "숫자 기억력 테스트: 숫자 4~9개를 순서대로 기억하기",
        "패턴 찾기: 화면에 뜨는 도형이나 숫자의 규칙 찾기",
        "반응 속도 테스트: 특정 색/도형이 뜰 때 클릭"
    ]
    
    # 회사 정보 조회
    company_id = job.company_id if job.company else None
    
    # 1. 공통 질문 저장 (company_id 기반)
    common_saved = 0
    for i, question in enumerate(common_questions):
        interview_question = InterviewQuestion(
            application_id=None,
            job_post_id=None,
            company_id=company_id,
            type=QuestionType.AI_INTERVIEW,
            question_text=question,
            category="common",
            difficulty="medium"
        )
        db.add(interview_question)
        common_saved += 1
    
    # 2. 직무별 질문 저장 (job_post_id 기반)
    job_saved = 0
    for i, question in enumerate(job_specific_questions):
        interview_question = InterviewQuestion(
            application_id=None,
            job_post_id=job.id,
            company_id=None,
            type=QuestionType.AI_INTERVIEW,
            question_text=question,
            category="job_specific",
            difficulty="medium"
        )
        db.add(interview_question)
        job_saved += 1
    
    # 3. 게임 테스트 저장 (고정 데이터, company_id 기반)
    game_saved = 0
    for i, question in enumerate(game_tests):
        interview_question = InterviewQuestion(
            application_id=None,
            job_post_id=None,
            company_id=company_id,
            type=QuestionType.AI_INTERVIEW,
            question_text=question,
            category="game_test",
            difficulty="medium"
        )
        db.add(interview_question)
        game_saved += 1
    
    saved_count = common_saved + job_saved + game_saved
    print(f"✅ 고정 질문 {saved_count}개 생성 완료")
    return saved_count

def generate_langgraph_questions(job, applications, db):
    """LangGraph 동적 질문 생성"""
    print("🔄 LangGraph 동적 질문 생성 중...")
    
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
            print(f"  지원자 {app.id}에 대한 LangGraph 질문 생성 중...")
            
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
            generated_questions = workflow_result.get("generated_questions", {})
            ai_questions = generated_questions.get("ai", {})
            
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
            print(f"    ✅ {questions_count}개 LangGraph 질문 생성 완료")
                
        except Exception as e:
            print(f"    ❌ 지원자 {app.id} LangGraph 질문 생성 오류: {str(e)}")
    
    print(f"✅ LangGraph 동적 질문 {total_questions}개 생성 완료")
    return total_questions

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
        
        # 기존 AI 면접 질문 삭제
        deleted_count = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job.id,
            InterviewQuestion.type == QuestionType.AI_INTERVIEW
        ).delete()
        print(f"기존 AI 면접 질문 {deleted_count}개 삭제")
        
        # 랜덤으로 고정 질문 또는 LangGraph 질문 선택
        use_langgraph = random.choice([True, False])
        
        if use_langgraph:
            print("\n🎲 랜덤 선택: LangGraph 동적 질문 생성")
            total_questions = generate_langgraph_questions(job, applications, db)
        else:
            print("\n🎲 랜덤 선택: 고정 질문 생성")
            total_questions = generate_fixed_questions(job, db)
        
        db.commit()
        print(f"✅ 공고 {job.id}의 AI 면접 질문 {total_questions}개 생성 완료")
        
        print(f"\n🎉 AI 면접 질문 생성 완료!")
        print(f"공고 {job.id}: {total_questions}개 질문 생성 ({'LangGraph 동적' if use_langgraph else '고정'} 질문)")
        print(f"지원자 {len(applications)}명: AI 면접 일정 확정")
        
    except Exception as e:
        print(f"❌ 스크립트 실행 실패: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_ai_questions() 