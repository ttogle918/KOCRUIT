from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class JobPostBase(BaseModel):
    title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class JobPostCreate(JobPostBase):
    company_id: int


class JobPostUpdate(JobPostBase):
    pass


class JobPostDetail(JobPostBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class JobPostList(BaseModel):
    id: int
    title: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    status: str
    company_id: int
    created_at: datetime
    
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