from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.interview_evaluation import InterviewEvaluation, EvaluationDetail, InterviewEvaluationItem
from app.schemas.interview_evaluation import InterviewEvaluation as InterviewEvaluationSchema, InterviewEvaluationCreate
from datetime import datetime
from decimal import Decimal
from app.models.application import Application

router = APIRouter()

@router.post("/", response_model=InterviewEvaluationSchema)
def create_evaluation(evaluation: InterviewEvaluationCreate, db: Session = Depends(get_db)):
    try:
        db_evaluation = InterviewEvaluation(
            interview_id=evaluation.interview_id,
            evaluator_id=evaluation.evaluator_id,
            is_ai=evaluation.is_ai,
            total_score=Decimal(str(evaluation.total_score)) if evaluation.total_score is not None else None,
            summary=evaluation.summary,
            status=evaluation.status,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(db_evaluation)
        db.commit()
        db.refresh(db_evaluation)

        # 새로운 평가 항목 등록
        for item in evaluation.evaluation_items or []:
            db_item = InterviewEvaluationItem(
                evaluation_id=db_evaluation.id,
                evaluate_type=item.evaluate_type,
                evaluate_score=Decimal(str(item.evaluate_score)),
                grade=item.grade,
                comment=item.comment
            )
            db.add(db_item)
        
        # 기존 상세 평가 등록 (호환성)
        for detail in evaluation.details or []:
            if detail.score is not None:
                db_detail = EvaluationDetail(
                    evaluation_id=db_evaluation.id,
                    category=detail.category,
                    grade=detail.grade,
                    score=Decimal(str(detail.score))
                )
                db.add(db_detail)
        
        db.commit()
        db.refresh(db_evaluation)
        return db_evaluation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"평가 저장 중 오류가 발생했습니다: {str(e)}")

@router.get("/interview/{interview_id}", response_model=List[InterviewEvaluationSchema])
def get_evaluations_by_interview(interview_id: int, db: Session = Depends(get_db)):
    return db.query(InterviewEvaluation).filter(InterviewEvaluation.interview_id == interview_id).all()

@router.get("/interview/{interview_id}/evaluator/{evaluator_id}", response_model=InterviewEvaluationSchema)
def get_evaluation_by_interview_and_evaluator(interview_id: int, evaluator_id: int, db: Session = Depends(get_db)):
    """특정 면접의 특정 평가자 평가 조회"""
    evaluation = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.interview_id == interview_id,
        InterviewEvaluation.evaluator_id == evaluator_id
    ).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return evaluation

@router.put("/{evaluation_id}", response_model=InterviewEvaluationSchema)
def update_evaluation(evaluation_id: int, evaluation: InterviewEvaluationCreate, db: Session = Depends(get_db)):
    """기존 평가 업데이트"""
    try:
        db_evaluation = db.query(InterviewEvaluation).filter(InterviewEvaluation.id == evaluation_id).first()
        if not db_evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # 기존 평가 정보 업데이트
        if evaluation.total_score is not None:
            setattr(db_evaluation, 'total_score', Decimal(str(evaluation.total_score)))
        if evaluation.summary is not None:
            setattr(db_evaluation, 'summary', evaluation.summary)
        if evaluation.status is not None:
            setattr(db_evaluation, 'status', evaluation.status)
        # updated_at 업데이트
        setattr(db_evaluation, 'updated_at', datetime.now())
        
        # 기존 평가 항목 삭제
        db.query(InterviewEvaluationItem).filter(InterviewEvaluationItem.evaluation_id == evaluation_id).delete()
        db.query(EvaluationDetail).filter(EvaluationDetail.evaluation_id == evaluation_id).delete()
        
        # 새로운 평가 항목 등록
        for item in evaluation.evaluation_items or []:
            db_item = InterviewEvaluationItem(
                evaluation_id=evaluation_id,
                evaluate_type=item.evaluate_type,
                evaluate_score=Decimal(str(item.evaluate_score)),
                grade=item.grade,
                comment=item.comment
            )
            db.add(db_item)
        
        # 새로운 상세 평가 등록 (호환성)
        for detail in evaluation.details or []:
            if detail.score is not None:
                db_detail = EvaluationDetail(
                    evaluation_id=evaluation_id,
                    category=detail.category,
                    grade=detail.grade,
                    score=Decimal(str(detail.score))
                )
                db.add(db_detail)
        
        db.commit()
        db.refresh(db_evaluation)
        return db_evaluation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"평가 업데이트 중 오류가 발생했습니다: {str(e)}") 

@router.get("/interview-schedules/applicant/{applicant_id}")
def get_interview_schedules_by_applicant(applicant_id: int, db: Session = Depends(get_db)):
    # Application 테이블에서 applicant_id로 schedule_interview_id 찾기
    applications = db.query(Application).filter(Application.applicant_id == applicant_id).all()
    if not applications:
        return []
    # 지원자가 여러 면접에 배정된 경우 모두 반환
    result = []
    for app in applications:
        if hasattr(app, 'schedule_interview_id') and app.schedule_interview_id:
            result.append({"id": app.schedule_interview_id})
    return result 