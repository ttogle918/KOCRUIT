from pydantic import BaseModel
from typing import Any, List, Optional

class DocumentReportResponse(BaseModel):
    job_post_id: int
    stats: Optional[Any] = None
    passed_applicants: Optional[List[Any]] = None
    rejected_applicants: Optional[List[Any]] = None

class WrittenTestReportResponse(BaseModel):
    job_post_id: int
    stats: Optional[Any] = None
    passed_applicants: Optional[List[Any]] = None
    rejected_applicants: Optional[List[Any]] = None 