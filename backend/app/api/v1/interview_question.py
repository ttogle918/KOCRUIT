from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import api_key
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.interview_question import InterviewQuestion, InterviewQuestionCreate
from agent.agents.interview_question_node import generate_common_question_bundle, generate_company_questions
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

# 면접질문 관련 API 관리 중인 파일
@router.post("/common-questions", response_model=CompanyQuestionResponse)
async def generate_common_questions(request: CompanyQuestionRequest):
    # POST /api/v1/common-questions
    # Content-Type: application/json
    # {    "company_name": "삼성전자"     }
    
    try:
        # 예시: company_context가 필요한 경우
        result = generate_questions.invoke({
            "company_name": request.company_name,
            "company_context": "회사에 대한 정보가 없습니다."  # 또는 실제 뉴스/요약 결과
        })
        # LangChain 응답이 딕셔너리 형태일 경우 처리
        questions = result.get("text") or result  # LLMChain 결과값이 string일 수도 있음
        if isinstance(questions, str):
            questions = questions.strip().split("\n")
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
