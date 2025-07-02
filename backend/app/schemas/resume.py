from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ResumeBase(BaseModel):
    title: str
    content: Optional[str] = None
    file_path: Optional[str] = None


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(ResumeBase):
    pass


class ResumeDetail(ResumeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ResumeList(BaseModel):
    id: int
    title: str
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ResumeMemoBase(BaseModel):
    content: str


class ResumeMemoCreate(ResumeMemoBase):
    resume_id: int


class ResumeMemoUpdate(ResumeMemoBase):
    pass


class ResumeMemoDetail(ResumeMemoBase):
    id: int
    resume_id: int
    writer_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True 