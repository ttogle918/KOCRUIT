# === Background Video Analysis Service ===
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
import httpx
import json
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.application import Application
from app.models.video_analysis import VideoAnalysis

# 로깅 설정
logger = logging.getLogger(__name__)

class BackgroundAnalysisService:
    """백그라운드 영상 분석 서비스"""
    
    def __init__(self):
        """초기화"""
        self.video_analysis_url = "http://kocruit_video_analysis:8002"
        self.check_interval = 300  # 5분마다 체크
        self.max_concurrent_analyses = 2  # 동시 분석 제한
        self.is_running = False
        
    def get_pending_analyses(self, db: Session) -> List[Dict[str, Any]]:
        """분석이 필요한 지원자 목록 조회"""
        try:
            # AI 면접 합격자 중 video_url이 있고 분석이 안된 지원자 조회
            pending_analyses = db.query(Application).filter(
                Application.ai_interview_status == "PASSED",
                Application.ai_interview_video_url.isnot(None),
                Application.ai_interview_video_url != "",
                ~Application.id.in_(
                    db.query(VideoAnalysis.application_id).distinct()
                )
            ).all()
            
            result = []
            for application in pending_analyses:
                result.append({
                    "application_id": application.id,
                    "video_url": application.ai_interview_video_url,
                    "applicant_name": application.applicant_name,
                    "job_post_title": application.job_post.title if application.job_post else None
                })
            
            return result
            
        except Exception as e:
            logger.error(f"대기 중인 분석 조회 오류: {str(e)}")
            return []
    
    async def analyze_video(self, application_id: int, video_url: str) -> bool:
        """개별 영상 분석"""
        try:
            logger.info(f"영상 분석 시작: 지원자 {application_id}")
            
            async with httpx.AsyncClient() as client:
                # video-analysis 서비스로 분석 요청
                response = await client.post(
                    f"{self.video_analysis_url}/analyze-video-url",
                    json={"video_url": video_url},
                    timeout=300  # 5분 타임아웃
                )
                
                if response.status_code == 200:
                    analysis_result = response.json()
                    
                    # 분석 결과를 DB에 저장
                    db = next(get_db())
                    try:
                        # 기존 분석 결과가 있는지 확인
                        existing_analysis = db.query(VideoAnalysis).filter(
                            VideoAnalysis.application_id == application_id
                        ).first()
                        
                        if existing_analysis:
                            # 기존 결과 업데이트
                            existing_analysis.video_path = analysis_result.get("video_path", "")
                            existing_analysis.video_url = analysis_result.get("video_url", "")
                            existing_analysis.analysis_timestamp = datetime.now()
                            existing_analysis.overall_score = analysis_result.get("overall_score", 0)
                            existing_analysis.facial_expressions = json.dumps(analysis_result.get("facial_expressions", {}))
                            existing_analysis.posture_analysis = json.dumps(analysis_result.get("posture_analysis", {}))
                            existing_analysis.gaze_analysis = json.dumps(analysis_result.get("gaze_analysis", {}))
                            existing_analysis.audio_analysis = json.dumps(analysis_result.get("audio_analysis", {}))
                            existing_analysis.recommendations = json.dumps(analysis_result.get("recommendations", []))
                            existing_analysis.status = "completed"
                            
                            db.commit()
                            logger.info(f"분석 결과 업데이트 완료: 지원자 {application_id}")
                            
                        else:
                            # 새로운 분석 결과 생성
                            new_analysis = VideoAnalysis(
                                application_id=application_id,
                                video_path=analysis_result.get("video_path", ""),
                                video_url=analysis_result.get("video_url", ""),
                                analysis_timestamp=datetime.now(),
                                overall_score=analysis_result.get("overall_score", 0),
                                facial_expressions=json.dumps(analysis_result.get("facial_expressions", {})),
                                posture_analysis=json.dumps(analysis_result.get("posture_analysis", {})),
                                gaze_analysis=json.dumps(analysis_result.get("gaze_analysis", {})),
                                audio_analysis=json.dumps(analysis_result.get("audio_analysis", {})),
                                recommendations=json.dumps(analysis_result.get("recommendations", [])),
                                status="completed"
                            )
                            
                            db.add(new_analysis)
                            db.commit()
                            logger.info(f"새로운 분석 결과 저장 완료: 지원자 {application_id}")
                        
                        return True
                        
                    except Exception as e:
                        db.rollback()
                        logger.error(f"분석 결과 저장 오류: {str(e)}")
                        return False
                    finally:
                        db.close()
                else:
                    logger.error(f"영상 분석 실패: 지원자 {application_id}, 상태: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"영상 분석 오류: 지원자 {application_id}, 오류: {str(e)}")
            return False
    
    async def process_pending_analyses(self):
        """대기 중인 분석 처리"""
        try:
            db = next(get_db())
            try:
                pending_analyses = self.get_pending_analyses(db)
                
                if not pending_analyses:
                    logger.info("분석할 영상이 없습니다.")
                    return
                
                logger.info(f"분석 대기 중인 영상: {len(pending_analyses)}개")
                
                # 동시 분석 제한을 위한 세마포어
                semaphore = asyncio.Semaphore(self.max_concurrent_analyses)
                
                async def analyze_with_semaphore(analysis):
                    async with semaphore:
                        return await self.analyze_video(
                            analysis["application_id"], 
                            analysis["video_url"]
                        )
                
                # 병렬로 분석 실행
                tasks = [analyze_with_semaphore(analysis) for analysis in pending_analyses]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                success_count = sum(1 for result in results if result is True)
                logger.info(f"분석 완료: {success_count}/{len(pending_analyses)} 성공")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"분석 처리 오류: {str(e)}")
    
    async def run_initial_analysis(self):
        """서버 시작 시 초기 분석 실행 (한 번만)"""
        try:
            logger.info("서버 시작 시 초기 영상 분석 실행")
            await self.process_pending_analyses()
            logger.info("초기 영상 분석 완료")
        except Exception as e:
            logger.error(f"초기 분석 오류: {str(e)}")
    
    async def run_continuous_analysis(self):
        """연속 분석 실행 (기존 방식 - 사용하지 않음)"""
        self.is_running = True
        logger.info("백그라운드 영상 분석 서비스 시작")
        
        while self.is_running:
            try:
                await self.process_pending_analyses()
                logger.info(f"{self.check_interval}초 후 다음 체크...")
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"연속 분석 오류: {str(e)}")
                await asyncio.sleep(60)  # 오류 시 1분 대기
    
    def stop(self):
        """서비스 중지"""
        self.is_running = False
        logger.info("백그라운드 분석 서비스 중지")

# 전역 인스턴스
background_analysis_service = BackgroundAnalysisService() 