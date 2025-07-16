from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.api.v1.auth import get_current_user
# 스케줄러 싱글톤 인스턴스
from app.scheduler.job_status_scheduler import JobStatusScheduler

# 싱글톤 인스턴스 가져오기
job_status_scheduler = JobStatusScheduler()

router = APIRouter()

@router.post("/manual-update")
async def manual_job_status_update(
    current_user: User = Depends(get_current_user)
):
    """수동 JobPost 상태 업데이트 실행"""
    # 기업 사용자만 접근 가능
    if current_user.role not in ["ADMIN", "MEMBER", "MANAGER", "EMPLOYEE"]:
        raise HTTPException(status_code=403, detail="기업 회원만 접근 가능합니다")
    
    try:
        result = await job_status_scheduler.run_manual_update()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 업데이트 실패: {str(e)}")

@router.get("/scheduler-status")
async def get_job_status_scheduler_status(
    current_user: User = Depends(get_current_user)
):
    """JobPost 상태 스케줄러 상태 확인"""
    # 기업 사용자만 접근 가능
    if current_user.role not in ["ADMIN", "MEMBER", "MANAGER", "EMPLOYEE"]:
        raise HTTPException(status_code=403, detail="기업 회원만 접근 가능합니다")
    
    try:
        status = job_status_scheduler.get_scheduler_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스케줄러 상태 확인 실패: {str(e)}") 