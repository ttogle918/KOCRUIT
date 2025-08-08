# === Video Analysis API ===
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import requests
import logging
from datetime import datetime
import json

from app.core.database import get_db
from app.models.video_analysis import VideoAnalysis
from app.models.application import Application
from app.api.v1.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Video Analysis 서비스 URL
VIDEO_ANALYSIS_SERVICE_URL = "http://video-analysis:8002"

@router.post("/analyze/{application_id}")
async def analyze_video(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """영상 분석 요청"""
    try:
        # 지원자 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # 영상 URL 확인 (테스트용 공개 영상 URL 사용)
        video_url = application.ai_interview_video_url or application.video_url
        if not video_url:
            raise HTTPException(status_code=400, detail="분석할 영상 URL이 없습니다")
        
        # Google Drive URL 확인 및 로깅
        if 'drive.google.com' in video_url:
            logger.info(f"Google Drive URL 감지: {video_url}")
            logger.info("실제 Google Drive 영상을 사용하여 분석을 진행합니다")
        
        # 기존 분석 결과 확인
        existing_analysis = db.query(VideoAnalysis).filter(
            VideoAnalysis.application_id == application_id
        ).first()
        
        if existing_analysis:
            # 테스트를 위해 기존 결과 삭제하고 새로 분석
            logger.info(f"기존 분석 결과 삭제 후 새로 분석: application_id={application_id}")
            db.delete(existing_analysis)
            db.commit()
        
        # Video Analysis 서비스에 분석 요청
        try:
            logger.info(f"Video Analysis 서비스 요청: {VIDEO_ANALYSIS_SERVICE_URL}/analyze-video-url")
            logger.info(f"요청 데이터: video_url={video_url}, application_id={application_id}")
            
            response = requests.post(
                f"{VIDEO_ANALYSIS_SERVICE_URL}/analyze-video-url",
                json={
                    "video_url": video_url,
                    "application_id": application_id
                },
                timeout=300  # 5분 타임아웃
            )
            
            logger.info(f"Video Analysis 서비스 응답: status_code={response.status_code}")
            
            if response.status_code == 200:
                analysis_data = response.json()
                logger.info(f"Video Analysis 서비스 응답 데이터: {analysis_data}")
                
                # 응답 구조 확인 및 데이터 추출
                if "data" in analysis_data:
                    analysis_data = analysis_data["data"]
                elif "analysis" in analysis_data:
                    analysis_data = analysis_data["analysis"]
                
                # DB에 저장
                video_analysis = VideoAnalysis(
                    application_id=application_id,
                    video_path=analysis_data.get("video_path", ""),
                    video_url=video_url,
                    status=analysis_data.get("status", "completed"),
                    frame_count=analysis_data.get("video_info", {}).get("frame_count"),
                    fps=analysis_data.get("video_info", {}).get("fps"),
                    duration=analysis_data.get("video_info", {}).get("duration"),
                    smile_frequency=analysis_data.get("facial_expressions", {}).get("smile_frequency"),
                    eye_contact_ratio=analysis_data.get("facial_expressions", {}).get("eye_contact_ratio"),
                    emotion_variation=analysis_data.get("facial_expressions", {}).get("emotion_variation"),
                    confidence_score=analysis_data.get("facial_expressions", {}).get("confidence_score"),
                    posture_changes=analysis_data.get("posture_analysis", {}).get("posture_changes"),
                    nod_count=analysis_data.get("posture_analysis", {}).get("nod_count"),
                    posture_score=analysis_data.get("posture_analysis", {}).get("posture_score"),
                    hand_gestures=analysis_data.get("posture_analysis", {}).get("hand_gestures"),
                    eye_aversion_count=analysis_data.get("gaze_analysis", {}).get("eye_aversion_count"),
                    focus_ratio=analysis_data.get("gaze_analysis", {}).get("focus_ratio"),
                    gaze_consistency=analysis_data.get("gaze_analysis", {}).get("gaze_consistency"),
                    speech_rate=analysis_data.get("audio_analysis", {}).get("speech_rate"),
                    clarity_score=analysis_data.get("audio_analysis", {}).get("clarity_score"),
                    volume_consistency=analysis_data.get("audio_analysis", {}).get("volume_consistency"),
                    transcription=analysis_data.get("audio_analysis", {}).get("transcription"),
                    overall_score=analysis_data.get("overall_score"),
                    recommendations=analysis_data.get("recommendations"),
                    detailed_analysis=analysis_data
                )
                
                db.add(video_analysis)
                db.commit()
                db.refresh(video_analysis)
                
                return {
                    "success": True,
                    "message": "영상 분석이 완료되었습니다",
                    "analysis": video_analysis.to_dict(),
                    "is_cached": False
                }
            else:
                raise HTTPException(status_code=500, detail="Video Analysis 서비스 오류")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Video Analysis 서비스 연결 오류: {str(e)}")
            raise HTTPException(status_code=503, detail="Video Analysis 서비스를 사용할 수 없습니다")
            
    except Exception as e:
        logger.error(f"영상 분석 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")

@router.post("/save-analysis/{application_id}")
async def save_analysis_result(
    application_id: int,
    analysis_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """분석 결과 저장 (백그라운드 분석용)"""
    try:
        # 기존 분석 결과가 있는지 확인
        existing_analysis = db.query(VideoAnalysis).filter(
            VideoAnalysis.application_id == application_id
        ).first()
        
        if existing_analysis:
            # 기존 결과 업데이트
            existing_analysis.video_path = analysis_data.get("video_path", "")
            existing_analysis.video_url = analysis_data.get("video_url", "")
            existing_analysis.analysis_timestamp = datetime.now()
            existing_analysis.overall_score = analysis_data.get("overall_score", 0)
            existing_analysis.facial_expressions = json.dumps(analysis_data.get("facial_expressions", {}))
            existing_analysis.posture_analysis = json.dumps(analysis_data.get("posture_analysis", {}))
            existing_analysis.gaze_analysis = json.dumps(analysis_data.get("gaze_analysis", {}))
            existing_analysis.audio_analysis = json.dumps(analysis_data.get("audio_analysis", {}))
            existing_analysis.recommendations = json.dumps(analysis_data.get("recommendations", []))
            existing_analysis.status = "completed"
            
            db.commit()
            logger.info(f"분석 결과 업데이트 완료: 지원자 {application_id}")
            
        else:
            # 새로운 분석 결과 생성
            new_analysis = VideoAnalysis(
                application_id=application_id,
                video_path=analysis_data.get("video_path", ""),
                video_url=analysis_data.get("video_url", ""),
                analysis_timestamp=datetime.now(),
                overall_score=analysis_data.get("overall_score", 0),
                facial_expressions=json.dumps(analysis_data.get("facial_expressions", {})),
                posture_analysis=json.dumps(analysis_data.get("posture_analysis", {})),
                gaze_analysis=json.dumps(analysis_data.get("gaze_analysis", {})),
                audio_analysis=json.dumps(analysis_data.get("audio_analysis", {})),
                recommendations=json.dumps(analysis_data.get("recommendations", [])),
                status="completed"
            )
            
            db.add(new_analysis)
            db.commit()
            logger.info(f"새로운 분석 결과 저장 완료: 지원자 {application_id}")
        
        return {"success": True, "message": "분석 결과가 저장되었습니다"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"분석 결과 저장 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="분석 결과 저장 중 오류가 발생했습니다")

@router.get("/result/{application_id}")
async def get_video_analysis_result(
    application_id: int,
    db: Session = Depends(get_db)
):
    """영상 분석 결과 조회"""
    try:
        # DB에서 분석 결과 조회
        video_analysis = db.query(VideoAnalysis).filter(
            VideoAnalysis.application_id == application_id
        ).first()
        
        if not video_analysis:
            raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
        
        return {
            "success": True,
            "analysis": video_analysis.to_dict()
        }
        
    except Exception as e:
        logger.error(f"분석 결과 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"결과 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/status/{application_id}")
async def get_video_analysis_status(
    application_id: int,
    db: Session = Depends(get_db)
):
    """영상 분석 상태 조회"""
    try:
        video_analysis = db.query(VideoAnalysis).filter(
            VideoAnalysis.application_id == application_id
        ).first()
        
        if not video_analysis:
            return {
                "success": True,
                "status": "not_found",
                "message": "분석 결과가 없습니다"
            }
        
        return {
            "success": True,
            "status": video_analysis.status,
            "analysis_timestamp": video_analysis.analysis_timestamp.isoformat() if video_analysis.analysis_timestamp else None,
            "overall_score": video_analysis.overall_score
        }
        
    except Exception as e:
        logger.error(f"분석 상태 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"상태 조회 중 오류가 발생했습니다: {str(e)}")

@router.delete("/result/{application_id}")
async def delete_video_analysis_result(
    application_id: int,
    db: Session = Depends(get_db)
):
    """영상 분석 결과 삭제"""
    try:
        video_analysis = db.query(VideoAnalysis).filter(
            VideoAnalysis.application_id == application_id
        ).first()
        
        if not video_analysis:
            raise HTTPException(status_code=404, detail="삭제할 분석 결과가 없습니다")
        
        db.delete(video_analysis)
        db.commit()
        
        return {
            "success": True,
            "message": "분석 결과가 삭제되었습니다"
        }
        
    except Exception as e:
        logger.error(f"분석 결과 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"삭제 중 오류가 발생했습니다: {str(e)}") 