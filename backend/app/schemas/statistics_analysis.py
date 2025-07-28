from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class StatisticsAnalysisBase(BaseModel):
    job_post_id: int
    chart_type: str
    chart_data: List[Dict[str, Any]]
    analysis: str
    insights: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    is_llm_used: bool = False

class StatisticsAnalysisCreate(StatisticsAnalysisBase):
    pass

class StatisticsAnalysisUpdate(BaseModel):
    analysis: Optional[str] = None
    insights: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    is_llm_used: Optional[bool] = None

class StatisticsAnalysisResponse(StatisticsAnalysisBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True

class StatisticsAnalysisListResponse(BaseModel):
    analyses: List[StatisticsAnalysisResponse]
    total_count: int
    
    class Config:
        from_attributes = True 