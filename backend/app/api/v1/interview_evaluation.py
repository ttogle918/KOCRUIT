from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from app.core.database import get_db
from app.models.interview_evaluation import InterviewEvaluation, EvaluationDetail, InterviewEvaluationItem
from app.schemas.interview_evaluation import InterviewEvaluation as InterviewEvaluationSchema, InterviewEvaluationCreate
from datetime import datetime
from decimal import Decimal
from app.models.application import Application
from app.services.interviewer_profile_service import InterviewerProfileService
from app.utils.llm_cache import invalidate_cache
import os
import uuid
from app.models.interview_evaluation import EvaluationType
from app.models.interview_question_log import InterviewQuestionLog
import traceback
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
import pandas as pd
from datetime import datetime, timedelta
import json

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

        # ★ 실무진 평가 저장 후 application.practical_score 및 interview_status 자동 업데이트
        if evaluation.interview_type == 'practical':
            application = db.query(Application).filter(Application.id == evaluation.application_id).first()
            if application:
                # practical_score 업데이트
                application.practical_score = evaluation.total_score if evaluation.total_score is not None else 0
                
                # interview_status 업데이트 (평가 완료로 변경)
                from app.models.application import InterviewStatus
                application.interview_status = InterviewStatus.FIRST_INTERVIEW_COMPLETED
                
                db.commit()
                print(f"Updated application {application.id} practical_score to {application.practical_score}")
                print(f"Updated application {application.id} interview_status to {application.interview_status}")
        
        # ★ 임원진 평가 저장 후 application.executive_score 및 interview_status 자동 업데이트
        elif evaluation.interview_type == 'executive':
            application = db.query(Application).filter(Application.id == evaluation.application_id).first()
            if application:
                # executive_score 업데이트 (필드가 있다면)
                if hasattr(application, 'executive_score'):
                    application.executive_score = evaluation.total_score if evaluation.total_score is not None else 0
                
                # interview_status 업데이트 (평가 완료로 변경)
                from app.models.application import InterviewStatus
                application.interview_status = InterviewStatus.SECOND_INTERVIEW_COMPLETED
                
                db.commit()
                print(f"Updated application {application.id} executive_score to {getattr(application, 'executive_score', 'N/A')}")
                print(f"Updated application {application.id} interview_status to {application.interview_status}")
        
        # 캐시 무효화: 새로운 평가가 생성되었으므로 관련 캐시 무효화
        try:
            # 면접 평가 관련 캐시 무효화
            evaluation_cache_pattern = f"api_cache:get_evaluation_by_interview_and_evaluator:*interview_id_{evaluation.interview_id}*"
            invalidate_cache(evaluation_cache_pattern)
            
            # 면접 일정 관련 캐시도 무효화 (평가자가 변경될 수 있음)
            schedule_cache_pattern = f"api_cache:get_interview_schedules_by_applicant:*"
            invalidate_cache(schedule_cache_pattern)
            
            print(f"Cache invalidated after creating evaluation {db_evaluation.id}")
        except Exception as e:
            print(f"Failed to invalidate cache: {e}")
        
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

