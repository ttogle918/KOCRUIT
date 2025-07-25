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

        # ★ 실무진 평가 저장 후 application.practical_score 자동 업데이트
        if evaluation.evaluation_type == EvaluationType.PRACTICAL:
            application = db.query(Application).filter(Application.id == evaluation.interview_id).first()
            if application:
                application.practical_score = evaluation.total_score if evaluation.total_score is not None else 0
                db.commit()
        
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
        
        # 해당 공고의 AI 면접 일정 조회
        ai_schedules = db.query(AIInterviewSchedule).filter(
            AIInterviewSchedule.job_post_id == job_post_id
        ).all()
        
        if not ai_schedules:
            return {
                "success": True,
                "job_post_id": job_post_id,
                "total_evaluations": 0,
                "evaluations": []
            }
        
        # 각 일정의 평가 결과 조회
        evaluations = []
        for schedule in ai_schedules:
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
        
        return {
            "success": True,
            "job_post_id": job_post_id,
            "total_evaluations": len(evaluations),
            "evaluations": evaluations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공고별 AI 면접 평가 조회 실패: {str(e)}")

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
