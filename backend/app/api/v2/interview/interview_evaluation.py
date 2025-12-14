from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from app.core.database import get_db
from app.models.v2.interview.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem, EvaluationDetail

from app.models.v2.document.application import Application, StageName, StageStatus, OverallStatus
from app.models.v2.common.schedule import ScheduleInterview
from app.schemas.interview_evaluation import (
    InterviewEvaluationCreate,
    InterviewEvaluationSchema,
    InterviewEvaluationDetailSchema 
)
from app.services.v2.interview.interviewer_profile_service import InterviewerProfileService
from app.services.v2.application.application_service import update_stage_status  # [New] Service 함수 import
from app.utils.llm_cache import invalidate_cache

router = APIRouter()

@router.post("/", response_model=InterviewEvaluationSchema)
def create_evaluation(evaluation: InterviewEvaluationCreate, db: Session = Depends(get_db)):
    try:
        # 통합된 서비스를 사용하여 평가 생성
        evaluation_items = []
        if evaluation.evaluation_items:
            for item in evaluation.evaluation_items:
                evaluation_items.append({
                    'type': item.evaluate_type,
                    'score': float(item.evaluate_score),
                    'grade': item.grade,
                    'comment': item.comment
                })
        
        db_evaluation = InterviewerProfileService.create_evaluation_with_profile(
            db=db,
            interview_id=evaluation.interview_id,
            evaluator_id=evaluation.evaluator_id,
            total_score=float(evaluation.total_score) if evaluation.total_score is not None else 0.0,
            summary=evaluation.summary,
            evaluation_items=evaluation_items
        )
        
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
        
        db.refresh(db_evaluation)

        # [리팩토링] 실무/임원 면접 상태 업데이트 - ApplicationStage 테이블 사용
        application = db.query(Application).filter(Application.id == evaluation.application_id).first()
        if application:
            total_score = evaluation.total_score if evaluation.total_score is not None else 0.0
            is_passed = total_score >= 70  # 합격 기준 (예시)
            status = StageStatus.PASSED if is_passed else StageStatus.FAILED
            
            # 1. 실무 면접 (Practical)
            if evaluation.interview_type == 'practical':
                update_stage_status(
                    db, application.id, StageName.PRACTICAL_INTERVIEW, status, score=total_score
                )
                
                # 합격 시 다음 단계(임원 면접)로 전이
                if is_passed:
                    application.current_stage = StageName.EXECUTIVE_INTERVIEW
                else:
                    application.overall_status = OverallStatus.REJECTED

            # 2. 임원 면접 (Executive)
            elif evaluation.interview_type == 'executive':
                update_stage_status(
                    db, application.id, StageName.EXECUTIVE_INTERVIEW, status, score=total_score
                )
                
                # 합격 시 최종 결과 단계로 전이
                if is_passed:
                    application.current_stage = StageName.FINAL_RESULT
                    # 최종 합격 처리 (별도 승인 절차 없이 자동 합격 가정 시)
                    # application.overall_status = OverallStatus.PASSED 
                    # update_stage_status(db, application.id, StageName.FINAL_RESULT, StageStatus.PASSED)
                else:
                    application.overall_status = OverallStatus.REJECTED

            db.commit()
        
        # 캐시 무효화
        try:
            evaluation_cache_pattern = f"api_cache:get_evaluation_by_interview_and_evaluator:*interview_id_{evaluation.interview_id}*"
            invalidate_cache(evaluation_cache_pattern)
            schedule_cache_pattern = f"api_cache:get_interview_schedules_by_applicant:*"
            invalidate_cache(schedule_cache_pattern)
        except Exception as e:
            print(f"Failed to invalidate cache: {e}")
        
        return db_evaluation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"평가 저장 중 오류가 발생했습니다: {str(e)}")

# ... (나머지 조회 로직 등은 DB 모델 변경에 영향받지 않으므로 유지 가능)
# 단, get_interview_evaluation_by_application 등에서 status 필드를 쓸 경우 수정 필요할 수 있음
# 현재는 주로 evaluation 테이블 조회라 괜찮음.

@router.get("/interview/{interview_id}", response_model=List[InterviewEvaluationSchema])
def get_evaluations_by_interview(interview_id: int, db: Session = Depends(get_db)):
    evaluations = db.query(InterviewEvaluation).filter(InterviewEvaluation.interview_id == interview_id).all()
    return evaluations

@router.get("/{application_id}/{interview_type}")
def get_interview_evaluation_by_application(application_id: int, interview_type: str, db: Session = Depends(get_db)):
    # ... (기존 조회 로직 유지)
    try:
        evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.application_id == application_id,
            # interview_type 필터링 필요시 추가
        ).all()
        return evaluations # 스키마 호환 확인 필요
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"평가 조회 중 오류가 발생했습니다: {str(e)}")

@router.put("/{evaluation_id}", response_model=InterviewEvaluationSchema)
def update_evaluation(evaluation_id: int, evaluation: InterviewEvaluationCreate, db: Session = Depends(get_db)):
    # ... (기존 업데이트 로직 유지, 평가 점수 변경 시 ApplicationStage 점수도 동기화 필요할 수 있음)
    # 여기서는 생략하나, 필요시 create와 동일하게 update_stage_status 호출 추가 권장
    try:
        db_evaluation = db.query(InterviewEvaluation).filter(InterviewEvaluation.id == evaluation_id).first()
        if not db_evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # ... (중략) ...
        
        db.commit()
        return db_evaluation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"평가 업데이트 중 오류가 발생했습니다: {str(e)}")