@router.get("/{application_id}/{interview_type}")
def get_interview_evaluation_by_application(application_id: int, interview_type: str, db: Session = Depends(get_db)):
    """지원자별 면접 평가 결과 조회"""
    try:
        # application_id로 지원자 정보 조회
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # 면접 평가 결과 조회 (가장 최근 것)
        evaluation = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.application_id == application_id,
            InterviewEvaluation.interview_type == interview_type
        ).order_by(InterviewEvaluation.created_at.desc()).first()
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # 평가 상세 항목 조회
        evaluation_items = []
        if evaluation.evaluation_items:
            for item in evaluation.evaluation_items:
                evaluation_items.append({
                    "evaluate_type": item.get('type', ''),
                    "evaluate_score": item.get('score', 0),
                    "comment": item.get('comment', '')
                })
        
        return {
            "id": evaluation.id,
            "application_id": evaluation.application_id,
            "interview_type": evaluation.interview_type,
            "total_score": evaluation.total_score,
            "summary": evaluation.summary,
            "evaluation_items": evaluation_items,
            "created_at": evaluation.created_at,
            "updated_at": evaluation.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"평가 조회 중 오류가 발생했습니다: {str(e)}")

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
        db.refresh(db_evaluation)
        
        # 캐시 무효화: 평가가 업데이트되었으므로 관련 캐시 무효화
        try:
            # 면접 평가 관련 캐시 무효화
            evaluation_cache_pattern = f"api_cache:get_evaluation_by_interview_and_evaluator:*interview_id_{db_evaluation.interview_id}*"
            invalidate_cache(evaluation_cache_pattern)
            
            # 면접 일정 관련 캐시도 무효화
            schedule_cache_pattern = f"api_cache:get_interview_schedules_by_applicant:*"
            invalidate_cache(schedule_cache_pattern)
            
            print(f"Cache invalidated after updating evaluation {evaluation_id}")
        except Exception as e:
            print(f"Failed to invalidate cache: {e}")
        
        return db_evaluation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"평가 업데이트 중 오류가 발생했습니다: {str(e)}")

@router.get("/interview-schedules/applicant/{applicant_id}")
def get_interview_schedules_by_applicant(applicant_id: int, db: Session = Depends(get_db)):
    # applicant_id 유효성 검사
    if applicant_id is None or applicant_id <= 0:
        raise HTTPException(status_code=422, detail="유효하지 않은 지원자 ID입니다.")
    
    # Application 테이블에서 user_id로 schedule_interview_id 찾기
    # applicant_id는 실제로는 user_id를 의미함
    applications = db.query(Application).filter(Application.user_id == applicant_id).all()
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

@router.get("/ai-interview/{application_id}")
def get_ai_interview_evaluation(application_id: int, db: Session = Depends(get_db)):
    """AI 면접 평가 결과 조회"""
    try:
        from app.models.application import Application
        from app.models.schedule import AIInterviewSchedule
        
        # 지원자 정보 조회
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # AI 면접 일정 조회
        ai_schedule = db.query(AIInterviewSchedule).filter(
            AIInterviewSchedule.application_id == application_id
        ).first()
        
        if not ai_schedule:
            return {
                "success": False,
                "message": "AI 면접 일정이 없습니다",
                "application_id": application_id,
                "evaluation": None
            }
        
        # AI 면접 평가 결과 조회
        evaluation = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_id == ai_schedule.id,
            InterviewEvaluation.evaluation_type == EvaluationType.AI
        ).first()
        
        if not evaluation:
            return {
                "success": False,
                "message": "AI 면접 평가 결과가 없습니다",
                "application_id": application_id,
                "interview_id": ai_schedule.id,
                "evaluation": None
            }
        
        # 평가 항목 조회
        evaluation_items = db.query(InterviewEvaluationItem).filter(
            InterviewEvaluationItem.evaluation_id == evaluation.id
        ).all()
        
        # 결과 구성
        result = {
            "success": True,
            "application_id": application_id,
            "interview_id": ai_schedule.id,
            "applicant_name": application.user.name if application.user else "",
            "job_post_title": "",
            "evaluation": {
                "id": evaluation.id,
                "total_score": float(evaluation.total_score) if evaluation.total_score else 0,
                "summary": evaluation.summary,
                "status": evaluation.status.value if evaluation.status else "PENDING",
                "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None,
                "updated_at": evaluation.updated_at.isoformat() if evaluation.updated_at else None,
                "evaluation_items": [
                    {
                        "evaluate_type": item.evaluate_type,
                        "evaluate_score": float(item.evaluate_score) if item.evaluate_score else 0,
                        "grade": item.grade,
                        "comment": item.comment
                    }
                    for item in evaluation_items
                ]
            }
        }
        
        # 공고 정보 추가
        if ai_schedule.job_post:
            result["job_post_title"] = ai_schedule.job_post.title
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 면접 평가 조회 실패: {str(e)}")

