#!/usr/bin/env python3
"""
랭그래프 백그라운드 실행 스케줄러
면접 질문, 이력서 분석, 평가 도구 등을 백그라운드에서 생성하여 DB에 저장
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import Dict, Any, List

from ..core.database import get_db
from ..models.job import JobPost
from ..models.application import Application
from ..models.resume import Resume
from ..models.interview_question import InterviewQuestion, QuestionType
from ..models.interview_evaluation import InterviewEvaluation
from ..models.interview_question_log import InterviewQuestionLog

# LangGraph 워크플로우 import
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../agent'))
from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
from agent.agents.ai_interview_workflow import run_ai_interview

logger = logging.getLogger(__name__)

class LangGraphBackgroundScheduler:
    """랭그래프 백그라운드 실행 스케줄러"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self.running_tasks: Dict[str, asyncio.Task] = {}
    
    async def generate_interview_questions_background(self, application_id: int, db: Session):
        """백그라운드에서 면접 질문 생성 및 DB 저장"""
        try:
            # 지원 정보 조회
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application:
                logger.error(f"지원 정보를 찾을 수 없습니다: {application_id}")
                return
            
            # 이력서 정보 조회
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
            if not resume:
                logger.error(f"이력서를 찾을 수 없습니다: {application.resume_id}")
                return
            
            # 공고 정보 조회
            job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
            if not job_post:
                logger.error(f"공고를 찾을 수 없습니다: {application.job_post_id}")
                return
            
            # 이미 생성된 질문이 있는지 확인
            existing_questions = db.query(InterviewQuestion).filter(
                InterviewQuestion.application_id == application_id,
                InterviewQuestion.type.in_([QuestionType.PERSONAL, QuestionType.COMPANY, QuestionType.JOB])
            ).count()
            
            if existing_questions > 0:
                logger.info(f"지원 {application_id}에 이미 면접 질문이 생성되어 있습니다: {existing_questions}개")
                return
            
            logger.info(f"지원 {application_id}에 대한 면접 질문 생성 시작")
            
            # 이력서 텍스트 생성 (간단한 버전)
            resume_text = f"{resume.name} - {resume.education} - {resume.experience}"
            
            # 직무 정보 생성
            job_info = f"{job_post.title} - {job_post.description}" if job_post else ""
            
            # LangGraph 워크플로우 실행
            workflow_result = generate_comprehensive_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=job_post.company.name if job_post.company else "회사",
                applicant_name=resume.name,
                interview_type="general"
            )
            
            # 결과에서 질문 추출 및 DB 저장
            questions = workflow_result.get("questions", [])
            question_bundle = workflow_result.get("question_bundle", {})
            
            saved_count = 0
            for category, question_list in question_bundle.items():
                if isinstance(question_list, list):
                    for question in question_list:
                        # 질문 타입 결정
                        question_type = QuestionType.PERSONAL
                        if "회사" in category or "company" in category.lower():
                            question_type = QuestionType.COMPANY
                        elif "직무" in category or "job" in category.lower():
                            question_type = QuestionType.JOB
                        
                        # DB에 저장
                        interview_question = InterviewQuestion(
                            application_id=application_id,
                            type=question_type,
                            question_text=question,
                            category=category,
                            difficulty="medium"
                        )
                        db.add(interview_question)
                        saved_count += 1
            
            db.commit()
            logger.info(f"지원 {application_id}에 면접 질문 {saved_count}개 저장 완료")
            
        except Exception as e:
            logger.error(f"면접 질문 생성 실패 (지원 {application_id}): {str(e)}")
            db.rollback()
    
    async def generate_resume_analysis_background(self, application_id: int, db: Session):
        """백그라운드에서 이력서 분석 생성 및 DB 저장"""
        try:
            # 지원 정보 조회
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application:
                logger.error(f"지원 정보를 찾을 수 없습니다: {application_id}")
                return
            
            # 이력서 정보 조회
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
            if not resume:
                logger.error(f"이력서를 찾을 수 없습니다: {application.resume_id}")
                return
            
            logger.info(f"지원 {application_id}에 대한 이력서 분석 생성 시작")
            
            # 이력서 텍스트 생성
            resume_text = f"{resume.name} - {resume.education} - {resume.experience}"
            
            # LangGraph 워크플로우 실행
            workflow_result = generate_comprehensive_interview_questions(
                resume_text=resume_text,
                job_info="",
                company_name="회사",
                applicant_name=resume.name,
                interview_type="general"
            )
            
            # 이력서 분석 결과 추출
            resume_analysis = workflow_result.get("resume_analysis", {})
            
            # 분석 결과를 로그에 저장
            analysis_log = InterviewQuestionLog(
                application_id=application_id,
                interview_type="resume_analysis",
                question_text="이력서 분석",
                answer_text=str(resume_analysis),
                evaluation_score=0,
                feedback="백그라운드에서 생성된 이력서 분석"
            )
            db.add(analysis_log)
            db.commit()
            
            logger.info(f"지원 {application_id}에 이력서 분석 저장 완료")
            
        except Exception as e:
            logger.error(f"이력서 분석 생성 실패 (지원 {application_id}): {str(e)}")
            db.rollback()
    
    async def generate_evaluation_tools_background(self, application_id: int, db: Session):
        """백그라운드에서 평가 도구 생성 및 DB 저장"""
        try:
            # 지원 정보 조회
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application:
                logger.error(f"지원 정보를 찾을 수 없습니다: {application_id}")
                return
            
            # 이력서 정보 조회
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
            if not resume:
                logger.error(f"이력서를 찾을 수 없습니다: {application.resume_id}")
                return
            
            logger.info(f"지원 {application_id}에 대한 평가 도구 생성 시작")
            
            # 이력서 텍스트 생성
            resume_text = f"{resume.name} - {resume.education} - {resume.experience}"
            
            # LangGraph 워크플로우 실행
            workflow_result = generate_comprehensive_interview_questions(
                resume_text=resume_text,
                job_info="",
                company_name="회사",
                applicant_name=resume.name,
                interview_type="general"
            )
            
            # 평가 도구 결과 추출
            evaluation_tools = workflow_result.get("evaluation_tools", {})
            
            # 평가 도구를 로그에 저장
            tools_log = InterviewQuestionLog(
                application_id=application_id,
                interview_type="evaluation_tools",
                question_text="평가 도구",
                answer_text=str(evaluation_tools),
                evaluation_score=0,
                feedback="백그라운드에서 생성된 평가 도구"
            )
            db.add(tools_log)
            db.commit()
            
            logger.info(f"지원 {application_id}에 평가 도구 저장 완료")
            
        except Exception as e:
            logger.error(f"평가 도구 생성 실패 (지원 {application_id}): {str(e)}")
            db.rollback()
    
    async def process_new_applications(self):
        """새로운 지원자들에 대해 백그라운드 작업 실행"""
        try:
            db = next(get_db())
            
            # 최근 24시간 내에 생성된 지원자들 조회
            yesterday = datetime.now() - timedelta(days=1)
            new_applications = db.query(Application).filter(
                Application.created_at >= yesterday
            ).all()
            
            logger.info(f"새로운 지원자 {len(new_applications)}명 발견")
            
            for application in new_applications:
                # 비동기로 각 작업 실행
                asyncio.create_task(self.generate_interview_questions_background(application.id, db))
                asyncio.create_task(self.generate_resume_analysis_background(application.id, db))
                asyncio.create_task(self.generate_evaluation_tools_background(application.id, db))
            
        except Exception as e:
            logger.error(f"새로운 지원자 처리 실패: {str(e)}")
    
    def start(self):
        """스케줄러 시작"""
        if self.is_running:
            logger.warning("스케줄러가 이미 실행 중입니다.")
            return
        
        # 매시간 새로운 지원자 처리
        self.scheduler.add_job(
            self.process_new_applications,
            CronTrigger(minute=0),  # 매시간 정각
            id="process_new_applications",
            name="새로운 지원자 백그라운드 처리"
        )
        
        # 매일 새벽 2시에 전체 정리 작업
        self.scheduler.add_job(
            self.process_new_applications,
            CronTrigger(hour=2, minute=0),  # 매일 새벽 2시
            id="daily_cleanup",
            name="일일 정리 작업"
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("랭그래프 백그라운드 스케줄러 시작")
    
    def stop(self):
        """스케줄러 중지"""
        if not self.is_running:
            logger.warning("스케줄러가 실행 중이 아닙니다.")
            return
        
        self.scheduler.shutdown()
        self.is_running = False
        logger.info("랭그래프 백그라운드 스케줄러 중지")

# 전역 스케줄러 인스턴스
_langgraph_scheduler = None

def start_langgraph_background_scheduler():
    """랭그래프 백그라운드 스케줄러 시작"""
    global _langgraph_scheduler
    if _langgraph_scheduler is None:
        _langgraph_scheduler = LangGraphBackgroundScheduler()
    _langgraph_scheduler.start()

def stop_langgraph_background_scheduler():
    """랭그래프 백그라운드 스케줄러 중지"""
    global _langgraph_scheduler
    if _langgraph_scheduler:
        _langgraph_scheduler.stop()
        _langgraph_scheduler = None

# 수동 실행 함수들
async def generate_interview_questions_for_application_async(application_id: int):
    """특정 지원자에 대해 면접 질문 생성 (비동기)"""
    db = next(get_db())
    scheduler = LangGraphBackgroundScheduler()
    await scheduler.generate_interview_questions_background(application_id, db)

async def generate_resume_analysis_for_application_async(application_id: int):
    """특정 지원자에 대해 이력서 분석 생성 (비동기)"""
    db = next(get_db())
    scheduler = LangGraphBackgroundScheduler()
    await scheduler.generate_resume_analysis_background(application_id, db)

async def generate_evaluation_tools_for_application_async(application_id: int):
    """특정 지원자에 대해 평가 도구 생성 (비동기)"""
    db = next(get_db())
    scheduler = LangGraphBackgroundScheduler()
    await scheduler.generate_evaluation_tools_background(application_id, db) 