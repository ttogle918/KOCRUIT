#!/usr/bin/env python3
"""
AI 질문 생성 스케줄러
공고 마감 시 직무별 AI 질문을 미리 생성
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..core.database import get_db
from ..models.v2.recruitment.job import JobPost
from ..models.v2.interview.interview_question import InterviewQuestion, QuestionType
# Agent 서비스는 별도 서비스이므로 import 제거
# from ..agents.ai_question_generation_workflow import generate_ai_scenario_questions
from ..services.v2.interview.interview_question_service import get_random_general_questions, get_random_game_test

logger = logging.getLogger(__name__)

class AIQuestionGenerationScheduler:
    """AI 질문 생성 스케줄러"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
    
    async def generate_questions_for_job_post(self, job_post_id: int, db: Session):
        """특정 공고에 대한 AI 면접 질문 생성"""
        try:
            # 공고 정보 조회
            job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
            if not job_post:
                logger.error(f"공고를 찾을 수 없습니다: {job_post_id}")
                return
            
            # 이미 질문이 생성되어 있는지 확인 (더 엄격한 검사)
            existing_questions = db.query(InterviewQuestion).filter(
                InterviewQuestion.job_post_id == job_post_id,
                InterviewQuestion.type == QuestionType.AI_INTERVIEW
            ).count()
            
            # company_id 기반 질문도 확인
            company_id = job_post.company_id if job_post.company else None
            if company_id:
                company_questions = db.query(InterviewQuestion).filter(
                    InterviewQuestion.company_id == company_id,
                    InterviewQuestion.type == QuestionType.AI_INTERVIEW
                ).count()
                existing_questions += company_questions
            
            if existing_questions > 0:
                logger.info(f"공고 {job_post_id}에 이미 AI 면접 질문이 생성되어 있습니다: {existing_questions}개 (생성하지 않습니다)")
                return
            
            logger.info(f"공고 {job_post_id}에 대한 AI 면접 질문 생성 시작")
            
            # 회사 정보 조회
            company_id = job_post.company_id if job_post.company else None
            company_name = job_post.company.name if job_post.company else "KOSA공공"
            
            # AI 면접용 공통 질문 생성 (job_post_id 기반)
            job_specific_questions = [
                "자기소개를 해주세요.",
                "본인의 장단점은 무엇인가요?",
                "실패 경험을 말해주시고, 어떻게 극복했나요?",
                "인생에서 가장 의미 있었던 경험은 무엇인가요?",
                "동료와 갈등이 생겼을 때 어떻게 해결하나요?",
                "마감 기한이 촉박한 업무가 주어진다면 어떻게 대처하겠습니까?",
                "고객이 불만을 제기할 때 당신의 대응 방식은?",
                "업무 중 예상치 못한 문제가 발생했을 때 어떻게 해결하시겠습니까?",
                "새로운 기술이나 방법을 배워야 할 때 어떻게 접근하시나요?",
                "앞으로의 커리어 계획은 어떻게 되시나요?",
                "성공적인 직장생활을 위해 가장 중요한 것은 무엇이라고 생각하시나요?",
                "업무와 개인생활의 균형을 어떻게 맞추시겠습니까?",
                "직장에서 가장 중요하다고 생각하는 가치는 무엇인가요?"
            ]
            
            # 회사 인재상 기반 질문 (company_id 기반)
            company_culture_questions = [
                f"{company_name}에 지원하게 된 동기는 무엇인가요?",
                f"{company_name}의 인재상에 대해 어떻게 생각하시나요?",
                "조직 문화에 적응하는 데 가장 중요한 것은 무엇이라고 생각하시나요?",
                "팀워크와 개인 성과 중 어느 것을 더 중요하게 생각하시나요?",
                "변화하는 환경에서 어떻게 적응하시겠습니까?"
            ]
            
            # 게임 테스트 (company_id 기반)
            game_tests = [
                "숫자 기억력 테스트: 숫자 4~9개를 순서대로 기억하기",
                "패턴 찾기: 화면에 뜨는 도형이나 숫자의 규칙 찾기",
                "반응 속도 테스트: 특정 색/도형이 뜰 때 클릭"
            ]
            
            saved_count = 0
            
            # 1. 직무별 질문 저장 (job_post_id 기반)
            for question in job_specific_questions:
                db_question = InterviewQuestion(
                    application_id=None,
                    job_post_id=job_post_id,
                    company_id=None,
                    type=QuestionType.AI_INTERVIEW,
                    question_text=question,
                    category="job_specific",
                    difficulty="medium"
                )
                db.add(db_question)
                saved_count += 1
            
            # 2. 회사 문화 질문 저장 (company_id 기반)
            for question in company_culture_questions:
                db_question = InterviewQuestion(
                    application_id=None,
                    job_post_id=None,
                    company_id=company_id,
                    type=QuestionType.AI_INTERVIEW,
                    question_text=question,
                    category="company_culture",
                    difficulty="medium"
                )
                db.add(db_question)
                saved_count += 1
            
            # 3. 게임 테스트 저장 (company_id 기반)
            for question in game_tests:
                db_question = InterviewQuestion(
                    application_id=None,
                    job_post_id=None,
                    company_id=company_id,
                    type=QuestionType.AI_INTERVIEW,
                    question_text=question,
                    category="game_test",
                    difficulty="medium"
                )
                db.add(db_question)
                saved_count += 1
            
            db.commit()
            
            logger.info(f"공고 {job_post_id}에 {saved_count}개 AI 면접 질문 생성 완료")
            logger.info(f"  - 직무별 질문: {len(job_specific_questions)}개 (job_post_id 기반)")
            logger.info(f"  - 회사 문화 질문: {len(company_culture_questions)}개 (company_id 기반)")
            logger.info(f"  - 게임 테스트: {len(game_tests)}개 (company_id 기반)")
            
        except Exception as e:
            logger.error(f"공고 {job_post_id} 질문 생성 실패: {e}")
            db.rollback()
    
    async def check_closed_job_posts(self):
        """마감된 공고 확인 및 질문 생성"""
        try:
            db = next(get_db())
            
            # 마감일이 지난 공고 조회
            today = datetime.now().date()
            closed_job_posts = db.query(JobPost).filter(
                JobPost.deadline < today,
                JobPost.status == "active"  # 아직 활성 상태인 공고
            ).all()
            
            for job_post in closed_job_posts:
                await self.generate_questions_for_job_post(job_post.id, db)
                
                # 공고 상태를 마감으로 변경
                job_post.status = "closed"
                db.commit()
                
                logger.info(f"공고 {job_post.id} 마감 처리 및 질문 생성 완료")
            
            db.close()
            
        except Exception as e:
            logger.error(f"마감 공고 확인 중 오류: {e}")
    
    async def generate_questions_for_specific_job(self, job_post_id: int):
        """특정 공고에 대한 질문 수동 생성"""
        try:
            db = next(get_db())
            await self.generate_questions_for_job_post(job_post_id, db)
            db.close()
        except Exception as e:
            logger.error(f"특정 공고 질문 생성 실패: {e}")
    
    def start(self):
        """스케줄러 시작"""
        if self.is_running:
            logger.warning("스케줄러가 이미 실행 중입니다.")
            return
        
        # 매일 오전 9시에 마감 공고 확인 (서버 시작 시 실행으로 변경하여 주석 처리)
        # self.scheduler.add_job(
        #     self.check_closed_job_posts,
        #     CronTrigger(hour=9, minute=0),
        #     id="check_closed_job_posts",
        #     name="마감 공고 확인 및 질문 생성"
        # )
        
        # 매시간 마감 공고 확인 (테스트용) (서버 시작 시 실행으로 변경하여 주석 처리)
        # self.scheduler.add_job(
        #     self.check_closed_job_posts,
        #     CronTrigger(minute=0),
        #     id="check_closed_job_posts_hourly",
        #     name="시간별 마감 공고 확인"
        # )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("AI 질문 생성 스케줄러 시작")
    
    def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            return
        
        self.scheduler.shutdown()
        self.is_running = False
        logger.info("AI 질문 생성 스케줄러 중지")

# 싱글톤 인스턴스
ai_question_scheduler = AIQuestionGenerationScheduler()

def start_ai_question_scheduler():
    """AI 질문 생성 스케줄러 시작"""
    ai_question_scheduler.start()

def stop_ai_question_scheduler():
    """AI 질문 생성 스케줄러 중지"""
    ai_question_scheduler.stop()

async def generate_questions_for_job_post_async(job_post_id: int):
    """특정 공고에 대한 질문 생성 (비동기)"""
    await ai_question_scheduler.generate_questions_for_specific_job(job_post_id) 