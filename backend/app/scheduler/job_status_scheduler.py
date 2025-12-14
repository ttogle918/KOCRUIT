import asyncio
import logging
from datetime import datetime
from sqlalchemy import update, and_
from app.models.v2.recruitment.job import JobPost
from app.core.database import SessionLocal
from app.services.v2.interview.interviewer_profile_service import InterviewerProfileService

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
            closed_job_posts = []  # CLOSED로 변경된 공고들 추적
            
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
            
            # 4. CLOSED 상태인 공고 중 분석이 필요한 공고들 확인
            closed_jobs_needing_analysis = await self._find_closed_jobs_needing_analysis(db)
            
            db.commit()
            db.close()
            
            # 5. 분석이 필요한 공고들이 있으면 해당 면접관들만 분석 실행
            if closed_jobs_needing_analysis:
                await self._run_targeted_interviewer_analysis(closed_jobs_needing_analysis)
            
            return {
                "success": True,
                "updated_count": updated_count,
                "active_to_correct": active_updated,
                "scheduled_to_recruiting": started_count,
                "expired_to_selecting": expired_count,
                "jobs_needing_analysis": len(closed_jobs_needing_analysis),
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
    
    async def _find_closed_jobs_needing_analysis(self, db):
        """분석이 필요한 CLOSED 공고들 찾기"""
        try:
            from sqlalchemy import text
            
            # CLOSED 상태인 공고들 중에서 해당 공고의 면접관들이 분석되지 않은 경우 찾기
            query = text("""
                SELECT DISTINCT jp.id, jp.title, ie.evaluator_id
                FROM jobpost jp
                JOIN schedule s ON jp.id = s.job_post_id
                JOIN schedule_interview si ON s.id = si.schedule_id
                JOIN interview_evaluation ie ON si.id = ie.interview_id
                LEFT JOIN interviewer_profile ip ON ie.evaluator_id = ip.evaluator_id
                WHERE jp.status = 'CLOSED'
                AND ie.evaluator_id IS NOT NULL
                AND (ip.id IS NULL OR ip.updated_at < jp.updated_at)
                ORDER BY jp.updated_at DESC
            """)
            
            results = db.execute(query).fetchall()
            
            # 공고별로 그룹화
            jobs_needing_analysis = {}
            for row in results:
                job_id, job_title, evaluator_id = row
                if job_id not in jobs_needing_analysis:
                    jobs_needing_analysis[job_id] = {
                        'job_id': job_id,
                        'job_title': job_title,
                        'evaluators': []
                    }
                jobs_needing_analysis[job_id]['evaluators'].append(evaluator_id)
            
            jobs_list = list(jobs_needing_analysis.values())
            
            if jobs_list:
                self.logger.info(f"Found {len(jobs_list)} CLOSED jobs needing interviewer analysis")
                for job in jobs_list:
                    self.logger.info(f"  - Job {job['job_id']}: {job['job_title']} ({len(job['evaluators'])} evaluators)")
            
            return jobs_list
            
        except Exception as e:
            self.logger.error(f"Error finding jobs needing analysis: {e}")
            return []

    async def _run_targeted_interviewer_analysis(self, jobs_needing_analysis):
        """특정 공고의 면접관들만 타겟팅하여 분석 실행"""
        try:
            self.logger.info(f"Starting targeted interviewer analysis for {len(jobs_needing_analysis)} jobs...")
            
            # 분석이 필요한 모든 면접관 ID 수집 (중복 제거)
            evaluator_ids = set()
            for job in jobs_needing_analysis:
                evaluator_ids.update(job['evaluators'])
            
            self.logger.info(f"Total unique evaluators to analyze: {len(evaluator_ids)}")
            
            # 별도 스레드에서 실행하여 메인 스케줄러에 영향 주지 않음
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._analyze_specific_profiles_sync, list(evaluator_ids))
            
            self.logger.info(f"Targeted interviewer analysis completed: {result}")
            
        except Exception as e:
            self.logger.error(f"Targeted interviewer analysis error: {e}")

    async def _run_interviewer_profile_analysis(self):
        """전체 면접관 프로필 분석 실행 (기존 호환성)"""
        try:
            self.logger.info("Starting full interviewer profile analysis...")
            
            # 별도 스레드에서 실행하여 메인 스케줄러에 영향 주지 않음
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._analyze_profiles_sync)
            
            self.logger.info(f"Full interviewer profile analysis completed: {result}")
            
        except Exception as e:
            self.logger.error(f"Full interviewer profile analysis error: {e}")
    
    def _analyze_specific_profiles_sync(self, evaluator_ids):
        """특정 면접관들만 동기적으로 프로필 분석 실행"""
        try:
            db = SessionLocal()
            
            if not evaluator_ids:
                self.logger.info("No specific evaluator IDs provided for analysis")
                return {"success": False, "message": "분석할 면접관 ID가 없습니다."}
            
            # 각 면접관에 대해 프로필 생성/업데이트
            created_profiles = []
            updated_profiles = []
            
            for interviewer_id in evaluator_ids:
                try:
                    from app.models.v2.interview.interviewer_profile import InterviewerProfile
                    
                    # 기존 프로필 확인
                    existing_profile = db.query(InterviewerProfile).filter(
                        InterviewerProfile.evaluator_id == interviewer_id
                    ).first()
                    
                    profile = InterviewerProfileService.initialize_interviewer_profile(db, interviewer_id)
                    if profile:
                        if existing_profile:
                            updated_profiles.append(interviewer_id)
                            self.logger.info(f"Updated profile for interviewer {interviewer_id}")
                        else:
                            created_profiles.append(interviewer_id)
                            self.logger.info(f"Created profile for interviewer {interviewer_id}")
                except Exception as e:
                    self.logger.error(f"Failed to process profile for interviewer {interviewer_id}: {e}")
            
            db.commit()
            db.close()
            
            total_processed = len(created_profiles) + len(updated_profiles)
            result = {
                "success": True,
                "message": f"{total_processed}명의 면접관 프로필이 처리되었습니다. (생성: {len(created_profiles)}, 업데이트: {len(updated_profiles)})",
                "profiles_created": len(created_profiles),
                "profiles_updated": len(updated_profiles),
                "created_ids": created_profiles,
                "updated_ids": updated_profiles
            }
            
            self.logger.info(f"Specific interviewer profile analysis result: {result}")
            return result
            
        except Exception as e:
            self.logger.error(f"Specific interviewer profile analysis sync error: {e}")
            if 'db' in locals():
                db.rollback()
                db.close()
            return {"success": False, "error": str(e)}

    def _analyze_profiles_sync(self):
        """동기적으로 전체 면접관 프로필 분석 실행"""
        try:
            db = SessionLocal()
            
            # 기존 프로필 데이터 삭제
            from app.models.v2.interview.interviewer_profile import InterviewerProfile, InterviewerProfileHistory
            
            db.query(InterviewerProfileHistory).delete()
            db.query(InterviewerProfile).delete()
            db.commit()
            
            # 실제 평가 데이터에서 면접관 ID 추출
            from sqlalchemy import text
            result = db.execute(text("""
                SELECT DISTINCT evaluator_id 
                FROM interview_evaluation 
                WHERE evaluator_id IS NOT NULL
                ORDER BY evaluator_id
            """)).fetchall()
            
            interviewer_ids = [row[0] for row in result]
            
            if not interviewer_ids:
                self.logger.info("No interviewer data found for analysis")
                return {"success": False, "message": "분석할 면접관 데이터가 없습니다."}
            
            # 각 면접관에 대해 프로필 생성
            created_profiles = []
            for interviewer_id in interviewer_ids:
                try:
                    profile = InterviewerProfileService.initialize_interviewer_profile(db, interviewer_id)
                    if profile:
                        created_profiles.append(interviewer_id)
                        self.logger.info(f"Created profile for interviewer {interviewer_id}")
                except Exception as e:
                    self.logger.error(f"Failed to create profile for interviewer {interviewer_id}: {e}")
            
            db.commit()
            db.close()
            
            result = {
                "success": True,
                "message": f"{len(created_profiles)}명의 면접관 프로필이 성공적으로 생성되었습니다.",
                "profiles_created": len(created_profiles),
                "interviewer_ids": created_profiles
            }
            
            self.logger.info(f"Full interviewer profile analysis result: {result}")
            return result
            
        except Exception as e:
            self.logger.error(f"Full interviewer profile analysis sync error: {e}")
            if 'db' in locals():
                db.rollback()
                db.close()
            return {"success": False, "error": str(e)}
    
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