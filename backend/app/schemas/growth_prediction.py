from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class GrowthPredictionRequest(BaseModel):
    application_id: int

class GrowthPredictionDetail(BaseModel):
    score: float
    value: Optional[Any]
    mean: Optional[Any]

class GrowthPredictionResponse(BaseModel):
    total_score: float
    detail: Dict[str, GrowthPredictionDetail]
    message: Optional[str] = None
    comparison_chart_data: Optional[dict] = None
    reasons: Optional[List[str]] = None
    boxplot_data: Optional[dict] = None  # 각 항목별 box plot 통계(min, q1, median, q3, max, applicant) 