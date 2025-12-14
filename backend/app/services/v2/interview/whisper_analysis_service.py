# === Whisper Analysis Service ===
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import requests

from app.core.database import get_db
from app.models.v2.interview.media_analysis import MediaAnalysis
from app.models.v2.document.application import Application
from app.models.v2.interview.interview_question_log import InterviewQuestionLog

logger = logging.getLogger(__name__)

class WhisperAnalysisService:
    """Whisper 기반 음성 분석 서비스"""
    
    def __init__(self):
        self.whisper_service_url = "http://video-analysis:8002"
    
    def process_application(self, application_id: int):
        """지원자의 AI 면접 영상 음성 분석"""
        try:
            db = next(get_db())
            
            # 지원자 정보 조회
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application or not application.ai_interview_video_url:
                logger.warning(f"지원자 {application_id}의 AI 면접 영상이 없습니다")
                return
            
            # Whisper 분석 실행
            whisper_result = self._run_analysis(application_id)
            if not whisper_result:
                logger.error(f"Whisper 분석 실패: 지원자 {application_id}")
                return
            
            logger.info(f"Whisper 분석 완료: 지원자 {application_id}")
            
        except Exception as e:
            logger.error(f"Whisper 분석 서비스 오류: {str(e)}")
        finally:
            db.close()
    
    def _run_analysis(self, application_id: int):
        """실제 Whisper 분석 실행"""
        try:
            db = next(get_db())
            
            # 지원자 정보 조회
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application:
                logger.error(f"지원자를 찾을 수 없습니다: {application_id}")
                return None
            
            video_url = application.ai_interview_video_url
            if not video_url:
                logger.error(f"AI 면접 영상 URL이 없습니다: {application_id}")
                return None
            
            # Whisper 서비스에 분석 요청
            analysis_request = {
                "video_url": video_url,
                "application_id": application_id
            }
            
            response = requests.post(
                f"{self.whisper_service_url}/analyze-video",
                json=analysis_request,
                timeout=300
            )
            
            if response.status_code != 200:
                logger.error(f"Whisper 서비스 오류: {response.status_code}")
                return None
            
            analysis_data = response.json()
            whisper_result = analysis_data.get("whisper_result", {})
            
            # 종합 점수 계산 (간단한 예시)
            overall_score = self._calculate_overall_score(whisper_result, analysis_data)
            
            # 기존 분석 결과 확인
            existing_video_analysis = db.query(MediaAnalysis).filter(
                MediaAnalysis.application_id == application_id
            ).first()
            
            if existing_video_analysis:
                # 업데이트
                existing_video_analysis.video_path = video_url
                existing_video_analysis.video_url = application.ai_interview_video_url
                existing_video_analysis.analysis_timestamp = datetime.now()
                existing_video_analysis.status = "completed"
                existing_video_analysis.overall_score = overall_score
                # JSON 필드 갱신
                existing_video_analysis.facial_expressions = json.dumps(analysis_data.get("facial_expressions", {}))
                existing_video_analysis.posture_analysis = json.dumps(analysis_data.get("posture_analysis", {}))
                existing_video_analysis.gaze_analysis = json.dumps(analysis_data.get("gaze_analysis", {}))
                existing_video_analysis.audio_analysis = json.dumps({
                    "transcription": whisper_result.get("text", ""),
                    "segments": whisper_result.get("segments", [])
                })
                existing_video_analysis.recommendations = json.dumps(analysis_data.get("recommendations", []))
                existing_video_analysis.transcription = whisper_result.get("text", "")
                existing_video_analysis.detailed_analysis = analysis_data
                db.commit()
            else:
                # 신규 생성
                video_analysis = MediaAnalysis(
                    application_id=application_id,
                    video_path=video_url,
                    video_url=application.ai_interview_video_url,
                    analysis_timestamp=datetime.now(),
                    status="completed",
                    overall_score=overall_score,
                    facial_expressions=json.dumps(analysis_data.get("facial_expressions", {})),
                    posture_analysis=json.dumps(analysis_data.get("posture_analysis", {})),
                    gaze_analysis=json.dumps(analysis_data.get("gaze_analysis", {})),
                    audio_analysis=json.dumps({
                        "transcription": whisper_result.get("text", ""),
                        "segments": whisper_result.get("segments", [])
                    }),
                    recommendations=json.dumps(analysis_data.get("recommendations", [])),
                    transcription=whisper_result.get("text", ""),
                    detailed_analysis=analysis_data
                )
                db.add(video_analysis)
                db.commit()
            
            print(f"✅ 백그라운드 Whisper 분석 완료: 지원자 {application_id}")
            return whisper_result
            
        except Exception as e:
            print(f"❌ 백그라운드 Whisper 분석 오류: {str(e)}")
            return None
        finally:
            db.close()
    
    def _calculate_overall_score(self, whisper_result: Dict[str, Any], analysis_data: Dict[str, Any]) -> float:
        """종합 점수 계산"""
        try:
            # 기본 점수
            base_score = 3.0
            
            # Whisper 결과 기반 점수
            if whisper_result.get("text"):
                text_length = len(whisper_result["text"])
                if text_length > 100:
                    base_score += 0.5
                elif text_length > 50:
                    base_score += 0.3
            
            # 분석 데이터 기반 점수
            facial_score = analysis_data.get("facial_expressions", {}).get("confidence_score", 0) or 0
            posture_score = analysis_data.get("posture_analysis", {}).get("posture_score", 0) or 0
            
            overall_score = base_score + (facial_score * 0.3) + (posture_score * 0.2)
            
            # 최대 5점으로 제한
            return min(overall_score, 5.0)
            
        except Exception as e:
            logger.error(f"점수 계산 오류: {str(e)}")
            return 3.0

# 전역 서비스 인스턴스
whisper_analysis_service = WhisperAnalysisService()
