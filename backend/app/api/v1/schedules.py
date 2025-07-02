from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.schedule import Schedule, ScheduleInterview
from app.models.user import User
from app.api.v1.auth import get_current_user

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
            "interview_type": interview.interview_type,
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
    interview_type: str = "ONSITE",
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_interview = ScheduleInterview(
        application_id=application_id,
        interviewer_id=interviewer_id,
        schedule_id=schedule_id,
        interview_type=interview_type,
        notes=notes
    )
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    
    return {
        "id": db_interview.id,
        "application_id": db_interview.application_id,
        "interviewer_id": db_interview.interviewer_id,
        "schedule_id": db_interview.schedule_id,
        "interview_type": db_interview.interview_type,
        "status": db_interview.status,
        "notes": db_interview.notes,
        "created_at": db_interview.created_at
    } 