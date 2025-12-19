from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.v2.document.application import Application, OverallStatus, StageStatus, StageName, ApplicationViewAction

# Alias for backward compatibility
ApplyStatus = OverallStatus
DocumentStatus = StageStatus
InterviewStatus = StageStatus

def to_camel(string: str) -> str:
    parts = string.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])

class ApplicationBase(BaseModel):
    job_post_id: int
    resume_id: int
    status: ApplyStatus = ApplyStatus.PASSED
    current_stage: StageName = StageName.DOCUMENT
    overall_status: OverallStatus = OverallStatus.IN_PROGRESS
    document_status: DocumentStatus = DocumentStatus.PENDING
    ai_interview_status: InterviewStatus = InterviewStatus.PENDING
    practical_interview_status: InterviewStatus = InterviewStatus.PENDING
    executive_interview_status: InterviewStatus = InterviewStatus.PENDING
    score: Optional[float] = None
    ai_score: Optional[float] = None
    human_score: Optional[float] = None
    final_score: Optional[float] = None
    application_source: Optional[str] = None
    pass_reason: Optional[str] = None
    fail_reason: Optional[str] = None
    applied_at: Optional[datetime] = None
    ai_interview_score: Optional[float] = None
    practical_interview_score: Optional[float] = None
    executive_interview_score: Optional[float] = None
    ai_interview_pass_reason: Optional[str] = None
    ai_interview_fail_reason: Optional[str] = None
    ai_interview_video_url: Optional[str] = None  # AI 면접 비디오 URL
    
    # 공통 정보 (Property 기반)
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    job_posting_title: Optional[str] = None
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[ApplyStatus] = None
    document_status: Optional[DocumentStatus] = None
    ai_interview_status: Optional[InterviewStatus] = None
    practical_interview_status: Optional[InterviewStatus] = None
    executive_interview_status: Optional[InterviewStatus] = None
    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ApplicationStageDetail(BaseModel):
    id: int
    application_id: int
    stage_name: StageName
    stage_order: int
    status: OverallStatus
    score: Optional[float] = None
    pass_reason: Optional[str] = None
    fail_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

class ApplicationDetail(ApplicationBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    stages: List[ApplicationStageDetail] = []
    job_posting_title: Optional[str] = None
    # 이력서 정보 필드 추가
    applicantName: Optional[str] = None
    gender: Optional[str] = None
    birthDate: Optional[datetime] = None
    email: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    educations: Optional[List] = None
    awards: Optional[List] = None
    certificates: Optional[List] = None
    skills: Optional[List[str]] = None
    experiences: Optional[List] = None  # activities + project_experience 통합
    content: Optional[str] = None
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

# 지원자 요약 정보 목록
class ApplicationList(BaseModel):
    id: int
    job_post_id: int
    user_id: int
    status: ApplyStatus
    document_status: DocumentStatus
    ai_interview_status: InterviewStatus
    practical_interview_status: InterviewStatus
    executive_interview_status: InterviewStatus
    created_at: datetime
    score: Optional[float] = None
    ai_score: Optional[float] = None
    human_score: Optional[float] = None
    final_score: Optional[float] = None
    application_source: Optional[str] = None
    pass_reason: Optional[str] = None
    fail_reason: Optional[str] = None
    applied_at: Optional[datetime] = None
    ai_interview_pass_reason: Optional[str] = None
    ai_interview_fail_reason: Optional[str] = None
    ai_interview_video_url: Optional[str] = None
    current_stage: StageName
    overall_status: OverallStatus
    ai_interview_score: Optional[float] = None
    practical_interview_score: Optional[float] = None
    executive_interview_score: Optional[float] = None
    
    # Frontend 호환 필드 (User 정보 등)
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    degree: Optional[str] = None
    education: Optional[str] = None
    job_posting_title: Optional[str] = None
    
    # [NEW] 프론트엔드 로직 호환용 합성 상태 (예: AI_INTERVIEW_PASSED)
    interview_status: Optional[str] = None
    stage_status: Optional[str] = None  # Frontend 호환용
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True


class ApplicantList(BaseModel):
    id: int
    name: str
    email: str
    application_id: int
    status: ApplyStatus
    applied_at: datetime
    score: Optional[float] = None
    birthDate: Optional[str] = None
    gender: Optional[str] = None
    education: Optional[str] = None
    degree: Optional[str] = None  # 추가: degree 정보
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True


class ApplicationStatusHistoryBase(BaseModel):
    status: ApplyStatus
    comment: Optional[str] = None
    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ApplicationStatusHistoryCreate(ApplicationStatusHistoryBase):
    application_id: int
    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ApplicationStatusHistoryDetail(ApplicationStatusHistoryBase):
    id: int
    application_id: int
    created_at: datetime
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True


class ApplicationViewLogBase(BaseModel):
    application_id: int
    action: ApplicationViewAction
    class Config:
        alias_generator = to_camel
        populate_by_name = True


class ApplicationViewLogCreate(ApplicationViewLogBase):
    pass


class ApplicationViewLogDetail(ApplicationViewLogBase):
    id: int
    viewer_id: int
    created_at: datetime
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True 

class ApplicationBulkStatusUpdate(BaseModel):
    application_ids: List[int]
    status: Optional[ApplyStatus] = None
    document_status: Optional[DocumentStatus] = None
    ai_interview_status: Optional[InterviewStatus] = None
    practical_interview_status: Optional[InterviewStatus] = None
    executive_interview_status: Optional[InterviewStatus] = None 