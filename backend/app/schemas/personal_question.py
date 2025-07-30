from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class PersonalQuestionRequest(BaseModel):
    application_id: int
    company_name: str = ""
    resume_data: Optional[Dict[str, Any]] = None

class PersonalQuestionResponse(BaseModel):
    application_id: int
    jobpost_id: Optional[int] = None
    company_id: Optional[int] = None
    questions: List[str]
    question_bundle: Dict[str, Any]
    job_matching_info: Optional[str] = None
    analysis_version: Optional[str] = None
    analysis_duration: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message: str = "개인 질문 생성 완료" 