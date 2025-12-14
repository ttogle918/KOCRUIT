from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, aliased
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.v2.document.application import Application, ApplicationStage, StageName, StageStatus, OverallStatus
from app.models.v2.interview.interview_evaluation import InterviewEvaluation, EvaluationType
from app.models.v2.auth.user import User
from app.models.v2.recruitment.job import JobPost
from app.models.v2.document.resume import Resume
from app.schemas.interview_evaluation import InterviewEvaluationCreate
from app.schemas.application import ApplicationDetail
from app.services.v2.document.application_service import update_stage_status

router = APIRouter()

@router.get("/executive-interview/candidates", response_model=List[ApplicationDetail])
def get_executive_interview_candidates(db: Session = Depends(get_db)):
    """임원면접 대상자 조회"""
    try:
        # 1차 면접(실무진 면접) 합격자들 조회 (ApplicationStage Join)
        PracticalStage = aliased(ApplicationStage)
        
        candidates = db.query(Application).join(
            PracticalStage, Application.id == PracticalStage.application_id
        ).filter(
            PracticalStage.stage_name == StageName.PRACTICAL_INTERVIEW,
            PracticalStage.status == StageStatus.PASSED,
            Application.overall_status == OverallStatus.IN_PROGRESS
        ).all()
        
        return candidates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"임원면접 대상자 조회 실패: {str(e)}"
        )

@router.get("/executive-interview/candidate/{application_id}/details")
def get_candidate_details(application_id: int, db: Session = Depends(get_db)):
    """지원자 상세 정보 조회 (이력서 + 실무진 평가)"""
    try:
        # 지원자 정보
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # 사용자 정보
        user = db.query(User).filter(User.id == application.user_id).first()
        
        # 이력서 정보
        resume = db.query(Resume).filter(Resume.user_id == application.user_id).first()
        
        # 실무진 평가 결과
        practical_evaluation = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_id == application_id, # 주의: interview_id가 application_id인지 확인 필요 (기존 로직 따름)
            InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
        ).first()
        
        # 채용공고 정보
        job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
        
        return {
            "application": application,
            "user": user,
            "resume": resume,
            "practical_evaluation": practical_evaluation,
            "job_post": job_post
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"지원자 상세 정보 조회 실패: {str(e)}"
        )

@router.post("/executive-interview/evaluate/{application_id}")
def save_executive_evaluation(
    application_id: int, 
    evaluation_data: InterviewEvaluationCreate,
    db: Session = Depends(get_db)
):
    """임원진 평가 결과 저장"""
    try:
        # 지원자 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # 기존 임원진 평가 확인
        existing_evaluation = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_id == application_id,
            InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
        ).first()
        
        if existing_evaluation:
            # 기존 평가 업데이트
            existing_evaluation.total_score = evaluation_data.total_score
            existing_evaluation.summary = evaluation_data.summary
            existing_evaluation.updated_at = datetime.now()
            evaluation = existing_evaluation
        else:
            # 새 평가 생성
            evaluation = InterviewEvaluation(
                interview_id=application_id,
                evaluator_id=evaluation_data.evaluator_id,
                is_ai=False,
                evaluation_type=EvaluationType.EXECUTIVE,
                total_score=evaluation_data.total_score,
                summary=evaluation_data.summary,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(evaluation)
            db.flush()
        
        # 평가 항목들 저장
        for item_data in evaluation_data.evaluation_items:
            from app.models.v2.interview.interview_evaluation import InterviewEvaluationItem
            evaluation_item = InterviewEvaluationItem(
                evaluation_id=evaluation.id,
                evaluate_type=item_data.evaluate_type,
                evaluate_score=item_data.evaluate_score,
                grade=item_data.grade,
                comment=item_data.comment
            )
            db.add(evaluation_item)
        
        # [Refactored] 임원진 평가 저장 후 ApplicationStage 점수 자동 업데이트
        # application.executive_score = evaluation.total_score  <- 삭제
        
        update_stage_status(
            db, application_id, StageName.EXECUTIVE_INTERVIEW, StageStatus.COMPLETED, 
            score=evaluation.total_score
        )
        
        db.commit()
        
        return {"message": "임원진 평가가 저장되었습니다", "evaluation_id": evaluation.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"임원진 평가 저장 실패: {str(e)}"
        )

@router.get("/executive-interview/evaluation/{application_id}")
def get_executive_evaluation(application_id: int, db: Session = Depends(get_db)):
    """임원진 평가 결과 조회"""
    try:
        evaluation = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_id == application_id,
            InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
        ).first()
        
        if not evaluation:
            return {"message": "임원진 평가 결과가 없습니다"}
        
        return evaluation
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"임원진 평가 조회 실패: {str(e)}"
        )
