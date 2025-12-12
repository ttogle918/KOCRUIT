from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, aliased
from app.core.database import get_db
from app.models.application import Application, ApplicationStage, StageName, StageStatus, OverallStatus
from app.models.job import JobPost
from app.services.application_service import update_stage_status
import traceback

router = APIRouter()

@router.get("/failed/{jobpost_id}")
def get_written_test_failed_applicants(jobpost_id: int, db: Session = Depends(get_db)):
    """필기시험 불합격자 목록 조회"""
    try:
        # Document PASSED 이고 Written Test FAILED 인 지원자 조회
        DocStage = aliased(ApplicationStage)
        WrittenStage = aliased(ApplicationStage)
        
        failed_apps = db.query(Application).join(
            DocStage, Application.id == DocStage.application_id
        ).join(
            WrittenStage, Application.id == WrittenStage.application_id
        ).filter(
            Application.job_post_id == jobpost_id,
            DocStage.stage_name == StageName.DOCUMENT,
            DocStage.status == StageStatus.PASSED,
            WrittenStage.stage_name == StageName.WRITTEN_TEST,
            WrittenStage.status == StageStatus.FAILED
        ).all()
        
        return [
            {
                "id": app.id,
                "user_id": app.user.id if app.user else None,
                "user_name": app.user.name if app.user else None,
                "user_email": app.user.email if app.user else None,
                "user_phone": app.user.phone if app.user else None,
                "written_test_score": getattr(app, 'written_test_score', 0) # 호환성
            }
            for app in failed_apps
        ]
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"불합격자 조회 실패: {str(e)}")

@router.get("/passed/{jobpost_id}")
def get_written_test_passed_applicants(jobpost_id: int, db: Session = Depends(get_db)):
    """필기시험 합격자 목록 조회"""
    try:
        # Written Test PASSED 인 지원자 조회
        WrittenStage = aliased(ApplicationStage)
        
        passed_apps = db.query(Application).join(
            WrittenStage, Application.id == WrittenStage.application_id
        ).filter(
            Application.job_post_id == jobpost_id,
            WrittenStage.stage_name == StageName.WRITTEN_TEST,
            WrittenStage.status == StageStatus.PASSED
        ).all()
        
        return [
            {
                "id": app.id,
                "user_id": app.user.id if app.user else None,
                "user_name": app.user.name if app.user else None,
                "user_email": app.user.email if app.user else None,
                "user_phone": app.user.phone if app.user else None,
                "written_test_score": getattr(app, 'written_test_score', 0)
            }
            for app in passed_apps
        ]
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"합격자 조회 실패: {str(e)}")
