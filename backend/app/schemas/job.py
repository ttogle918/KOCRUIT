from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TeamMemberDto(BaseModel):
    email: str
    role: str


class WeightDto(BaseModel):
    item: str
    score: float


class InterviewScheduleCreate(BaseModel):
    interview_date: str  # YYYY-MM-DD
    interview_time: str  # HH:MM
    location: str
    max_participants: Optional[int] = 1
    notes: Optional[str] = None


class InterviewScheduleDetail(BaseModel):
    id: int
    job_post_id: int
    title: str
    location: str
    scheduled_at: datetime
    status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobPostCreate(BaseModel):
    title: str
    department: Optional[str] = None
    qualifications: Optional[str] = None
    conditions: Optional[str] = None
    job_details: Optional[str] = None
    procedures: Optional[str] = None
    headcount: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    company_id: Optional[int] = None
    teamMembers: Optional[List[TeamMemberDto]] = None
    weights: Optional[List[WeightDto]] = None
    interview_schedules: Optional[List[InterviewScheduleCreate]] = None


class JobPostUpdate(BaseModel):
    title: str
    department: Optional[str] = None
    qualifications: Optional[str] = None
    conditions: Optional[str] = None
    job_details: Optional[str] = None
    procedures: Optional[str] = None
    headcount: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    teamMembers: Optional[List[TeamMemberDto]] = None
    weights: Optional[List[WeightDto]] = None
    interview_schedules: Optional[List[InterviewScheduleCreate]] = None


class JobPostDetail(BaseModel):
    id: int
    company_id: int
    department_id: Optional[int] = None
    title: str
    department: Optional[str] = None
    qualifications: Optional[str] = None
    conditions: Optional[str] = None
    job_details: Optional[str] = None
    procedures: Optional[str] = None
    headcount: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None
    companyName: Optional[str] = None
    teamMembers: Optional[List[TeamMemberDto]] = None
    weights: Optional[List[WeightDto]] = None
    interview_schedules: Optional[List[InterviewScheduleDetail]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobPostList(BaseModel):
    id: int
    title: str
    procedures: Optional[str] = None
    headcount: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    companyName: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True 