from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from typing import List, Dict, Any
from pydantic import BaseModel
from agent.tools.written_test_generation_tool import generate_written_test_questions
from app.models.job import JobPost  # 실제 공고 모델 import
import traceback

router = APIRouter()

class WrittenTestGenerateRequest(BaseModel):
    job_post_id: int

@router.post("/generate")
def generate_written_test(
    request: WrittenTestGenerateRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """공고별 필기시험 문제 생성 (LLM 연동)"""
    job_post_id = request.job_post_id
    if not job_post_id:
        raise HTTPException(status_code=400, detail="job_post_id는 필수입니다.")
    # DB에서 공고 정보 조회
    job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
    if not job_post:
        raise HTTPException(status_code=404, detail="해당 공고를 찾을 수 없습니다.")
    # 공고 정보를 dict로 변환 (필요 필드만)
    jobpost_dict = {
        "title": job_post.title or "",
        "conditions": getattr(job_post, "conditions", "") or "",
        "job_details": getattr(job_post, "job_details", "") or "",
        "qualifications": getattr(job_post, "qualifications", "") or ""
    }
    # 필수 필드 누락 체크
    for key in ["title", "conditions", "job_details", "qualifications"]:
        if not jobpost_dict[key]:
            print(f"[경고] 공고의 '{key}' 정보가 누락되었습니다.")
    # LLM 기반 문제 생성
    try:
        print("LLM 입력값:", jobpost_dict)  # 진단용 로그
        questions = generate_written_test_questions({"jobpost": jobpost_dict})
    except Exception as e:
        print(traceback.format_exc())  # 전체 스택트레이스 출력
        raise HTTPException(status_code=500, detail=f"문제 생성 실패: {str(e)}")
    return {"job_post_id": job_post_id, "questions": questions, "count": len(questions)} 