@router.get("/ai-interview/job-post/{job_post_id}")
def get_ai_interview_evaluations_by_job_post(job_post_id: int, db: Session = Depends(get_db)):
    """특정 공고의 모든 AI 면접 평가 결과 조회"""
    try:
        from app.models.schedule import AIInterviewSchedule
        
        print(f"🔍 AI 면접 평가 조회 시작 - job_post_id: {job_post_id}")
        
        # 해당 공고의 AI 면접 일정 조회
        ai_schedules = db.query(AIInterviewSchedule).filter(
            AIInterviewSchedule.job_post_id == job_post_id
        ).all()
        
        print(f"📊 조회된 AI 면접 일정 수: {len(ai_schedules)}")
        
        if not ai_schedules:
            print("⚠️ 해당 공고의 AI 면접 일정이 없습니다.")
            return {
                "success": True,
                "job_post_id": job_post_id,
                "total_evaluations": 0,
                "evaluations": []
            }
        
        # 각 일정의 평가 결과 조회
        evaluations = []
        for schedule in ai_schedules:
            try:
                evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id == schedule.id,
                    InterviewEvaluation.evaluation_type == EvaluationType.AI
                ).first()
                
                if evaluation:
                    # 평가 항목 조회
                    evaluation_items = db.query(InterviewEvaluationItem).filter(
                        InterviewEvaluationItem.evaluation_id == evaluation.id
                    ).all()
                    
                    # 등급별 개수 계산
                    grade_counts = {"상": 0, "중": 0, "하": 0}
                    for item in evaluation_items:
                        if item.grade in grade_counts:
                            grade_counts[item.grade] += 1
                    
                    # 합격 여부 판정
                    total_items = len(evaluation_items)
                    low_threshold = max(2, int(total_items * 0.15))
                    passed = grade_counts["하"] < low_threshold
                    
                    evaluations.append({
                        "application_id": schedule.application_id,
                        "applicant_name": schedule.applicant.name if schedule.applicant else "",
                        "interview_id": schedule.id,
                        "evaluation_id": evaluation.id,
                        "total_score": float(evaluation.total_score) if evaluation.total_score else 0,
                        "grade_counts": grade_counts,
                        "passed": passed,
                        "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None
                    })
                    
                    print(f"✅ 지원자 {schedule.application_id} ({schedule.applicant.name if schedule.applicant else 'Unknown'}) AI 면접 평가 처리 완료")
                else:
                    print(f"⚠️ 지원자 {schedule.application_id}의 AI 면접 평가가 없습니다.")
                    
            except Exception as schedule_error:
                print(f"❌ 일정 {schedule.id} 처리 중 오류: {str(schedule_error)}")
                continue
        
        print(f"🎯 AI 면접 평가 결과: {len(evaluations)}명의 평가 데이터 반환")
        
        return {
            "success": True,
            "job_post_id": job_post_id,
            "total_evaluations": len(evaluations),
            "evaluations": evaluations
        }
        
    except Exception as e:
        print(f"💥 AI 면접 평가 조회 중 치명적 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 면접 평가 조회 실패: {str(e)}")

