from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationDetail, 
    ApplicationList, ApplicantList, ApplicationStatusHistoryCreate
)
from app.models.application import Application, ApplicationStatusHistory, ApplyStatus
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ApplicationList])
def get_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    applications = db.query(Application).offset(skip).limit(limit).all()
    return applications


@router.get("/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.post("/", response_model=ApplicationDetail)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_application = Application(**application.dict(), user_id=current_user.id)
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.put("/{application_id}/status")
def update_application_status(
    application_id: int,
    status_update: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if status_update.status:
        # 상태 변경 히스토리 기록
        status_history = ApplicationStatusHistory(
            application_id=application_id,
            status=str(status_update.status),
            comment=status_update.cover_letter
        )
        db.add(status_history)
        
        # 애플리케이션 상태 업데이트
        application.status = str(status_update.status)  # type: ignore
    
    db.commit()
    return {"message": "Application status updated successfully"}


@router.get("/job/{job_post_id}/applicants", response_model=List[ApplicantList])
def get_applicants_by_job(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    applications = db.query(Application).filter(Application.job_post_id == job_post_id).all()
    applicants = []
    for app in applications:
        user = db.query(User).filter(User.id == app.user_id).first()
        if user:
            applicants.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "application_id": app.id,
                "status": app.status,
                "created_at": app.created_at
            })
    return applicants 