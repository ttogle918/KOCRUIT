#!/usr/bin/env python3
"""
question_generation_scheduler.py
백그라운드에서 면접 질문을 자동 생성하는 스케줄러 (APScheduler 사용)
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.services.interview_question_service import InterviewQuestionService
from app.models.interview_question import InterviewQuestion, QuestionType

logger = logging.getLogger(__name__)

class QuestionGenerationScheduler:
    """면접 질문 자동 생성 스케줄러"""
    
    @staticmethod
    def generate_common_questions_for_new_job_posts():
        """새로운 공고에 대해 공통 질문 생성 (매일 새벽 2시 실행)"""
        try:
            db = SessionLocal()
            
            # 최근 7일 내에 생성된 공고 조회
            week_ago = datetime.utcnow() - timedelta(days=7)
            new_job_posts = db.query(JobPost).filter(
                JobPost.created_at >= week_ago
            ).all()
            
            total_questions = 0
            for job_post in new_job_posts:
                try:
                    # 이미 공통 질문이 생성되어 있는지 확인
                    applications = db.query(Application).filter(
                        Application.job_post_id == job_post.id,
                        Application.document_status == DocumentStatus.PASSED.value
                    ).all()
                    
                    if applications:
                        # 첫 번째 지원자에게 공통 질문이 있는지 확인
                        first_app = applications[0]
                        existing_common_questions = db.query(InterviewQuestion).filter(
                            InterviewQuestion.application_id == first_app.id,
                            InterviewQuestion.type == QuestionType.COMMON
                        ).count()
                        
                        if existing_common_questions == 0:
                            # 공통 질문 생성
                            company_name = job_post.company.name if job_post.company else ""
                            from app.api.v1.interview_question import parse_job_post_data
                            job_info = parse_job_post_data(job_post)
                            
                            questions = InterviewQuestionService.generate_common_questions_for_job_post(
                                db=db,
                                job_post_id=job_post.id,
                                company_name=company_name,
                                job_info=job_info
                            )
                            total_questions += len(questions)
                            logger.info(f"공고 {job_post.id}에 대해 {len(questions)}개 공통 질문 생성")
                        else:
                            logger.info(f"공고 {job_post.id}는 이미 공통 질문이 생성되어 있음")
                            
                except Exception as e:
                    logger.error(f"공고 {job_post.id} 공통 질문 생성 실패: {str(e)}")
            
            logger.info(f"공통 질문 생성 완료: {len(new_job_posts)}개 공고, {total_questions}개 질문")
            
        except Exception as e:
            logger.error(f"공통 질문 생성 스케줄러 오류: {str(e)}")
        finally:
            db.close()
    
    @staticmethod
    def generate_individual_questions_for_scheduled_interviews():
        """면접 일정이 확정된 지원자들에 대해 개별 질문 생성 (매시간 실행)"""
        try:
            db = SessionLocal()
            
            # 면접 일정이 확정된 지원자들이 있는 공고 조회 (AI 면접 또는 1차 면접)
            scheduled_job_posts = db.query(JobPost).join(Application).filter(
                Application.interview_status.in_([
                    InterviewStatus.AI_INTERVIEW_SCHEDULED.value,
                    InterviewStatus.FIRST_INTERVIEW_SCHEDULED.value,
                    InterviewStatus.SECOND_INTERVIEW_SCHEDULED.value,
                    InterviewStatus.FINAL_INTERVIEW_SCHEDULED.value
                ]),
                Application.document_status == DocumentStatus.PASSED.value
            ).distinct().all()
            
            total_questions = 0
            for job_post in scheduled_job_posts:
                try:
                    results = InterviewQuestionService.generate_questions_for_scheduled_interviews(
                        db=db,
                        job_post_id=job_post.id
                    )
                    total_questions += results["questions_generated"]
                    logger.info(f"공고 {job_post.id}: {results}")
                    
                except Exception as e:
                    logger.error(f"공고 {job_post.id} 개별 질문 생성 실패: {str(e)}")
            
            logger.info(f"개별 질문 생성 완료: {len(scheduled_job_posts)}개 공고, {total_questions}개 질문")
            
        except Exception as e:
            logger.error(f"개별 질문 생성 스케줄러 오류: {str(e)}")
        finally:
            db.close()
    
    @staticmethod
    def run_scheduler():
        """스케줄러 실행 (main.py에서 호출됨)"""
        logger.info("면접 질문 생성 스케줄러 시작")
        
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger
            
            scheduler = BackgroundScheduler()
            
            # 공통 질문 생성: 매일 새벽 2시
            scheduler.add_job(
                QuestionGenerationScheduler.generate_common_questions_for_new_job_posts,
                CronTrigger(hour=2, minute=0),
                id='generate_common_questions',
                replace_existing=True
            )
            
            # 개별 질문 생성: 매시간
            scheduler.add_job(
                QuestionGenerationScheduler.generate_individual_questions_for_scheduled_interviews,
                CronTrigger(minute=0),  # 매시간 정각
                id='generate_individual_questions',
                replace_existing=True
            )
            
            # 즉시 한 번 실행
            QuestionGenerationScheduler.generate_common_questions_for_new_job_posts()
            QuestionGenerationScheduler.generate_individual_questions_for_scheduled_interviews()
            
            scheduler.start()
            logger.info("면접 질문 생성 스케줄러 시작 완료")
            
        except ImportError:
            logger.warning("APScheduler not available, using fallback")
            # APScheduler가 없으면 즉시 한 번만 실행
            QuestionGenerationScheduler.generate_common_questions_for_new_job_posts()
            QuestionGenerationScheduler.generate_individual_questions_for_scheduled_interviews()
        except Exception as e:
            logger.error(f"스케줄러 시작 실패: {str(e)}")

if __name__ == "__main__":
    QuestionGenerationScheduler.run_scheduler() 