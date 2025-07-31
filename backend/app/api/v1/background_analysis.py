# === Background Analysis API ===
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.services.background_analysis_service import background_analysis_service
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