from pydantic import BaseModel
from typing import List, Dict, Optional
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

class EvaluationCriteriaBase(BaseModel):
    job_post_id: int
    company_name: str
    suggested_criteria: List[CriterionItem]
    weight_recommendations: List[WeightRecommendation]
    evaluation_questions: List[str]
    scoring_guidelines: Dict[str, Dict[str, str]]

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
    suggested_criteria: List[CriterionItem]
    weight_recommendations: List[WeightRecommendation]
    evaluation_questions: List[str]
    scoring_guidelines: Dict[str, Dict[str, str]]
    message: str = "평가항목이 성공적으로 생성되었습니다." 