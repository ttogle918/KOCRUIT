from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.core.database import get_db
from app.models.interview_evaluation import InterviewEvaluation, EvaluationDetail, InterviewEvaluationItem
from app.schemas.interview_evaluation import InterviewEvaluation as InterviewEvaluationSchema, InterviewEvaluationCreate
from datetime import datetime
from decimal import Decimal
from app.models.application import Application
from app.services.interviewer_profile_service import InterviewerProfileService

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
    """기존 평가 업데이트 (통합 시스템 사용)"""
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
        
        # 통합된 서비스를 사용하여 면접관 프로필 업데이트
        try:
            InterviewerProfileService._update_interviewer_profile(db, db_evaluation.evaluator_id, evaluation_id)
            db.commit()
            db.refresh(db_evaluation)
        except Exception as e:
            print(f"[Profile Update] 면접관 프로필 업데이트 실패: {str(e)}")
        
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

# 새로운 통합 API 엔드포인트들
@router.get("/evaluator/{evaluator_id}/characteristics")
def get_evaluator_characteristics(evaluator_id: int, db: Session = Depends(get_db)):
    """면접관 특성 조회"""
    try:
        characteristics = InterviewerProfileService.get_interviewer_characteristics(db, evaluator_id)
        return characteristics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"면접관 특성 조회 중 오류가 발생했습니다: {str(e)}")

@router.post("/panel/balance-recommendation")
def get_balanced_panel_recommendation(available_interviewers: List[int], required_count: int = 3, db: Session = Depends(get_db)):
    """밸런스 있는 면접 패널 추천"""
    try:
        recommended_ids, balance_score = InterviewerProfileService.get_balanced_panel_recommendation(
            db=db,
            available_interviewers=available_interviewers,
            required_count=required_count
        )
        return {
            "recommended_interviewers": recommended_ids,
            "balance_score": balance_score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"패널 추천 중 오류가 발생했습니다: {str(e)}")

@router.post("/panel/{interview_id}/relative-analysis")
def analyze_interview_panel_relative(interview_id: int, db: Session = Depends(get_db)):
    """면접 패널 상대적 분석"""
    try:
        analysis_result = InterviewerProfileService.analyze_interview_panel_relative(
            db=db,
            interview_id=interview_id
        )
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상대적 분석 중 오류가 발생했습니다: {str(e)}")

@router.post("/analyze-interviewer-profiles")
def analyze_interviewer_profiles(db: Session = Depends(get_db)):
    """실제 데이터를 기반으로 면접관 프로필 분석 및 생성"""
    try:
        # 기존 프로필 데이터 삭제 (SQLAlchemy ORM 사용)
        from app.models.interviewer_profile import InterviewerProfile, InterviewerProfileHistory
        
        db.query(InterviewerProfileHistory).delete()
        db.query(InterviewerProfile).delete()
        db.commit()
        
        # 실제 평가 데이터에서 면접관 ID 추출
        result = db.execute(text("""
            SELECT DISTINCT evaluator_id 
            FROM interview_evaluation 
            WHERE evaluator_id IS NOT NULL
            ORDER BY evaluator_id
        """)).fetchall()
        
        interviewer_ids = [row[0] for row in result]
        
        if not interviewer_ids:
            return {
                "success": False,
                "message": "분석할 면접관 데이터가 없습니다.",
                "profiles_created": 0
            }
        
        # 각 면접관에 대해 프로필 생성
        created_profiles = []
        for interviewer_id in interviewer_ids:
            try:
                profile = InterviewerProfileService.initialize_interviewer_profile(db, interviewer_id)
                if profile:
                    created_profiles.append({
                        "interviewer_id": interviewer_id,
                        "strictness_score": profile.strictness_score,
                        "consistency_score": profile.consistency_score,
                        "tech_focus_score": profile.tech_focus_score,
                        "personality_focus_score": profile.personality_focus_score,
                        "evaluation_count": profile.total_interviews
                    })
            except Exception as e:
                print(f"면접관 {interviewer_id} 프로필 생성 실패: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "message": f"{len(created_profiles)}명의 면접관 프로필이 성공적으로 생성되었습니다.",
            "profiles_created": len(created_profiles),
            "profiles": created_profiles
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"면접관 프로필 분석 중 오류가 발생했습니다: {str(e)}")

@router.get("/interviewer-profiles")
def get_interviewer_profiles(db: Session = Depends(get_db)):
    """생성된 면접관 프로필 목록 조회"""
    try:
        from app.models.interviewer_profile import InterviewerProfile
        
        profiles = db.query(InterviewerProfile).all()
        return {
            "total_count": len(profiles),
            "profiles": [
                {
                    "interviewer_id": profile.evaluator_id,
                    "strictness_score": profile.strictness_score,
                    "consistency_score": profile.consistency_score,
                    "tech_focus_score": profile.tech_focus_score,
                    "personality_focus_score": profile.personality_focus_score,
                    "evaluation_count": profile.total_interviews,
                    "last_evaluation_date": profile.last_evaluation_date.isoformat() if profile.last_evaluation_date else None
                }
                for profile in profiles
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"면접관 프로필 조회 중 오류가 발생했습니다: {str(e)}") 