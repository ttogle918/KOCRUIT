from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.interview_evaluation import InterviewEvaluation, EvaluationDetail
from app.schemas.interview_evaluation import InterviewEvaluation as InterviewEvaluationSchema, InterviewEvaluationCreate
from datetime import datetime
from decimal import Decimal

router = APIRouter()

@router.post("/", response_model=InterviewEvaluationSchema)
def create_evaluation(evaluation: InterviewEvaluationCreate, db: Session = Depends(get_db)):
    try:
        db_evaluation = InterviewEvaluation(
            interview_id=evaluation.interview_id,
            evaluator_id=evaluation.evaluator_id,
            is_ai=evaluation.is_ai,
            score=Decimal(str(evaluation.score)) if evaluation.score is not None else None,
            summary=evaluation.summary,
            created_at=datetime.now()
        )
        db.add(db_evaluation)
        db.commit()
        db.refresh(db_evaluation)

        # 상세 평가 등록
        for detail in evaluation.details or []:
            if detail.score is not None:
                db_detail = EvaluationDetail(
                    evaluation_id=db_evaluation.id,
                    category=detail.category,
                    grade=detail.grade,
                    score=Decimal(str(detail.score))
                )
                db.add(db_detail)
        db.commit()  # for문 밖에서 한 번만 commit
        db.refresh(db_evaluation)
        return db_evaluation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"평가 저장 중 오류가 발생했습니다: {str(e)}")

@router.get("/interview/{interview_id}", response_model=List[InterviewEvaluationSchema])
def get_evaluations_by_interview(interview_id: int, db: Session = Depends(get_db)):
    return db.query(InterviewEvaluation).filter(InterviewEvaluation.interview_id == interview_id).all() 