from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.v2.interview.interview_question import QuestionType

class InterviewQuestionBase(BaseModel):
    application_id: int
    type: QuestionType
    question_text: str
    category: Optional[str] = None
    difficulty: Optional[str] = None

class InterviewQuestionCreate(InterviewQuestionBase):
    pass

class InterviewQuestion(InterviewQuestionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class InterviewQuestionBulkCreate(BaseModel):
    """대량 질문 생성용 스키마"""
    application_id: int
    questions: list[dict]  # [{"type": "common", "question_text": "...", "category": "..."}]

class InterviewQuestionResponse(BaseModel):
    """질문 조회 응답용 스키마"""
    common_questions: list[str] = []
    personal_questions: list[str] = []
    company_questions: list[str] = []
    job_questions: list[str] = []
    executive_questions: list[str] = []
    second_questions: list[str] = []
    final_questions: list[str] = [] 