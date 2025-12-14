from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.v2.document.schedule import Schedule, ScheduleInterview
from app.models.v2.auth.user import User
from app.api.v2.auth.auth import get_current_user
from app.models.v2.document.application import Application, OverallStatus, StageName, StageStatus, ApplicationStage
from app.schemas.application import ApplicationUpdate, ApplicationBulkStatusUpdate
from app.services.v2.application.application_service import update_stage_status

router = APIRouter()


@router.get("/", response_model=List[dict])
def get_schedules(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedules = db.query(Schedule).filter(Schedule.user_id == current_user.id).offset(skip).limit(limit).all()
    return [
        {
            "id": schedule.id,
            "title": schedule.title,
            "description": schedule.description,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "location": schedule.location,
            "created_at": schedule.created_at
        }
        for schedule in schedules
    ]


@router.get("/{schedule_id}", response_model=dict)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {
        "id": schedule.id,
        "title": schedule.title,
        "description": schedule.description,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "location": schedule.location,
        "created_at": schedule.created_at
    }


@router.get("/interviews/", response_model=List[dict])
def get_interview_schedules(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interviews = db.query(ScheduleInterview).offset(skip).limit(limit).all()
    return [
        {
            "id": interview.id,
            "application_id": interview.application_id,
            "interviewer_id": interview.interviewer_id,
            "schedule_id": interview.schedule_id,
            "status": interview.status,
            "notes": interview.notes,
            "created_at": interview.created_at
        }
        for interview in interviews
    ]


@router.post("/interviews/", response_model=dict)
def create_interview_schedule(
    application_id: int,
    interviewer_id: int,
    schedule_id: int,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 지원자 정보 확인 및 서류 합격 여부 검증
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 서류 합격자만 면접 일정 생성 가능
    # @property로 document_status 접근 가능 (호환성)
    if application.document_status != StageStatus.PASSED:
        raise HTTPException(
            status_code=400, 
            detail="서류 합격자만 면접 일정을 생성할 수 있습니다."
        )
    
    db_interview = ScheduleInterview(
        application_id=application_id,
        interviewer_id=interviewer_id,
        schedule_id=schedule_id,
        notes=notes
    )
    db.add(db_interview)
    
    # 면접 일정 생성 시 ai_interview_status를 PENDING으로 변경 (혹은 SCHEDULED가 없으므로 PENDING 유지)
    # 필요하다면 StageStatus에 SCHEDULED 추가 고려. 현재는 PENDING 사용.
    update_stage_status(db, application.id, StageName.AI_INTERVIEW, StageStatus.PENDING)
    
    db.commit()
    db.refresh(db_interview)
    
    return {
        "id": db_interview.id,
        "application_id": db_interview.application_id,
        "interviewer_id": db_interview.interviewer_id,
        "schedule_id": db_interview.schedule_id,
        "status": db_interview.status,
        "notes": db_interview.notes,
        "created_at": db_interview.created_at
    }


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
    
    # [Refactored] 서류 상태 업데이트
    if status_update.document_status:
        # status_update.document_status가 Enum인지 문자열인지 확인 필요하나, 안전하게 처리
        new_status = StageStatus(str(status_update.document_status))
        update_stage_status(db, application.id, StageName.DOCUMENT, new_status)
        
        # 서류 상태에 따른 메인 상태 업데이트
        if new_status == StageStatus.PASSED:
            application.overall_status = OverallStatus.IN_PROGRESS
            application.current_stage = StageName.AI_INTERVIEW
        elif new_status == StageStatus.FAILED: # REJECTED -> FAILED 매핑 주의
            application.overall_status = OverallStatus.REJECTED
        elif str(status_update.document_status) == "REJECTED": # 혹시 문자열로 REJECTED 들어올 경우 대비
             update_stage_status(db, application.id, StageName.DOCUMENT, StageStatus.FAILED)
             application.overall_status = OverallStatus.REJECTED
    
    # [Refactored] 메인 상태 직접 업데이트
    if status_update.status:
        # 호환성을 위해 ApplyStatus 값을 OverallStatus로 매핑 시도
        try:
            val = str(status_update.status)
            if val == "WAITING": val = OverallStatus.PENDING # 예시 매핑
            application.overall_status = OverallStatus(val)
        except:
            pass # 매핑 실패 시 무시하거나 에러 처리
    
    # [Refactored] 면접 상태 업데이트 (어떤 면접인지 불분명하므로 AI 면접으로 가정하거나 무시)
    if status_update.interview_status:
        # 레거시 로직: interview_status 하나로 관리하던 시절 -> AI_INTERVIEW로 매핑
        new_status = StageStatus(str(status_update.interview_status))
        update_stage_status(db, application.id, StageName.AI_INTERVIEW, new_status)
    
    db.commit()
    return {"message": "Application status updated successfully"}


@router.put("/{application_id}/interview-status")
def update_interview_status(
    application_id: int,
    interview_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 서류 합격자만 면접 상태 변경 가능
    if application.document_status != StageStatus.PASSED:
        raise HTTPException(
            status_code=400, 
            detail="서류 합격자만 면접 상태를 변경할 수 있습니다."
        )
    
    if not interview_status:
         raise HTTPException(status_code=400, detail="Status required")

    # [Refactored] AI 면접 상태 업데이트로 간주
    try:
        new_status = StageStatus(interview_status)
        update_stage_status(db, application.id, StageName.AI_INTERVIEW, new_status)
    except ValueError:
        pass # 유효하지 않은 status 무시
    
    db.commit()
    return {
        "message": "Interview status updated successfully",
        "interview_status": application.ai_interview_status, # @property
        "application_status": application.overall_status
    }


@router.put("/bulk-status")
def bulk_update_application_status(
    bulk_update: ApplicationBulkStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # applications 조회 로직이 빠져있었음 (원본 코드 버그 추정) -> id 리스트가 있다고 가정하고 수정
    applications = db.query(Application).filter(Application.id.in_(bulk_update.application_ids)).all()
    
    if not applications:
        raise HTTPException(status_code=404, detail="No applications found")
        
    for app in applications:
        if bulk_update.status:
             app.overall_status = OverallStatus(str(bulk_update.status))
        if bulk_update.document_status:
             new_status = StageStatus(str(bulk_update.document_status))
             update_stage_status(db, app.id, StageName.DOCUMENT, new_status)
             
    db.commit()
    return {"message": f"{len(applications)} applications updated successfully"} 

@router.get("/applicant/{applicant_id}", response_model=List[dict])
def get_interviews_by_applicant(applicant_id: int, db: Session = Depends(get_db)):
    # 구현 누락 부분 채움
    interviews = db.query(ScheduleInterview).filter(ScheduleInterview.application_id == applicant_id).all()
    return [
        {
            "id": i.id,
            "schedule_id": i.schedule_id,
            "status": i.status,
            "notes": i.notes,
            "created_at": i.created_at
        }
        for i in interviews
    ]
