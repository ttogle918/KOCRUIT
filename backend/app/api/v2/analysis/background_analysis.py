# === Background Analysis API ===
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v2.auth.auth import get_current_user
from app.models.v2.auth.user import User
from app.services.v2.background_analysis_service import background_analysis_service
from app.models.v2.document.application import Application
from app.api.v2.whisper_analysis import process_qa_local
import os
import requests
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/start")
async def start_background_analysis(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """백그라운드 분석 서비스 시작"""
    try:
        # 이미 실행 중인지 확인
        if background_analysis_service.is_running:
            return {"message": "백그라운드 분석 서비스가 이미 실행 중입니다", "status": "running"}
        
        # 백그라운드에서 분석 시작
        background_tasks.add_task(background_analysis_service.run_continuous_analysis)
        
        return {"message": "백그라운드 분석 서비스가 시작되었습니다", "status": "started"}
        
    except Exception as e:
        logger.error(f"백그라운드 분석 시작 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="백그라운드 분석 시작 중 오류가 발생했습니다")

@router.post("/stop")
async def stop_background_analysis(
    current_user: User = Depends(get_current_user)
):
    """백그라운드 분석 서비스 중지"""
    try:
        background_analysis_service.stop()
        return {"message": "백그라운드 분석 서비스가 중지되었습니다", "status": "stopped"}
        
    except Exception as e:
        logger.error(f"백그라운드 분석 중지 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="백그라운드 분석 중지 중 오류가 발생했습니다")

@router.get("/status")
async def get_background_analysis_status(
    current_user: User = Depends(get_current_user)
):
    """백그라운드 분석 서비스 상태 조회"""
    try:
        return {
            "is_running": background_analysis_service.is_running,
            "check_interval": background_analysis_service.check_interval,
            "max_concurrent_analyses": background_analysis_service.max_concurrent_analyses
        }
        
    except Exception as e:
        logger.error(f"백그라운드 분석 상태 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="백그라운드 분석 상태 조회 중 오류가 발생했습니다")

@router.post("/trigger-now")
async def trigger_analysis_now(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """즉시 분석 실행 (대기 중인 분석 처리)"""
    try:
        # 백그라운드에서 즉시 분석 실행
        background_tasks.add_task(background_analysis_service.process_pending_analyses)
        
        return {"message": "즉시 분석이 시작되었습니다", "status": "triggered"}
        
    except Exception as e:
        logger.error(f"즉시 분석 실행 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="즉시 분석 실행 중 오류가 발생했습니다") 


@router.post("/batch-qa-local")
async def batch_qa_local(
    payload: dict = {},
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """로컬/캐시 파일 기반으로 QA+감정/문맥 일괄 분석

    payload 옵션:
      - application_ids: [int] 지정 시 해당 id만 처리
      - persist: bool = True
      - output_dir: str = "/app/data/qa_slices"
      - max_workers: int = 3
      - max_duration_seconds: int = 600
      - run_emotion_context: bool = True
      - delete_after_input: bool = True
      - delete_video_after: bool = True
    """
    try:
        return await _run_batch_qa_local_core(db, payload)
    except Exception as e:
        logger.error(f"batch-qa-local 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/public-batch-qa-local")
async def public_batch_qa_local(payload: dict = {}, db: Session = Depends(get_db)):
    """개발용 퍼블릭 라우트(인증 없이 호출). 운영 배포 전엔 비활성/보호 필요"""
    try:
        return await _run_batch_qa_local_core(db, payload)
    except Exception as e:
        logger.error(f"public-batch-qa-local 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def _run_batch_qa_local_core(db: Session, payload: dict):
    application_ids = payload.get("application_ids") or []
    persist = bool(payload.get("persist", True))
    output_dir = payload.get("output_dir", "/app/data/qa_slices")
    max_workers = int(payload.get("max_workers", 3))
    max_duration_seconds = int(payload.get("max_duration_seconds", 600))
    run_emotion_context = bool(payload.get("run_emotion_context", True))
    delete_after_input = bool(payload.get("delete_after_input", True))
    delete_video_after = bool(payload.get("delete_video_after", True))

    # 대상 수집
    if application_ids:
        apps = db.query(Application).filter(Application.id.in_(application_ids)).all()
    else:
        apps = db.query(Application).filter(Application.ai_interview_video_url.isnot(None)).all()

    results = {"processed": 0, "success": [], "failed": []}

    for app in apps:
        app_id = app.id
        # 로컬 파일 우선
        candidate_audio = os.path.join(output_dir, f"{app_id}.wav")
        candidate_video = os.path.join(output_dir, f"{app_id}.mp4")
        audio_path = candidate_audio if os.path.exists(candidate_audio) else None
        video_path = candidate_video if os.path.exists(candidate_video) else None

        # 없으면 Drive에서 다운로드 시도 (video-analysis)
        if not audio_path and not video_path and app.ai_interview_video_url:
            try:
                resp = requests.post(
                    "http://video-analysis:8002/download-video",
                    json={"video_url": app.ai_interview_video_url, "application_id": app_id},
                    timeout=600
                )
                if resp.status_code == 200 and resp.json().get("success"):
                    video_path = resp.json().get("video_path")
            except Exception:
                video_path = None

        payload_one = {
            "application_id": app_id,
            "persist": persist,
            "output_dir": output_dir,
            "max_workers": max_workers,
            "max_duration_seconds": max_duration_seconds,
            "run_emotion_context": run_emotion_context,
            "delete_after_input": delete_after_input,
            "delete_video_after": delete_video_after
        }
        if audio_path:
            payload_one["audio_path"] = audio_path
        elif video_path:
            payload_one["video_path"] = video_path
        else:
            results["failed"].append({"application_id": app_id, "error": "no local file and no downloadable video"})
            continue

        try:
            # 내부 함수 직접 호출로 오버헤드 최소화
            res = await process_qa_local(payload_one, db)
            if res.get("success"):
                results["success"].append({"application_id": app_id, "total_pairs": res.get("total_pairs")})
                results["processed"] += 1
            else:
                results["failed"].append({"application_id": app_id, "error": res.get("detail") or res})
        except Exception as e:
            results["failed"].append({"application_id": app_id, "error": str(e)})

    return {"success": True, "summary": results}