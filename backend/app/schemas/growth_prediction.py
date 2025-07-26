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
    detail_explanation: Optional[Dict[str, str]] = None  # 항목별 상세 설명
    item_table: Optional[List[Dict[str, Any]]] = None  # 표 데이터
    narrative: Optional[str] = None  # 자동 요약 설명 