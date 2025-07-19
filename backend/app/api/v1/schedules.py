from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.schedule import Schedule, ScheduleInterview
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.models.application import Application, ApplyStatus, DocumentStatus, InterviewStatus
from app.schemas.application import ApplicationUpdate, ApplicationBulkStatusUpdate

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
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first()
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


@router.post("/", response_model=dict)
def create_schedule(
    title: str,
    description: str = None,
    start_time: datetime = None,
    end_time: datetime = None,
    location: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_schedule = Schedule(
        title=title,
        description=description,
        start_time=start_time,
        end_time=end_time,
        location=location,
        user_id=current_user.id
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    return {
        "id": db_schedule.id,
        "title": db_schedule.title,
        "description": db_schedule.description,
        "start_time": db_schedule.start_time,
        "end_time": db_schedule.end_time,
        "location": db_schedule.location,
        "created_at": db_schedule.created_at
    }


@router.put("/{schedule_id}", response_model=dict)
def update_schedule(
    schedule_id: int,
    title: str = None,
    description: str = None,
    start_time: datetime = None,
    end_time: datetime = None,
    location: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if title is not None:
        db_schedule.title = title
    if description is not None:
        db_schedule.description = description
    if start_time is not None:
        db_schedule.start_time = start_time
    if end_time is not None:
        db_schedule.end_time = end_time
    if location is not None:
        db_schedule.location = location
    
    db.commit()
    db.refresh(db_schedule)
    
    return {
        "id": db_schedule.id,
        "title": db_schedule.title,
        "description": db_schedule.description,
        "start_time": db_schedule.start_time,
        "end_time": db_schedule.end_time,
        "location": db_schedule.location,
        "created_at": db_schedule.created_at
    }


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.user_id == current_user.id
    ).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    return {"message": "Schedule deleted successfully"}


# Interview Schedule endpoints
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
    if application.document_status != DocumentStatus.PASSED.value:
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
    
    # 면접 일정 생성 시 interview_status를 SCHEDULED로 변경
    application.interview_status = InterviewStatus.SCHEDULED.value
    
    db.commit()
    db.refresh(db_interview)
    
    return {
        "id": db_interview.id,
        "application_id": db_interview.application_id,
        "interviewer_id": db_interview.interviewer_id,
        "schedule_id": db_interview.schedule_id,
        "status": db_interview.status,
        "notes": db_interview.notes,
        "created_at": db_interview.created_at,
        "interview_status": application.interview_status
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
    
    # 서류 상태 업데이트
    if status_update.document_status:
        application.document_status = str(status_update.document_status)
        
        # 서류 상태에 따른 메인 상태 업데이트
        if status_update.document_status == DocumentStatus.PASSED:
            application.status = ApplyStatus.IN_PROGRESS.value
        elif status_update.document_status == DocumentStatus.REJECTED:
            application.status = ApplyStatus.REJECTED.value
    
    # 메인 상태 직접 업데이트
    if status_update.status:
        application.status = str(status_update.status)
    
    # 면접 상태 업데이트
    if status_update.interview_status:
        application.interview_status = str(status_update.interview_status)
    
    db.commit()
    return {"message": "Application status updated successfully"}


@router.put("/{application_id}/interview-status")
def update_interview_status(
    application_id: int,
    interview_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """면접 상태만 업데이트하는 전용 API"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 서류 합격자만 면접 상태 변경 가능
    if application.document_status != DocumentStatus.PASSED.value:
        raise HTTPException(
            status_code=400, 
            detail="서류 합격자만 면접 상태를 변경할 수 있습니다."
        )
    
    # 유효한 면접 상태인지 확인
    valid_statuses = [status.value for status in InterviewStatus]
    if interview_status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"유효하지 않은 면접 상태입니다. 가능한 상태: {valid_statuses}"
        )
    
    application.interview_status = interview_status
    
    # 면접 완료 시 최종 상태 결정 로직
    if interview_status == InterviewStatus.COMPLETED.value:
        # 여기서 면접 평가 결과에 따라 최종 합격/불합격 결정
        # 실제로는 면접 평가 점수를 확인해야 함
        application.status = ApplyStatus.IN_PROGRESS.value  # 임시로 진행 중으로 설정
    
    db.commit()
    return {
        "message": "Interview status updated successfully",
        "interview_status": application.interview_status,
        "application_status": application.status
    }


@router.put("/bulk-status")
def bulk_update_application_status(
    bulk_update: ApplicationBulkStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    applications = db.query(Application).filter(Application.id.in_(bulk_update.application_ids)).all()
    if not applications:
        raise HTTPException(status_code=404, detail="No applications found")
    for app in applications:
        if bulk_update.status:
            app.status = str(bulk_update.status)
        if bulk_update.document_status:
            app.document_status = str(bulk_update.document_status)
    db.commit()
    return {"message": f"{len(applications)} applications updated successfully"} 

@router.get("/applicant/{applicant_id}", response_model=List[dict])
def get_interviews_by_applicant(applicant_id: int, db: Session = Depends(get_db)):
    """지원자 ID로 면접 일정 조회"""
    try:
        # 지원자 정보 확인
        applicant = db.query(User).filter(User.id == applicant_id).first()
        if not applicant:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다.")
        
        # 해당 지원자의 면접 일정 조회
        # schedule_interview.user_id는 면접 대상자(지원자)의 ID
        interviews = db.query(ScheduleInterview).filter(
            ScheduleInterview.user_id == applicant_id
        ).all()
        
        # 응답 데이터 구성
        interview_data = []
        for interview in interviews:
            interview_data.append({
                "id": interview.id,
                "schedule_id": interview.schedule_id,
                "user_id": interview.user_id,
                "schedule_date": interview.schedule_date.isoformat() if interview.schedule_date else None,
                "status": interview.status.value if interview.status else None
            })
        
        return interview_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"면접 일정 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/", response_model=List[dict])
def get_all_interviews(db: Session = Depends(get_db)):
    """모든 면접 일정 조회"""
    try:
        interviews = db.query(ScheduleInterview).all()
        
        interview_data = []
        for interview in interviews:
            interview_data.append({
                "id": interview.id,
                "schedule_id": interview.schedule_id,
                "user_id": interview.user_id,
                "schedule_date": interview.schedule_date,
                "status": interview.status
            })
        
        return interview_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"면접 일정 조회 중 오류가 발생했습니다: {str(e)}") 