# === Media Analysis API ===
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import requests
import logging
from datetime import datetime
import json

from app.core.database import get_db
from app.models.v2.media_analysis import MediaAnalysis
from app.models.v2.document.application import Application
from app.api.v2.auth.auth import get_current_user
from app.models.v2.auth.user import User

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
        
        if not application.ai_interview_video_url:
            raise HTTPException(status_code=400, detail="AI 면접 영상이 없습니다")
        
        # 기존 분석 결과가 있는지 확인
        existing_analysis = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == application_id
        ).first()
        
        if existing_analysis:
            return {
                "success": True,
                "message": "이미 분석된 영상입니다",
                "analysis": existing_analysis.to_dict(),
                "is_cached": True
            }
        
        # Video Analysis 서비스에 분석 요청
        try:
            analysis_request = {
                "video_url": application.ai_interview_video_url,
                "application_id": application_id
            }
            
            response = requests.post(
                f"{VIDEO_ANALYSIS_SERVICE_URL}/analyze-video",
                json=analysis_request,
                timeout=300
            )
            
            if response.status_code == 200:
                analysis_data = response.json()
                video_url = application.ai_interview_video_url
                
                # DB에 저장
                media_analysis = MediaAnalysis(
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
                
                db.add(media_analysis)
                db.commit()
                db.refresh(media_analysis)
                
                return {
                    "success": True,
                    "message": "영상 분석이 완료되었습니다",
                    "analysis": media_analysis.to_dict(),
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
        existing_analysis = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == application_id
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
            new_analysis = MediaAnalysis(
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
async def get_analysis_result(
    application_id: int,
    db: Session = Depends(get_db)
):
    """분석 결과 조회"""
    try:
        logger.info(f"Video Analysis 결과 조회 시작: application_id={application_id}")
        
        analysis = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == application_id
        ).first()
        
        if not analysis:
            logger.warning(f"Video Analysis 결과 없음: application_id={application_id}")
            raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다")
        
        logger.info(f"Video Analysis 결과 발견: id={analysis.id}, status={getattr(analysis, 'status', 'unknown')}")
        
        # 안전하게 컬럼 값 가져오기 (존재하지 않는 컬럼은 None으로 처리)
        try:
            analysis_data = {
                "id": getattr(analysis, 'id', None),
                "application_id": getattr(analysis, 'application_id', None),
                "video_path": getattr(analysis, 'video_path', None),
                "video_url": getattr(analysis, 'video_url', None),
                "analysis_timestamp": getattr(analysis, 'analysis_timestamp', None),
                "status": getattr(analysis, 'status', None),
                "overall_score": getattr(analysis, 'overall_score', None),
                "frame_count": getattr(analysis, 'frame_count', None),
                "fps": getattr(analysis, 'fps', None),
                "duration": getattr(analysis, 'duration', None),
                "smile_frequency": getattr(analysis, 'smile_frequency', None),
                "eye_contact_ratio": getattr(analysis, 'eye_contact_ratio', None),
                "emotion_variation": getattr(analysis, 'emotion_variation', None),
                "confidence_score": getattr(analysis, 'confidence_score', None),
                "posture_changes": getattr(analysis, 'posture_changes', None),
                "nod_count": getattr(analysis, 'nod_count', None),
                "posture_score": getattr(analysis, 'posture_score', None),
                "hand_gestures": getattr(analysis, 'hand_gestures', None),
                "eye_aversion_count": getattr(analysis, 'eye_aversion_count', None),
                "focus_ratio": getattr(analysis, 'focus_ratio', None),
                "gaze_consistency": getattr(analysis, 'gaze_consistency', None),
                "speech_rate": getattr(analysis, 'speech_rate', None),
                "clarity_score": getattr(analysis, 'clarity_score', None),
                "volume_consistency": getattr(analysis, 'volume_consistency', None),
                "transcription": getattr(analysis, 'transcription', None),
                "recommendations": getattr(analysis, 'recommendations', None),
                "detailed_analysis": getattr(analysis, 'detailed_analysis', None)
            }
            
            # analysis_timestamp가 datetime 객체인 경우 ISO 형식으로 변환
            if analysis_data["analysis_timestamp"] and hasattr(analysis_data["analysis_timestamp"], 'isoformat'):
                analysis_data["analysis_timestamp"] = analysis_data["analysis_timestamp"].isoformat()
            
            return {
                "success": True,
                "analysis": analysis_data
            }
        except Exception as e:
            logger.error(f"분석 데이터 변환 오류: {str(e)}")
            # 기본 데이터만 반환
            return {
                "success": True,
                "analysis": {
                    "id": getattr(analysis, 'id', None),
                    "application_id": getattr(analysis, 'application_id', None),
                    "status": getattr(analysis, 'status', 'unknown'),
                    "error": "일부 데이터 변환에 실패했습니다"
                }
            }
        
    except Exception as e:
        logger.error(f"분석 결과 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="분석 결과 조회 중 오류가 발생했습니다")

@router.get("/status/{application_id}")
async def get_analysis_status(
    application_id: int,
    db: Session = Depends(get_db)
):
    """분석 상태 확인"""
    try:
        analysis = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == application_id
        ).first()
        
        if not analysis:
            return {
                "success": True,
                "status": "not_started",
                "message": "분석이 시작되지 않았습니다"
            }
        
        return {
            "success": True,
            "status": analysis.status,
            "message": f"분석 상태: {analysis.status}",
            "timestamp": analysis.analysis_timestamp.isoformat() if analysis.analysis_timestamp else None
        }
        
    except Exception as e:
        logger.error(f"분석 상태 확인 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="분석 상태 확인 중 오류가 발생했습니다") 