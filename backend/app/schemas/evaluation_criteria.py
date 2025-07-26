from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

class CriterionItem(BaseModel):
    criterion: str
    description: str
    max_score: int

class WeightRecommendation(BaseModel):
    criterion: str
    weight: float
    reason: str

class ScoringGuideline(BaseModel):
    criterion: str
    guidelines: Dict[str, str]  # {"5점": "설명", "3점": "설명", "1점": "설명"}

# 면접관이 실제로 점수를 매길 수 있는 평가 항목
class EvaluationItem(BaseModel):
    item_name: str
    description: str
    max_score: int
    scoring_criteria: Dict[str, str]  # {"9-10점": "구체적 기준", "7-8점": "구체적 기준", ...}
    evaluation_questions: List[str]  # 해당 항목 평가를 위한 구체적 질문들
    weight: float  # 전체 평가에서의 가중치

class EvaluationCriteriaBase(BaseModel):
    job_post_id: Optional[int] = None
    resume_id: Optional[int] = None
    application_id: Optional[int] = None
    evaluation_type: str = "job_based"  # "job_based" 또는 "resume_based"
    interview_stage: Optional[str] = None  # "practical" 또는 "executive"
    company_name: str
    suggested_criteria: List[Dict[str, Any]]  # 딕셔너리 리스트로 변경 (기존 호환성)
    weight_recommendations: List[Dict[str, Any]]  # 딕셔너리 리스트로 변경 (기존 호환성)
    evaluation_questions: List[str]
    scoring_guidelines: Dict[str, str]  # LangGraph 결과에 맞게 수정
    
    # 면접관이 실제로 점수를 매길 수 있는 평가 항목들
    evaluation_items: Optional[List[EvaluationItem]] = None

class EvaluationCriteriaCreate(EvaluationCriteriaBase):
    pass

class EvaluationCriteriaResponse(EvaluationCriteriaBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class JobBasedCriteriaRequest(BaseModel):
    job_post_id: int
    company_name: str

class JobBasedCriteriaResponse(BaseModel):
    suggested_criteria: List[Dict[str, Any]]  # 딕셔너리 리스트로 변경
    weight_recommendations: List[Dict[str, Any]]  # 딕셔너리 리스트로 변경
    evaluation_questions: List[str]
    scoring_guidelines: Dict[str, str]  # LangGraph 결과에 맞게 수정
    evaluation_items: Optional[List[EvaluationItem]] = None  # 실제 점수 매기기 가능한 항목들
    message: str = "평가항목이 성공적으로 생성되었습니다." 