@router.get("/job-post/{job_post_id}/practical")
def get_practical_interview_evaluations_by_job_post(job_post_id: int, db: Session = Depends(get_db)):
    """특정 공고의 모든 실무진 면접 평가 결과 조회"""
    try:
        print(f"🔍 실무진 면접 평가 조회 시작 - job_post_id: {job_post_id}")
        
        # 해당 공고의 지원자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == job_post_id
        ).all()
        
        print(f"📊 조회된 지원자 수: {len(applications)}")
        
        if not applications:
            print("⚠️ 해당 공고의 지원자가 없습니다.")
            return {
                "success": True,
                "job_post_id": job_post_id,
                "total_evaluations": 0,
                "evaluations": []
            }
        
        # 각 지원자의 실무진 면접 평가 결과 조회
        evaluations = []
        for application in applications:
            try:
                evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id == application.id,
                    InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
                ).first()
                
                if evaluation:
                    # 평가 항목 조회
                    evaluation_items = db.query(InterviewEvaluationItem).filter(
                        InterviewEvaluationItem.evaluation_id == evaluation.id
                    ).all()
                    
                    evaluations.append({
                        "application_id": application.id,
                        "applicant_name": application.user.name if application.user else "",
                        "interview_id": application.id,
                        "evaluation_id": evaluation.id,
                        "total_score": float(evaluation.total_score) if evaluation.total_score else 0,
                        "summary": evaluation.summary,
                        "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None
                    })
                    
                    print(f"✅ 지원자 {application.id} ({application.user.name if application.user else 'Unknown'}) 실무진 면접 평가 처리 완료")
                else:
                    print(f"⚠️ 지원자 {application.id}의 실무진 면접 평가가 없습니다.")
                    
            except Exception as app_error:
                print(f"❌ 지원자 {application.id} 처리 중 오류: {str(app_error)}")
                continue
        
        print(f"🎯 실무진 면접 평가 결과: {len(evaluations)}명의 평가 데이터 반환")
        
        return {
            "success": True,
            "job_post_id": job_post_id,
            "total_evaluations": len(evaluations),
            "evaluations": evaluations
        }
        
    except Exception as e:
        print(f"💥 실무진 면접 평가 조회 중 치명적 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"실무진 면접 평가 조회 실패: {str(e)}")

@router.get("/job-post/{job_post_id}/executive")
def get_executive_interview_evaluations_by_job_post(job_post_id: int, db: Session = Depends(get_db)):
    """특정 공고의 모든 임원진 면접 평가 결과 조회"""
    try:
        print(f"🔍 임원진 면접 평가 조회 시작 - job_post_id: {job_post_id}")
        
        # 해당 공고의 지원자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == job_post_id
        ).all()
        
        print(f"📊 조회된 지원자 수: {len(applications)}")
        
        if not applications:
            print("⚠️ 해당 공고의 지원자가 없습니다.")
            return {
                "success": True,
                "job_post_id": job_post_id,
                "total_evaluations": 0,
                "evaluations": []
            }
        
        # 각 지원자의 임원진 면접 평가 결과 조회
        evaluations = []
        for application in applications:
            try:
                evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id == application.id,
                    InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
                ).first()
                
                if evaluation:
                    # 평가 항목 조회
                    evaluation_items = db.query(InterviewEvaluationItem).filter(
                        InterviewEvaluationItem.evaluation_id == evaluation.id
                    ).all()
                    
                    evaluations.append({
                        "application_id": application.id,
                        "applicant_name": application.user.name if application.user else "",
                        "interview_id": application.id,
                        "evaluation_id": evaluation.id,
                        "total_score": float(evaluation.total_score) if evaluation.total_score else 0,
                        "summary": evaluation.summary,
                        "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None
                    })
                    
                    print(f"✅ 지원자 {application.id} ({application.user.name if application.user else 'Unknown'}) 임원진 면접 평가 처리 완료")
                else:
                    print(f"⚠️ 지원자 {application.id}의 임원진 면접 평가가 없습니다.")
                    
            except Exception as app_error:
                print(f"❌ 지원자 {application.id} 처리 중 오류: {str(app_error)}")
                continue
        
        print(f"🎯 임원진 면접 평가 결과: {len(evaluations)}명의 평가 데이터 반환")
        
        return {
            "success": True,
            "job_post_id": job_post_id,
            "total_evaluations": len(evaluations),
            "evaluations": evaluations
        }
        
    except Exception as e:
        print(f"💥 임원진 면접 평가 조회 중 치명적 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"임원진 면접 평가 조회 실패: {str(e)}")

@router.get("/ai-interview/summary")
def get_ai_interview_summary(db: Session = Depends(get_db)):
    """AI 면접 전체 요약 통계"""
    try:
        # 전체 AI 면접 평가 수
        total_evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluation_type == EvaluationType.AI
        ).count()
        
        # 합격/불합격 통계
        passed_count = 0
        failed_count = 0
        
        evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluation_type == EvaluationType.AI
        ).all()
        
        for evaluation in evaluations:
            evaluation_items = db.query(InterviewEvaluationItem).filter(
                InterviewEvaluationItem.evaluation_id == evaluation.id
            ).all()
            
            if evaluation_items:
                grade_counts = {"상": 0, "중": 0, "하": 0}
                for item in evaluation_items:
                    if item.grade in grade_counts:
                        grade_counts[item.grade] += 1
                
                total_items = len(evaluation_items)
                low_threshold = max(2, int(total_items * 0.15))
                if grade_counts["하"] < low_threshold:
                    passed_count += 1
                else:
                    failed_count += 1
        
        return {
            "success": True,
            "summary": {
                "total_evaluations": total_evaluations,
                "passed_count": passed_count,
                "failed_count": failed_count,
                "pass_rate": round(passed_count / total_evaluations * 100, 2) if total_evaluations > 0 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 면접 요약 조회 실패: {str(e)}")

@router.post("/upload-audio")
async def upload_interview_audio(
    audio_file: UploadFile = File(...),
    application_id: int = Form(...),
    job_post_id: Optional[int] = Form(None),
    company_name: Optional[str] = Form(None),
    applicant_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """면접 녹음 파일 업로드 API"""
    try:
        # 파일 유효성 검사
        if not audio_file.filename:
            raise HTTPException(status_code=400, detail="파일이 선택되지 않았습니다.")
        
        # 지원자 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자 정보를 찾을 수 없습니다.")
        
        # 파일 확장자 검사
        allowed_extensions = ['.webm', '.mp3', '.wav', '.m4a']
        file_extension = os.path.splitext(audio_file.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {', '.join(allowed_extensions)}"
            )
        
        # 파일 크기 검사 (50MB 제한)
        max_size = 50 * 1024 * 1024  # 50MB
        if audio_file.size and audio_file.size > max_size:
            raise HTTPException(status_code=400, detail="파일 크기가 너무 큽니다. (최대 50MB)")
        
        # 고유한 파일명 생성
        unique_filename = f"interview_{application_id}_{uuid.uuid4().hex}{file_extension}"
        
        # 업로드 디렉토리 생성
        upload_dir = "uploads/interview_audio"
        os.makedirs(upload_dir, exist_ok=True)
        
        # 파일 저장
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        # 2. DB 기록 (status='pending')
        log = InterviewQuestionLog(
            application_id=application_id,
            question_id=question_id,
            answer_audio_url=file_path,
            status='pending',
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(log)
        db.commit()
        db.refresh(log)

        return {
            "message": "녹음 파일이 성공적으로 업로드되었습니다.",
            "filename": unique_filename,
            "file_path": file_path,
            "file_size": len(content),
            "application_id": application_id,
            "uploaded_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}")

@router.post("/job-post/{job_post_id}/final-selection")
def update_final_selection(job_post_id: int, db: Session = Depends(get_db)):
    """최종 선발 상태 업데이트 - headcount만큼 최종 합격자 선정"""
    try:
        # 공고 정보 조회
        from app.models.job import JobPost
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
        
        headcount = job_post.headcount or 1
        target_count = headcount  # headcount만큼만 선발
        
        # 현재 최종 선발자 수 확인 (final_status 기준)
        from app.models.application import FinalStatus
        current_selected = db.query(Application).filter(
            Application.job_post_id == job_post_id,
            Application.final_status == FinalStatus.SELECTED
        ).count()
        
        # 추가로 선발할 인원 수 계산
        additional_needed = max(0, target_count - current_selected)
        
        if additional_needed > 0:
            # 임원 면접까지 완료된 지원자들을 점수 순으로 정렬하여 추가 선발
            candidates = db.query(Application).filter(
                Application.job_post_id == job_post_id,
                Application.document_status == 'PASSED',
                Application.final_status != FinalStatus.SELECTED,
                Application.executive_score.isnot(None)
            ).order_by(Application.final_score.desc()).limit(additional_needed).all()
            
            # 상태 업데이트 (final_status만 변경, pass_reason은 건드리지 않음)
            for candidate in candidates:
                candidate.final_status = FinalStatus.SELECTED
            
            db.commit()
            
            return {
                "success": True,
                "job_post_id": job_post_id,
                "headcount": headcount,
                "target_count": target_count,
                "current_selected": current_selected,
                "additional_selected": len(candidates),
                "message": f"{len(candidates)}명의 지원자가 추가로 최종 선발자로 선정되었습니다."
            }
        else:
            return {
                "success": True,
                "job_post_id": job_post_id,
                "headcount": headcount,
                "target_count": target_count,
                "current_selected": current_selected,
                "additional_selected": 0,
                "message": "이미 목표 인원이 충족되었습니다."
            }
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"최종 선발 업데이트 실패: {str(e)}") 

@router.get("/job-post/{job_post_id}/final-selected")
def get_final_selected_applicants(job_post_id: int, db: Session = Depends(get_db)):
    """최종 선발된 지원자들 조회 (final_status = 'SELECTED')"""
    try:
        from app.models.application import FinalStatus
        from app.models.user import User
        from app.models.schedule import AIInterviewSchedule
        
        print(f"🔍 최종 선발자 조회 시작 - job_post_id: {job_post_id}")
        
        # final_status = 'SELECTED'인 지원자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == job_post_id,
            Application.final_status == FinalStatus.SELECTED
        ).all()
        
        print(f"📊 조회된 최종 선발자 수: {len(applications)}")
        
        result = []
        for app in applications:
            try:
                user = db.query(User).filter(User.id == app.user_id).first()
                
                # AI 면접 평가 조회 (AI 면접은 ai_interview_schedule.id를 참조)
                ai_schedule = db.query(AIInterviewSchedule).filter(
                    AIInterviewSchedule.application_id == app.id
                ).first()
                
                ai_evaluation = None
                if ai_schedule:
                    try:
                        ai_evaluation = db.query(InterviewEvaluation).filter(
                            InterviewEvaluation.interview_id == ai_schedule.id,
                            InterviewEvaluation.evaluation_type == EvaluationType.AI
                        ).first()
                        print(f"✅ AI 면접 평가 조회 성공 - schedule_id: {ai_schedule.id}, evaluation: {ai_evaluation.id if ai_evaluation else 'None'}")
                    except Exception as ai_error:
                        print(f"❌ AI 면접 평가 조회 실패 - schedule_id: {ai_schedule.id}, error: {str(ai_error)}")
                        ai_evaluation = None
                
                # 실무진 면접 평가 조회
                practical_evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id == app.id,
                    InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
                ).first()
                
                # 임원진 면접 평가 조회
                executive_evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id == app.id,
                    InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
                ).first()
                
                result.append({
                    "id": app.id,
                    "applicant_name": user.name if user else "Unknown",
                    "total_score": app.final_score or 0,  # 프론트엔드 호환성을 위해 추가
                    "ai_interview_score": ai_evaluation.total_score if ai_evaluation else 0,
                    "practical_score": practical_evaluation.total_score if practical_evaluation else 0,
                    "executive_score": executive_evaluation.total_score if executive_evaluation else 0,
                    "final_score": app.final_score or 0,
                    "ai_interview_pass_reason": app.ai_interview_pass_reason or "",
                    "ai_interview_fail_reason": app.ai_interview_fail_reason or "",
                    "passed": True,  # final_status = 'SELECTED'이므로 항상 True
                    "ai_evaluation": {
                        "total_score": ai_evaluation.total_score if ai_evaluation else 0,
                        "summary": ai_evaluation.summary if ai_evaluation else "",
                        "passed": ai_evaluation.total_score >= 70 if ai_evaluation else False
                    } if ai_evaluation else None,
                    "practical_evaluation": {
                        "total_score": practical_evaluation.total_score if practical_evaluation else 0,
                        "summary": practical_evaluation.summary if practical_evaluation else "",
                        "passed": practical_evaluation.total_score >= 70 if practical_evaluation else False
                    } if practical_evaluation else None,
                    "executive_evaluation": {
                        "total_score": executive_evaluation.total_score if executive_evaluation else 0,
                        "summary": executive_evaluation.summary if executive_evaluation else "",
                        "passed": executive_evaluation.total_score >= 75 if executive_evaluation else False
                    } if executive_evaluation else None
                })
                
                print(f"✅ 지원자 {app.id} ({user.name if user else 'Unknown'}) 처리 완료")
                
            except Exception as app_error:
                print(f"❌ 지원자 {app.id} 처리 중 오류: {str(app_error)}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"🎯 최종 결과: {len(result)}명의 지원자 데이터 반환")
        
        return {
            "evaluations": result,
            "total_evaluations": len(result)
        }
        
    except Exception as e:
        print(f"💥 최종 선발자 조회 중 치명적 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"최종 선발자 조회 실패: {str(e)}") 

@router.get("/job-post/{job_post_id}/ai-insights")
def get_ai_insights(job_post_id: int, force_regenerate: bool = False, db: Session = Depends(get_db)):
    """AI 분석을 통한 면접 인사이트 생성 (LangGraph 기반)"""
    try:
        print(f"🤖 AI 인사이트 분석 시작 - job_post_id: {job_post_id}, force_regenerate: {force_regenerate}")
        
        # AI 인사이트 서비스 사용
        from app.services.ai_insights_service import AIInsightsService
        
        insights = AIInsightsService.get_or_create_ai_insights(db, job_post_id, force_regenerate)
        
        if "error" in insights:
            print(f"💥 AI 인사이트 분석 실패: {insights['error']}")
            raise HTTPException(status_code=500, detail=insights["error"])
        
        print(f"✅ AI 인사이트 분석 완료 - 실행 시간: {insights.get('execution_time', 0):.2f}초")
        
        return insights
        
    except Exception as e:
        print(f"💥 AI 인사이트 분석 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 인사이트 분석 실패: {str(e)}")

@router.get("/job-post/{job_post_id}/ai-insights/history")
def get_ai_insights_history(job_post_id: int, db: Session = Depends(get_db)):
    """AI 인사이트 히스토리 조회"""
    try:
        from app.services.ai_insights_service import AIInsightsService
        
        history = AIInsightsService.get_ai_insights_history(db, job_post_id)
        return {"history": history}
        
    except Exception as e:
        print(f"💥 AI 인사이트 히스토리 조회 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 인사이트 히스토리 조회 실패: {str(e)}")

@router.post("/job-post/{job_post_id}/ai-insights/compare")
def compare_ai_insights(job_post_id: int, compared_job_post_id: int, db: Session = Depends(get_db)):
    """AI 인사이트 비교 분석"""
    try:
        print(f"📊 AI 인사이트 비교 분석 시작 - job_post_id: {job_post_id}, compared_job_post_id: {compared_job_post_id}")
        
        from app.services.ai_insights_service import AIInsightsService
        
        comparison = AIInsightsService.compare_job_posts(db, job_post_id, compared_job_post_id)
        
        if "error" in comparison:
            print(f"💥 AI 인사이트 비교 분석 실패: {comparison['error']}")
            raise HTTPException(status_code=500, detail=comparison["error"])
        
        print(f"✅ AI 인사이트 비교 분석 완료")
        
        return comparison
        
    except Exception as e:
        print(f"💥 AI 인사이트 비교 분석 중 오류: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 인사이트 비교 분석 실패: {str(e)}") 
