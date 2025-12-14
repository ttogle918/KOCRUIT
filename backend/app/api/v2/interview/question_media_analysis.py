# === Question Media Analysis API ===
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import httpx
import json
import logging
from datetime import datetime

from app.core.database import get_db
from app.models.v2.interview.question_media_analysis import QuestionMediaAnalysis
from app.models.v2.interview.interview_question_log import InterviewQuestionLog
from app.models.v2.document.application import Application
from app.services.v2.interview.whisper_analysis_service import WhisperAnalysisService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze/{application_id}")
async def analyze_question_media(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """질문별 미디어 분석 실행"""
    try:
        # 지원자 정보 조회
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        if not application.ai_interview_video_url:
            raise HTTPException(status_code=400, detail="비디오 URL이 없습니다")
        
        # 질문 로그 조회
        question_logs = db.query(InterviewQuestionLog).filter(
            InterviewQuestionLog.application_id == application_id,
            InterviewQuestionLog.interview_type == "AI_INTERVIEW"
        ).order_by(InterviewQuestionLog.created_at).all()
        
        if not question_logs:
            raise HTTPException(status_code=400, detail="질문 로그가 없습니다")
        
        # 기존 분석 결과 확인
        existing_analyses = db.query(QuestionMediaAnalysis).filter(
            QuestionMediaAnalysis.application_id == application_id,
            QuestionMediaAnalysis.status == "completed"
        ).count()
        
        # 이미 모든 질문이 분석된 경우
        if existing_analyses >= len(question_logs):
            return {
                "success": True,
                "message": f"이미 분석이 완료되었습니다 ({existing_analyses}개 질문)",
                "application_id": application_id,
                "question_count": existing_analyses,
                "already_analyzed": True
            }
        
        # 질문 로그 데이터 준비
        question_data = []
        for i, log in enumerate(question_logs):
            question_data.append({
                "id": log.id,
                "question_text": log.question_text,
                "question_index": i,
                "answer_start_time": None,  # 시간 정보는 나중에 추출
                "answer_end_time": None
            })
        
        # 백그라운드에서 질문별 분석 실행
        background_tasks.add_task(
            _run_question_analysis,
            application_id,
            application.ai_interview_video_url,
            question_data
        )
        
        return {
            "success": True,
            "message": f"질문별 미디어 분석이 시작되었습니다 ({len(question_logs)}개 질문, 기존 {existing_analyses}개 완료)",
            "application_id": application_id,
            "question_count": len(question_logs),
            "already_analyzed": False
        }
        
    except Exception as e:
        logger.error(f"질문별 미디어 분석 시작 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 시작 중 오류가 발생했습니다: {str(e)}")

@router.get("/results/{application_id}")
async def get_question_media_analysis_results(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """질문별 미디어 분석 결과 조회 (자동 분석 포함)"""
    try:
        # 질문별 분석 결과 조회
        question_analyses = db.query(QuestionMediaAnalysis).filter(
            QuestionMediaAnalysis.application_id == application_id
        ).order_by(QuestionMediaAnalysis.analysis_timestamp).all()
        
        if not question_analyses:
            # 지원자 정보 조회하여 비디오 URL 확인
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application:
                return {
                    "success": False,
                    "message": "지원자 정보를 찾을 수 없습니다",
                    "results": [],
                    "error_type": "no_application"
                }
            
            # 비디오 URL이 없어도 기본 정보는 반환 (화면 표시용)
            if not application.ai_interview_video_url:
                return {
                    "success": False,
                    "message": "AI 면접 비디오가 없습니다. 비디오 업로드 후 분석을 시작해주세요.",
                    "results": [],
                    "no_video": True,
                    "error_type": "no_video",
                    "application_info": {
                        "id": application.id,
                        "name": getattr(application, 'name', 'Unknown'),
                        "email": getattr(application, 'email', 'Unknown'),
                        "ai_interview_score": getattr(application, 'ai_interview_score', None),
                        "ai_interview_status": getattr(application, 'ai_interview_status', None)
                    }
                }
            
            # 분석 결과가 없으면 자동으로 분석 시작
            try:
                await _auto_start_analysis(application_id, background_tasks, db)
                return {
                    "success": False,
                    "message": "분석 결과가 없어 자동으로 분석을 시작했습니다. 잠시 후 다시 확인해주세요.",
                    "results": [],
                    "auto_started": True
                }
            except Exception as e:
                logger.error(f"자동 분석 시작 실패: {str(e)}")
                return {
                    "success": False,
                    "message": "분석 결과가 없습니다",
                    "results": []
                }
        
        # 결과 데이터 변환 (최적화)
        results = []
        for analysis in question_analyses:
            # detailed_analysis는 제외하여 응답 크기 줄이기
            result = {
                "id": analysis.id,
                "application_id": analysis.application_id,
                "question_log_id": analysis.question_log_id,
                "question_text": analysis.question_text,
                "timing": {
                    "question_start": float(analysis.question_start_time) if analysis.question_start_time else None,
                    "question_end": float(analysis.question_end_time) if analysis.question_end_time else None,
                    "answer_start": float(analysis.answer_start_time) if analysis.answer_start_time else None,
                    "answer_end": float(analysis.answer_end_time) if analysis.answer_end_time else None
                },
                "analysis_timestamp": analysis.analysis_timestamp.isoformat() if analysis.analysis_timestamp else None,
                "status": analysis.status,
                "facial_expressions": {
                    "smile_frequency": float(analysis.smile_frequency) if analysis.smile_frequency else None,
                    "eye_contact_ratio": float(analysis.eye_contact_ratio) if analysis.eye_contact_ratio else None,
                    "emotion_variation": analysis.emotion_variation,
                    "confidence_score": float(analysis.confidence_score) if analysis.confidence_score else None
                },
                "posture_analysis": {
                    "posture_changes": analysis.posture_changes,
                    "nod_count": analysis.nod_count,
                    "posture_score": float(analysis.posture_score) if analysis.posture_score else None,
                    "hand_gestures": analysis.hand_gestures or []
                },
                "gaze_analysis": {
                    "eye_aversion_count": analysis.eye_aversion_count,
                    "focus_ratio": float(analysis.focus_ratio) if analysis.focus_ratio else None,
                    "gaze_consistency": float(analysis.gaze_consistency) if analysis.gaze_consistency else None
                },
                "audio_analysis": {
                    "speech_rate": analysis.speech_rate,
                    "clarity_score": float(analysis.clarity_score) if analysis.clarity_score else None,
                    "volume_consistency": float(analysis.volume_consistency) if analysis.volume_consistency else None,
                    "transcription": analysis.transcription
                },
                "question_score": float(analysis.question_score) if analysis.question_score else None,
                "question_feedback": analysis.question_feedback
            }
            results.append(result)
        
        # 통계 계산
        statistics = _calculate_question_statistics(question_analyses)
        
        return {
            "success": True,
            "message": "질문별 미디어 분석 결과 조회 완료",
            "results": results,
            "statistics": statistics,
            "total_questions": len(question_analyses)
        }
        
    except Exception as e:
        logger.error(f"질문별 미디어 분석 결과 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"결과 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/statistics/{application_id}")
async def get_question_media_analysis_statistics(
    application_id: int,
    db: Session = Depends(get_db)
):
    """질문별 미디어 분석 통계 조회"""
    try:
        # 질문별 분석 결과 조회
        question_analyses = db.query(QuestionMediaAnalysis).filter(
            QuestionMediaAnalysis.application_id == application_id
        ).all()
        
        if not question_analyses:
            return {
                "success": False,
                "message": "분석 결과가 없습니다",
                "statistics": {}
            }
        
        # 통계 계산
        statistics = _calculate_question_statistics(question_analyses)
        
        return {
            "success": True,
            "message": "질문별 미디어 분석 통계 조회 완료",
            "statistics": statistics
        }
        
    except Exception as e:
        logger.error(f"질문별 미디어 분석 통계 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"통계 조회 중 오류가 발생했습니다: {str(e)}")

async def _auto_start_analysis(application_id: int, background_tasks: BackgroundTasks, db: Session):
    """자동으로 미디어 분석 시작"""
    try:
        # 지원자 정보 조회
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application or not application.ai_interview_video_url:
            raise Exception("비디오 URL이 없습니다")
        
        # 질문 로그 조회
        question_logs = db.query(InterviewQuestionLog).filter(
            InterviewQuestionLog.application_id == application_id,
            InterviewQuestionLog.interview_type == "AI_INTERVIEW"
        ).order_by(InterviewQuestionLog.created_at).all()
        
        if not question_logs:
            raise Exception("질문 로그가 없습니다")
        
        # 질문 로그 데이터 준비
        question_data = []
        for i, log in enumerate(question_logs):
            question_data.append({
                "id": log.id,
                "question_text": log.question_text,
                "question_index": i,
                "answer_start_time": None,
                "answer_end_time": None
            })
        
        # 백그라운드에서 분석 실행
        background_tasks.add_task(
            _run_question_analysis,
            application_id,
            application.ai_interview_video_url,
            question_data
        )
        
        logger.info(f"자동 미디어 분석 시작: 지원자 {application_id}")
        
    except Exception as e:
        logger.error(f"자동 미디어 분석 시작 오류: {str(e)}")
        raise

async def _run_question_analysis(application_id: int, video_url: str, question_logs: List[Dict]):
    """백그라운드에서 질문별 미디어 분석 실행"""
    try:
        logger.info(f"질문별 미디어 분석 시작: 지원자 {application_id}")
        
        # video-analysis 서비스로 질문별 분석 요청
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://kocruit_video_analysis:8002/analyze-question-segments",
                json={
                    "video_url": video_url,
                    "question_logs": question_logs
                },
                timeout=600  # 10분 타임아웃
            )
            
            if response.status_code == 200:
                analysis_result = response.json()
                
                # DB에 결과 저장
                db = next(get_db())
                try:
                    await _save_question_analysis_results(db, application_id, analysis_result)
                    logger.info(f"질문별 미디어 분석 완료: 지원자 {application_id}")
                except Exception as e:
                    logger.error(f"질문별 미디어 분석 결과 저장 오류: {str(e)}")
                finally:
                    db.close()
            else:
                logger.error(f"질문별 미디어 분석 실패: 지원자 {application_id}, 상태: {response.status_code}")
                
    except Exception as e:
        logger.error(f"질문별 미디어 분석 실행 오류: 지원자 {application_id}, 오류: {str(e)}")

async def _save_question_analysis_results(db: Session, application_id: int, analysis_result: Dict):
    """질문별 미디어 분석 결과를 DB에 저장"""
    try:
        question_analyses = analysis_result.get("question_analyses", [])
        
        for question_analysis in question_analyses:
            if not question_analysis or "analysis_result" not in question_analysis:
                continue
            
            # 기존 분석 결과가 있는지 확인
            existing_analysis = db.query(QuestionMediaAnalysis).filter(
                QuestionMediaAnalysis.application_id == application_id,
                QuestionMediaAnalysis.question_log_id == question_analysis.get("question_log_id")
            ).first()
            
            # 이미 완료된 분석이면 건너뛰기
            if existing_analysis and existing_analysis.status == "completed":
                logger.info(f"이미 완료된 미디어 분석 건너뛰기: 지원자 {application_id}, 질문 {question_analysis.get('question_log_id')}")
                continue
            
            analysis_data = question_analysis["analysis_result"]
            
            if existing_analysis:
                # 기존 결과 업데이트
                existing_analysis.question_text = question_analysis.get("question_text", "")
                existing_analysis.question_start_time = question_analysis.get("question_start_time")
                existing_analysis.question_end_time = question_analysis.get("question_end_time")
                existing_analysis.answer_start_time = question_analysis.get("answer_start_time")
                existing_analysis.answer_end_time = question_analysis.get("answer_end_time")
                existing_analysis.analysis_timestamp = datetime.now()
                
                # 분석 결과 업데이트
                if "facial_expressions" in analysis_data:
                    facial = analysis_data["facial_expressions"]
                    existing_analysis.smile_frequency = facial.get("smile_frequency")
                    existing_analysis.eye_contact_ratio = facial.get("eye_contact_ratio")
                    existing_analysis.emotion_variation = facial.get("emotion_variation")
                    existing_analysis.confidence_score = facial.get("confidence_score")
                
                if "posture_analysis" in analysis_data:
                    posture = analysis_data["posture_analysis"]
                    existing_analysis.posture_changes = posture.get("posture_changes")
                    existing_analysis.nod_count = posture.get("nod_count")
                    existing_analysis.posture_score = posture.get("posture_score")
                    existing_analysis.hand_gestures = posture.get("hand_gestures", [])  # JSON 타입으로 직접 저장
                
                if "gaze_analysis" in analysis_data:
                    gaze = analysis_data["gaze_analysis"]
                    existing_analysis.eye_aversion_count = gaze.get("eye_aversion_count")
                    existing_analysis.focus_ratio = gaze.get("focus_ratio")
                    existing_analysis.gaze_consistency = gaze.get("gaze_consistency")
                
                if "audio_analysis" in analysis_data:
                    audio = analysis_data["audio_analysis"]
                    existing_analysis.speech_rate = audio.get("speech_rate")
                    existing_analysis.clarity_score = audio.get("clarity_score")
                    existing_analysis.volume_consistency = audio.get("volume_consistency")
                    existing_analysis.transcription = audio.get("transcription")
                
                existing_analysis.question_score = analysis_data.get("overall_score")
                existing_analysis.question_feedback = analysis_data.get("recommendations", [])  # JSON 타입으로 직접 저장
                existing_analysis.detailed_analysis = analysis_data  # JSON 타입으로 직접 저장
                existing_analysis.status = "completed"
                
            else:
                # 새로운 분석 결과 생성
                new_analysis = QuestionMediaAnalysis(
                    application_id=application_id,
                    question_log_id=question_analysis.get("question_log_id"),
                    question_text=question_analysis.get("question_text", ""),
                    question_start_time=question_analysis.get("question_start_time"),
                    question_end_time=question_analysis.get("question_end_time"),
                    answer_start_time=question_analysis.get("answer_start_time"),
                    answer_end_time=question_analysis.get("answer_end_time"),
                    analysis_timestamp=datetime.now(),
                    status="completed"
                )
                
                # 분석 결과 설정
                if "facial_expressions" in analysis_data:
                    facial = analysis_data["facial_expressions"]
                    new_analysis.smile_frequency = facial.get("smile_frequency")
                    new_analysis.eye_contact_ratio = facial.get("eye_contact_ratio")
                    new_analysis.emotion_variation = facial.get("emotion_variation")
                    new_analysis.confidence_score = facial.get("confidence_score")
                
                if "posture_analysis" in analysis_data:
                    posture = analysis_data["posture_analysis"]
                    new_analysis.posture_changes = posture.get("posture_changes")
                    new_analysis.nod_count = posture.get("nod_count")
                    new_analysis.posture_score = posture.get("posture_score")
                    new_analysis.hand_gestures = posture.get("hand_gestures", [])  # JSON 타입으로 직접 저장
                
                if "gaze_analysis" in analysis_data:
                    gaze = analysis_data["gaze_analysis"]
                    new_analysis.eye_aversion_count = gaze.get("eye_aversion_count")
                    new_analysis.focus_ratio = gaze.get("focus_ratio")
                    new_analysis.gaze_consistency = gaze.get("gaze_consistency")
                
                if "audio_analysis" in analysis_data:
                    audio = analysis_data["audio_analysis"]
                    new_analysis.speech_rate = audio.get("speech_rate")
                    new_analysis.clarity_score = audio.get("clarity_score")
                    new_analysis.volume_consistency = audio.get("volume_consistency")
                    new_analysis.transcription = audio.get("transcription")
                
                new_analysis.question_score = analysis_data.get("overall_score")
                new_analysis.question_feedback = analysis_data.get("recommendations", [])  # JSON 타입으로 직접 저장
                new_analysis.detailed_analysis = analysis_data  # JSON 타입으로 직접 저장
                
                db.add(new_analysis)
        
        db.commit()
        logger.info(f"질문별 미디어 분석 결과 저장 완료: 지원자 {application_id}")
        
    except Exception as e:
        db.rollback()
        logger.error(f"질문별 미디어 분석 결과 저장 오류: {str(e)}")
        raise

def _calculate_question_statistics(question_analyses: List[QuestionMediaAnalysis]) -> Dict:
    """질문별 미디어 분석 통계 계산"""
    if not question_analyses:
        return {}
    
    # 점수들 수집
    scores = []
    facial_scores = []
    posture_scores = []
    gaze_scores = []
    audio_scores = []
    
    for analysis in question_analyses:
        if analysis.question_score:
            scores.append(float(analysis.question_score))
        if analysis.confidence_score:
            facial_scores.append(float(analysis.confidence_score))
        if analysis.posture_score:
            posture_scores.append(float(analysis.posture_score))
        if analysis.focus_ratio:
            gaze_scores.append(float(analysis.focus_ratio))
        if analysis.clarity_score:
            audio_scores.append(float(analysis.clarity_score))
    
    # 통계 계산
    def calculate_stats(values):
        if not values:
            return {}
        return {
            "mean": sum(values) / len(values),
            "min": min(values),
            "max": max(values),
            "count": len(values)
        }
    
    return {
        "overall_score": calculate_stats(scores),
        "facial_expression_score": calculate_stats(facial_scores),
        "posture_score": calculate_stats(posture_scores),
        "gaze_score": calculate_stats(gaze_scores),
        "audio_score": calculate_stats(audio_scores),
        "total_questions_analyzed": len(question_analyses)
    } 