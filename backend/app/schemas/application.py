from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.application import ApplyStatus, ApplicationViewAction


class ApplicationBase(BaseModel):
    job_post_id: int
    resume_id: int
    cover_letter: Optional[str] = None
    status: ApplyStatus = ApplyStatus.PENDING


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[ApplyStatus] = None
    cover_letter: Optional[str] = None


class ApplicationDetail(ApplicationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationList(BaseModel):
    id: int
    job_post_id: int
    user_id: int
    status: ApplyStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class ApplicantList(BaseModel):
    id: int
    name: str
    email: str
    application_id: int
    status: ApplyStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationStatusHistoryBase(BaseModel):
    status: ApplyStatus
    comment: Optional[str] = None


class ApplicationStatusHistoryCreate(ApplicationStatusHistoryBase):
    application_id: int


class ApplicationStatusHistoryDetail(ApplicationStatusHistoryBase):
    id: int
    application_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ApplicationViewLogBase(BaseModel):
    application_id: int
    action: ApplicationViewAction


class ApplicationViewLogCreate(ApplicationViewLogBase):
    pass


class ApplicationViewLogDetail(ApplicationViewLogBase):
    id: int
    viewer_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True 