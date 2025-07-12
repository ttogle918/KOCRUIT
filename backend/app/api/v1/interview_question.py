from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import api_key
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.interview_question import InterviewQuestion, InterviewQuestionCreate
from pydantic import BaseModel

from app.api.v1.company_question_rag import generate_questions

router = APIRouter()

class CompanyQuestionRequest(BaseModel):
    company_name: str

class CompanyQuestionResponse(BaseModel):
    questions: list[str]

@router.post("/", response_model=InterviewQuestion)
def create_question(question: InterviewQuestionCreate, db: Session = Depends(get_db)):
    db_question = InterviewQuestion(**question.dict())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.get("/application/{application_id}", response_model=List[InterviewQuestion])
def get_questions_by_application(application_id: int, db: Session = Depends(get_db)):
    return db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id).all()

@router.post("/company-questions", response_model=CompanyQuestionResponse)
async def generate_company_questions(request: CompanyQuestionRequest):
    """회사명 기반 면접 질문 생성 (인재상 + 뉴스 기반)"""
    # POST /api/v1/interview-questions/company-questions
    # Content-Type: application/json
    # {    "company_name": "삼성전자"     }
    
    try:
        # LangGraph 기반 통합 질문 생성
        result = generate_questions(request.company_name)
        questions = result.get("text", [])
        
        if isinstance(questions, str):
            questions = questions.strip().split("\n")
        
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
