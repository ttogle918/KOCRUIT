import asyncio
import logging
from datetime import datetime
from sqlalchemy import update, and_
from app.models.job import JobPost
from app.core.database import SessionLocal

class JobStatusScheduler:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(JobStatusScheduler, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """JobPost 상태 스케줄러 초기화 (싱글톤)"""
        if self._initialized:
            return
            
        self.logger = logging.getLogger('job_status_scheduler')
        self.running = False
        self.task = None
        
        # 스케줄 설정
        self.update_interval = 3600  # 1시간마다 상태 업데이트
        
        self._initialized = True
    
    async def start(self):
        """스케줄러 시작"""
        self.running = True
        self.logger.info("JobPost status scheduler started")
        
        # 서버 시작 시 즉시 상태 업데이트 실행
        self.logger.info("Running initial JobPost status update...")
        try:
            initial_result = await self._update_job_status()
            self.logger.info(f"Initial JobPost status update result: {initial_result}")
        except Exception as e:
            self.logger.error(f"Initial JobPost status update error: {e}")
        
        # 상태 업데이트 태스크 실행
        self.task = asyncio.create_task(self._status_update_loop())
        
        try:
            await self.task
        except Exception as e:
            self.logger.error(f"JobPost status scheduler error: {e}")
    
    async def stop(self):
        """스케줄러 중지"""
        self.running = False
        self.logger.info("JobPost status scheduler stopped")
        
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
    
    async def _status_update_loop(self):
        """상태 업데이트 루프"""
        while self.running:
            try:
                self.logger.info("Running JobPost status update...")
                result = await self._update_job_status()
                self.logger.info(f"JobPost status update result: {result}")
                
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                self.logger.error(f"JobPost status update loop error: {e}")
                await asyncio.sleep(300)  # 에러 시 5분 대기
    
    async def _update_job_status(self):
        """JobPost 상태 업데이트 실행"""
        try:
            db = SessionLocal()
            now = datetime.now()
            updated_count = 0
            
            # 0. ACTIVE 상태인 공고들을 현재 시간 기준으로 올바른 상태로 변경
            active_job_posts = db.query(JobPost).filter(JobPost.status == "ACTIVE").all()
            active_updated = 0
            for job_post in active_job_posts:
                from app.utils.job_status_utils import determine_job_status
                new_status = determine_job_status(job_post.start_date, job_post.end_date)
                if new_status != "ACTIVE":
                    job_post.status = new_status
                    active_updated += 1
                    self.logger.info(f"Updated ACTIVE job post {job_post.id} to {new_status}")
            
            if active_updated > 0:
                db.commit()
                updated_count += active_updated
                self.logger.info(f"Updated {active_updated} ACTIVE posts to correct status")
            
            # 1. 시작일이 된 예정 공고를 모집중으로 변경
            started_scheduled_query = (
                update(JobPost)
                .where(
                    and_(
                        JobPost.status == "SCHEDULED",
                        JobPost.start_date <= now.strftime("%Y-%m-%d %H:%M:%S")
                    )
                )
                .values(status="RECRUITING")
            )
            
            result = db.execute(started_scheduled_query)
            started_count = result.rowcount
            updated_count += started_count
            
            if started_count > 0:
                self.logger.info(f"Updated {started_count} scheduled posts to RECRUITING")
            
            # 2. 마감일이 지난 모집중 공고를 선발중으로 변경
            expired_recruiting_query = (
                update(JobPost)
                .where(
                    and_(
                        JobPost.status == "RECRUITING",
                        JobPost.end_date < now.strftime("%Y-%m-%d %H:%M:%S")
                    )
                )
                .values(status="SELECTING")
            )
            
            result = db.execute(expired_recruiting_query)
            expired_count = result.rowcount
            updated_count += expired_count
            
            if expired_count > 0:
                self.logger.info(f"Updated {expired_count} expired recruiting posts to SELECTING")
            
            # 3. 선발 완료된 공고를 마감으로 변경 (수동 업데이트용)
            # 이 부분은 비즈니스 로직에 따라 결정되므로 주석 처리
            # completed_selecting_query = (
            #     update(JobPost)
            #     .where(
            #         and_(
            #             JobPost.status == "SELECTING",
            #             # 선발 완료 조건 추가
            #         )
            #     )
            #     .values(status="CLOSED")
            # )
            
            db.commit()
            db.close()
            
            return {
                "success": True,
                "updated_count": updated_count,
                "active_to_correct": active_updated,
                "scheduled_to_recruiting": started_count,
                "expired_to_selecting": expired_count,
                "timestamp": now.isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"JobPost status update error: {e}")
            if 'db' in locals():
                db.rollback()
                db.close()
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def run_manual_update(self):
        """수동 상태 업데이트 실행"""
        try:
            result = await self._update_job_status()
            self.logger.info(f"Manual JobPost status update result: {result}")
            return result
        except Exception as e:
            self.logger.error(f"Manual JobPost status update error: {e}")
            return {"error": str(e)}
    
    def get_scheduler_status(self):
        """스케줄러 상태 반환"""
        return {
            "running": self.running,
            "update_interval": self.update_interval,
            "active_task": self.task is not None
        } 