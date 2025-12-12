from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class EvaluationDetailBase(BaseModel):
    category: Optional[str]
    grade: Optional[str]
    score: Optional[float]

class EvaluationDetailCreate(EvaluationDetailBase):
    pass

class EvaluationDetail(EvaluationDetailBase):
    id: int
    evaluation_id: int
    class Config:
        orm_mode = True

class InterviewEvaluationItemBase(BaseModel):
    evaluate_type: str
    evaluate_score: float
    grade: Optional[str] = None
    comment: Optional[str] = None

class InterviewEvaluationItemCreate(InterviewEvaluationItemBase):
    pass

class InterviewEvaluationItem(InterviewEvaluationItemBase):
    id: int
    evaluation_id: int
    created_at: Optional[datetime]
    class Config:
        orm_mode = True

class EvaluationStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"

class InterviewEvaluationBase(BaseModel):
    interview_id: int
    evaluator_id: Optional[int]
    is_ai: Optional[bool] = False
    total_score: Optional[float]  # score -> total_score로 변경
    summary: Optional[str]
    status: Optional[EvaluationStatus] = EvaluationStatus.PENDING
    application_id: Optional[int] = None # application_id 추가 (Create 시 필요할 수 있음)
    interview_type: Optional[str] = None # interview_type 추가 (Create 시 필요할 수 있음)

class InterviewEvaluationCreate(InterviewEvaluationBase):
    details: Optional[List[EvaluationDetailCreate]] = []  # 기존 호환성
    evaluation_items: Optional[List[InterviewEvaluationItemCreate]] = []  # 새로운 구조

class InterviewEvaluation(InterviewEvaluationBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    details: List[EvaluationDetail] = []  # 기존 호환성
    evaluation_items: List[InterviewEvaluationItem] = []  # 새로운 구조
    class Config:
        orm_mode = True

# --- Alias for Compatibility ---
InterviewEvaluationSchema = InterviewEvaluation
InterviewEvaluationDetailSchema = EvaluationDetail
