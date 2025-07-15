from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import JobPost
from app.models.written_test_question import WrittenTestQuestion
from sqlalchemy.exc import SQLAlchemyError

# agent tool import
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
from agent.tools.written_test_generation_tool import generate_written_test_questions

router = APIRouter()

class WrittenTestGenerateRequest(BaseModel):
    jobPostId: int

class WrittenTestGenerateResponse(BaseModel):
    testType: str  # 'coding' or 'aptitude'
    questions: List[str]

class WrittenTestSubmitRequest(BaseModel):
    jobPostId: int
    questions: List[str]

@router.post('/written-test/generate', response_model=WrittenTestGenerateResponse)
def generate_written_test(req: WrittenTestGenerateRequest, db: Session = Depends(get_db)):
    job_post = db.query(JobPost).filter(JobPost.id == req.jobPostId).first()
    if not job_post:
        raise HTTPException(status_code=404, detail="JobPost not found")
    jobpost_dict = {
        "id": job_post.id,
        "title": job_post.title or "",
        "department": job_post.department or "",
        "qualifications": job_post.qualifications or "",
        "conditions": job_post.conditions or "",
        "job_details": job_post.job_details or ""
    }
    questions = generate_written_test_questions({"jobpost": jobpost_dict})
    # testType 판별(코딩/직무적합성)
    dev_keywords = ['개발', '엔지니어', '프로그래밍', 'SW', 'IT']
    is_dev = any(k in (job_post.title or "") or k in (job_post.department or "") for k in dev_keywords)
    test_type = 'coding' if is_dev else 'aptitude'
    return WrittenTestGenerateResponse(testType=test_type, questions=questions)

@router.post('/written-test/submit')
def submit_written_test(req: WrittenTestSubmitRequest, db: Session = Depends(get_db)):
    try:
        # testType 추론 (코딩/직무적합성)
        dev_keywords = ['개발', '엔지니어', '프로그래밍', 'SW', 'IT']
        job_post = db.query(JobPost).filter(JobPost.id == req.jobPostId).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="JobPost not found")
        is_dev = any(k in (job_post.title or "") or k in (job_post.department or "") for k in dev_keywords)
        test_type = 'coding' if is_dev else 'aptitude'
        # 문제 저장
        for idx, q in enumerate(req.questions):
            question = WrittenTestQuestion(
                jobpost_id=req.jobPostId,
                question_type=test_type,
                question_text=q
            )
            db.add(question)
        db.commit()
        return {"success": True, "message": "문제 제출 및 저장이 완료되었습니다."}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB 저장 오류: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"문제 제출 오류: {str(e)}")