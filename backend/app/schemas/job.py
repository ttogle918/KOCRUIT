from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TeamMemberDto(BaseModel):
    email: str
    role: str


class WeightDto(BaseModel):
    item: str
    score: float


class ScheduleDto(BaseModel):
    date: str
    time: str
    place: str


class PostInterviewCreate(BaseModel):
    interview_date: str  # YYYY-MM-DD
    interview_time: str  # HH:MM
    location: str
    interview_type: Optional[str] = "ONSITE"
    max_participants: Optional[int] = 1
    notes: Optional[str] = None


class PostInterviewDetail(BaseModel):
    id: int
    job_post_id: int
    interview_date: str
    interview_time: str
    location: str
    interview_type: str
    max_participants: Optional[int]
    notes: Optional[str]
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
    interview_schedules: Optional[List[PostInterviewCreate]] = None


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
    interview_schedules: Optional[List[PostInterviewCreate]] = None


class JobPostDetail(BaseModel):
    id: int
    company_id: int
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
    schedules: Optional[List[ScheduleDto]] = None  # 하위 호환성 유지
    weights: Optional[List[WeightDto]] = None
    interview_schedules: Optional[List[PostInterviewDetail]] = None
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


class JobBase(BaseModel):
    title: str
    company: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class JobCreate(JobBase):
    pass


class JobUpdate(JobBase):
    pass


class JobDetail(JobBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True 