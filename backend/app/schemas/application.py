from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime
from app.models.application import OverallStatus, StageName, StageStatus

# --- CamelCase Converter ---
def to_camel(string: str) -> str:
    parts = string.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])

# --- New: Stage Schema ---
class ApplicationStageResponse(BaseModel):
    id: int
    stage_name: StageName
    stage_order: int
    status: StageStatus
    score: Optional[float] = None
    pass_reason: Optional[str] = None
    fail_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

# --- Base Schema ---
class ApplicationBase(BaseModel):
    job_post_id: int
    resume_id: int
    application_source: Optional[str] = None
    applied_at: Optional[datetime] = None
    
    # 1안 리팩토링 대응: DB 컬럼과 매핑
    current_stage: StageName = StageName.DOCUMENT
    overall_status: OverallStatus = OverallStatus.IN_PROGRESS
    final_score: Optional[float] = None
    ai_interview_video_url: Optional[str] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

class ApplicationCreate(ApplicationBase):
    user_id: int # 생성 시에는 user_id 필요

class ApplicationUpdate(BaseModel):
    # 업데이트 가능한 필드들
    current_stage: Optional[StageName] = None
    overall_status: Optional[OverallStatus] = None
    final_score: Optional[float] = None
    ai_interview_video_url: Optional[str] = None
    
    class Config:
        alias_generator = to_camel
        populate_by_name = True

# --- Bulk Update Schema ---
class ApplicationBulkStatusUpdate(BaseModel):
    application_ids: List[int]
    status: Optional[OverallStatus] = None # 전체 상태 업데이트
    stage_status: Optional[StageStatus] = None # 특정 스테이지 상태 업데이트
    stage_name: Optional[StageName] = None # 업데이트할 스테이지 (생략 시 current_stage)

# --- Response Schema (Frontend Compatibility Layer) ---
class ApplicationDetail(ApplicationBase):
    id: int
    user_id: int
    
    # Nested Stages Info
    stages: List[ApplicationStageResponse] = []
    
    # --- [Compatibility Fields] ---
    # 프론트엔드 하위 호환성을 위한 계산된 필드들 (Computed Fields)
    # 실제 DB에는 없지만 응답 JSON에는 포함되어 프론트엔드가 깨지지 않게 함
    
    status: OverallStatus = Field(alias='status') # overall_status 매핑
    
    document_status: StageStatus = StageStatus.PENDING
    ai_interview_status: StageStatus = StageStatus.PENDING
    practical_interview_status: StageStatus = StageStatus.PENDING
    executive_interview_status: StageStatus = StageStatus.PENDING
    
    ai_interview_score: Optional[float] = None
    ai_interview_pass_reason: Optional[str] = None
    ai_interview_fail_reason: Optional[str] = None
    
    @field_validator('status', mode='before')
    def map_status(cls, v, info):
        # DB 모델의 overall_status 값을 Pydantic의 status 필드로 매핑
        return v or info.data.get('overall_status')

    # Pydantic v2 style validator or root_validator (v1)
    # 여기서는 간단하게 from_attributes(orm_mode) 시 동작하는 property 활용이 어려우므로
    # 별도 메서드나 validator로 처리해야 함. 
    # 하지만 가장 확실한 건 DB 모델 자체에 @property를 두거나, 
    # 서비스 계층에서 변환하는 것임.
    # 여기서는 스키마 레벨에서 처리하기 위해 DB 모델을 dict로 변환 후 주입하는 방식을 가정하거나
    # 모델에 @property가 있다고 가정함.

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        from_attributes = True

class ApplicationList(ApplicationDetail):
    # 리스트 조회용 (Detail과 동일 구조 사용)
    pass

class ApplicantList(BaseModel):
    # 간소화된 지원자 목록 (이름, 이메일 등 포함)
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    
    current_stage: StageName
    overall_status: OverallStatus
    
    # Compatibility
    interview_status: str = "UNKNOWN" 
    
    class Config:
        from_attributes = True
