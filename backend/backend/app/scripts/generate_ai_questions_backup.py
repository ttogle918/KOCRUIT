#!/usr/bin/env python3
"""
공고 17의 AI 면접 질문을 생성하는 스크립트 (job_post_id 기반)
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, StageStatus, StageName
from app.models.interview_question import InterviewQuestion, QuestionType
from app.data.general_interview_questions import get_random_general_questions
from app.services.application_service import update_stage_status

def generate_ai_questions():
    db = SessionLocal()
    try:
        # 공고 17 조회
        job = db.query(JobPost).filter(JobPost.id == 17).first()
        if not job:
            print("JobPost 17 not found")
            return
        
        print(f"JobPost 17: {job.title}")
        
        # 공고별 AI 면접 질문 생성 (한 번만)
        print(f"\n🔄 공고 {job.id}의 AI 면접 질문 생성 중...")
        
        # 기존 AI 면접 질문 삭제 (job_post_id 기반)
        deleted_count = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job.id,
            InterviewQuestion.types == QuestionType.AI_INTERVIEW
        ).delete()
        print(f"기존 AI 면접 질문 {deleted_count}개 삭제")
        
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
        
        db.commit()
        print(f"✅ 공고 {job.id}의 AI 면접 질문 {saved_count}개 생성 완료")
        
        # 모든 지원자를 AI 면접 일정 확정 상태로 변경
        applications = db.query(Application).filter(Application.job_post_id == 17).all()
        print(f"\n🔄 {len(applications)}명의 지원자 AI 면접 일정 확정 중...")
        
        for app in applications:
            # app.ai_interview_status = AIInterviewStatus.SCHEDULED <- 대체
            update_stage_status(db, app.id, StageName.AI_INTERVIEW, StageStatus.SCHEDULED)
            print(f"  - App {app.id}: AI 면접 일정 확정")
        
        db.commit()
        print("✅ AI 면접 일정 확정 완료")
        
        print(f"\n🎉 AI 면접 질문 생성 완료!")
        print(f"공고 {job.id}: {saved_count}개 질문 생성")
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