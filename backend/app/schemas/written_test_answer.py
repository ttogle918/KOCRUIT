from pydantic import BaseModel
from typing import Optional

class WrittenTestAnswerCreate(BaseModel):
    user_id: int
    jobpost_id: int
    question_id: int
    answer_text: str

class WrittenTestAnswerResponse(BaseModel):
    id: int
    user_id: int
    jobpost_id: int
    question_id: int
    answer_text: str
    score: Optional[float] = None
    feedback: Optional[str] = None

    class Config:
        orm_mode = True 