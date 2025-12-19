from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from app.utils.llm_cache import redis_cache
from app.core.database import get_db
from app.models.v2.document.application import Application, ApplicationStage, StageStatus, StageName
from app.models.v2.interview.interview_question import InterviewQuestion, QuestionType
from app.models.v2.interview.interview_question_log import InterviewQuestionLog, InterviewType
from app.models.v2.interview.evaluation_criteria import EvaluationCriteria
from app.models.v2.interview.personal_question_result import PersonalQuestionResult
from app.models.v2.analysis.analysis_result import AnalysisResult
from app.schemas.interview_question import InterviewQuestionResponse
from app.schemas.evaluation_criteria import EvaluationCriteriaResponse, JobBasedCriteriaResponse
from app.services.v2.interview.interview_question_service import InterviewQuestionService
from app.services.v2.interview.evaluation_criteria_service import EvaluationCriteriaService
from datetime import datetime

router = APIRouter()

# --- 질문 조회 관련 ---

@router.get("/application/{application_id}", response_model=List[InterviewQuestionResponse])
@redis_cache(expire=300)
def get_questions_by_application(application_id: int, db: Session = Depends(get_db)):
    """지원서별 모든 질문 조회"""
    return db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id).all()

@router.get("/application/{application_id}/by-type", response_model=InterviewQuestionResponse)
@redis_cache(expire=300)
def get_questions_by_type(application_id: int, db: Session = Depends(get_db)):
    """지원서별 질문을 유형별로 분류하여 조회"""
    return InterviewQuestionService.get_questions_by_type(db, application_id)

@router.get("/application/{application_id}/practical-questions")
@redis_cache(expire=300)
async def get_practical_interview_questions(application_id: int, db: Session = Depends(get_db)):
    """실무진 면접 질문 조회 (COMMON, JOB, PERSONAL)"""
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        questions = []
        common_questions = db.query(InterviewQuestion).filter(InterviewQuestion.type == "COMMON").all()
        questions.extend([{"question_text": q.question_text, "type": q.type, "category": q.category, "difficulty": q.difficulty} for q in common_questions])
        
        job_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.type == "JOB",
            InterviewQuestion.application_id.is_(None)
        ).all()
        questions.extend([{"question_text": q.question_text, "type": q.type, "category": q.category, "difficulty": q.difficulty} for q in job_questions])
        
        personal_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.type == "PERSONAL",
            InterviewQuestion.application_id == application_id
        ).all()
        questions.extend([{"question_text": q.question_text, "type": q.type, "category": q.category, "difficulty": q.difficulty} for q in personal_questions])
        
        seen = set()
        unique_questions = []
        for q in questions:
            if q["question_text"] not in seen:
                seen.add(q["question_text"])
                unique_questions.append(q)
        
        return {
            "application_id": application_id,
            "questions": sorted(unique_questions, key=lambda x: x["question_text"]),
            "question_count": len(unique_questions),
            "source": "database"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/application/{application_id}/executive-questions")
@redis_cache(expire=300)
async def get_executive_interview_questions(application_id: int, db: Session = Depends(get_db)):
    """임원진 면접 질문 조회 (COMMON, EXECUTIVE, PERSONAL)"""
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        questions = []
        common_questions = db.query(InterviewQuestion).filter(InterviewQuestion.type == "COMMON").all()
        questions.extend([{"question_text": q.question_text, "type": q.type, "category": q.category, "difficulty": q.difficulty} for q in common_questions])
        
        executive_questions = db.query(InterviewQuestion).filter(InterviewQuestion.type == "EXECUTIVE").all()
        questions.extend([{"question_text": q.question_text, "type": q.type, "category": q.category, "difficulty": q.difficulty} for q in executive_questions])
        
        personal_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.type == "PERSONAL",
            InterviewQuestion.application_id == application_id
        ).all()
        questions.extend([{"question_text": q.question_text, "type": q.type, "category": q.category, "difficulty": q.difficulty} for q in personal_questions])
        
        seen = set()
        unique_questions = []
        for q in questions:
            if q["question_text"] not in seen:
                seen.add(q["question_text"])
                unique_questions.append(q)
        
        return {
            "application_id": application_id,
            "questions": sorted(unique_questions, key=lambda x: x["question_text"]),
            "question_count": len(unique_questions),
            "source": "database"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/application/{application_id}/ai-questions")
@redis_cache(expire=300)
def get_ai_interview_questions(application_id: int, db: Session = Depends(get_db)):
    """AI 면접 질문 조회"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.job_post_id == application.job_post_id,
        InterviewQuestion.type == QuestionType.AI_INTERVIEW
    ).order_by(InterviewQuestion.category, InterviewQuestion.id).all()
    
    grouped = {}
    for q in questions:
        cat = q.category or "common"
        if cat not in grouped: grouped[cat] = []
        grouped[cat].append({
            "id": q.id,
            "question_text": q.question_text,
            "type": q.type.value,
            "category": q.category,
            "difficulty": q.difficulty,
            "created_at": q.created_at
        })
    return {"application_id": application_id, "questions": grouped, "total_count": len(questions)}

@router.get("/job/{job_post_id}/ai-questions")
@redis_cache(expire=300)
def get_ai_interview_questions_by_job(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 AI 면접 질문 조회"""
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.job_post_id == job_post_id,
        InterviewQuestion.type == QuestionType.AI_INTERVIEW
    ).all()
    
    grouped = {"common": [], "job_specific": [], "game_test": []}
    for q in questions:
        cat = q.category if q.category in grouped else "common"
        grouped[cat].append({
            "id": q.id,
            "question_text": q.question_text,
            "type": q.type.value,
            "category": q.category,
            "difficulty": q.difficulty,
            "created_at": q.created_at
        })
    return {"job_post_id": job_post_id, "questions": grouped, "total_count": len(questions)}

@router.get("/job/{job_post_id}/common-questions")
@redis_cache(expire=300)
def get_common_questions_for_job_post(
    job_post_id: int, 
    interview_type: Optional[str] = Query(None), # 'practical' or 'executive'
    db: Session = Depends(get_db)
):
    """공고별 공통 질문 조회 (단계별 필터링 적용)"""
    # 1. 시스템 공통 질문 (COMMON)
    common_questions = db.query(InterviewQuestion).filter(InterviewQuestion.type == QuestionType.COMMON).all()
    
    # 2. 해당 공고의 단계별 공통 질문 (JOB 또는 EXECUTIVE, application_id is NULL)
    target_type = QuestionType.JOB
    if interview_type == 'executive':
        target_type = QuestionType.EXECUTIVE
        
    job_questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.job_post_id == job_post_id,
        InterviewQuestion.type == target_type,
        InterviewQuestion.application_id.is_(None)
    ).all()
    
    return {
        "job_post_id": job_post_id,
        "interview_type": interview_type,
        "common_questions": common_questions,
        "job_specific_questions": job_questions,
        "total_count": len(common_questions) + len(job_questions)
    }

@router.get("/application/{application_id}/questions")
@redis_cache(expire=300)
def get_questions_for_application(application_id: int, question_type: Optional[str] = None, db: Session = Depends(get_db)):
    """지원자별 모든 저장된 질문 조회"""
    query = db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id)
    if question_type:
        query = query.filter(InterviewQuestion.type == QuestionType(question_type))
    questions = query.all()
    
    grouped = {}
    for q in questions:
        t = q.type.value
        if t not in grouped: grouped[t] = []
        grouped[t].append({
            "id": q.id,
            "question_text": q.question_text,
            "category": q.category,
            "difficulty": q.difficulty,
            "created_at": q.created_at
        })
    return {"application_id": application_id, "questions": grouped, "total_count": len(questions)}

@router.get("/job/{job_post_id}/questions-status")
@redis_cache(expire=60)
def get_questions_generation_status(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 질문 생성 상태 조회"""
    applications = db.query(Application).filter(
        Application.job_post_id == job_post_id
    ).join(ApplicationStage).filter(
        ApplicationStage.stage_name == StageName.DOCUMENT,
        ApplicationStage.status == StageStatus.PASSED
    ).all()
    
    if not applications:
        return {"job_post_id": job_post_id, "total_applications": 0, "individual_questions_generated": 0}
    
    individual_gen_count = 0
    total_q_count = 0
    for app in applications:
        q_count = db.query(InterviewQuestion).filter(InterviewQuestion.application_id == app.id).count()
        if q_count > 0:
            individual_gen_count += 1
            total_q_count += q_count
            
    return {
        "job_post_id": job_post_id,
        "total_applications": len(applications),
        "individual_questions_generated": individual_gen_count,
        "total_questions": total_q_count
    }

@router.get("/application/{application_id}/logs")
@redis_cache(expire=300)
def get_interview_logs(application_id: int, interview_type: Optional[str] = None, db: Session = Depends(get_db)):
    """면접 로그 조회"""
    query = db.query(InterviewQuestionLog).filter(InterviewQuestionLog.application_id == application_id)
    if interview_type:
        query = query.filter(InterviewQuestionLog.interview_type == interview_type)
    return query.order_by(InterviewQuestionLog.created_at).all()

@router.get("/application/{application_id}/logs/statistics")
@redis_cache(expire=300)
def get_interview_logs_statistics(application_id: int, db: Session = Depends(get_db)):
    """면접 로그 통계 조회"""
    stats = db.query(
        InterviewQuestionLog.interview_type,
        func.count(InterviewQuestionLog.id).label('count')
    ).filter(InterviewQuestionLog.application_id == application_id).group_by(InterviewQuestionLog.interview_type).all()
    
    return {
        "total_interviews": sum(s.count for s in stats),
        "by_type": [{"interview_type": s.interview_type.value if s.interview_type else "AI_INTERVIEW", "count": s.count} for s in stats]
    }

# --- 분석/도구 데이터 조회 관련 ---

@router.get("/evaluation-criteria/job/{job_post_id}", response_model=JobBasedCriteriaResponse)
@redis_cache(expire=300)
async def get_job_based_evaluation_criteria(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 저장된 평가항목 조회"""
    criteria_service = EvaluationCriteriaService(db)
    criteria = criteria_service.get_evaluation_criteria_by_job_post(job_post_id)
    if not criteria:
        raise HTTPException(status_code=404, detail="Evaluation criteria not found")
    return criteria

@router.get("/evaluation-criteria/resume/{resume_id}", response_model=EvaluationCriteriaResponse)
@redis_cache(expire=300)
async def get_resume_based_evaluation_criteria(
    resume_id: int, 
    application_id: Optional[int] = None,
    interview_stage: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """이력서 기반 저장된 평가 기준 조회"""
    criteria_service = EvaluationCriteriaService(db)
    criteria = criteria_service.get_evaluation_criteria_by_resume(resume_id, application_id, interview_stage)
    if not criteria:
        raise HTTPException(status_code=404, detail="Evaluation criteria not found")
    return criteria

@router.get("/personal-questions/{application_id}")
def get_personal_questions(application_id: int, db: Session = Depends(get_db)):
    """저장된 개인별 심층 질문 결과를 조회합니다."""
    personal_result = db.query(PersonalQuestionResult).filter(PersonalQuestionResult.application_id == application_id).first()
    if not personal_result:
        raise HTTPException(status_code=404, detail="Personal question result not found")
    return personal_result

@router.get("/background/status/{application_id}")
async def get_background_task_status(application_id: int, db: Session = Depends(get_db)):
    """백그라운드 작업 상태 확인"""
    questions_count = db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id).count()
    analysis_logs = db.query(InterviewQuestionLog).filter(
        InterviewQuestionLog.application_id == application_id,
        InterviewQuestionLog.interview_type.in_(["resume_analysis", "evaluation_tools"])
    ).count()
    return {
        "application_id": application_id,
        "status": {
            "interview_questions_generated": questions_count > 0,
            "questions_count": questions_count,
            "analysis_tools_generated": analysis_logs > 0,
            "analysis_logs_count": analysis_logs
        }
    }

# --- [추가] 분석 도구 GET 함수들 ---

@router.get("/interview-checklist/job/{job_post_id}")
@redis_cache(expire=1800)
async def get_job_based_checklist(job_post_id: int, db: Session = Depends(get_db)):
    """공고 기반 면접 체크리스트 조회 (AnalysisResult 테이블에서 조회)"""
    result = db.query(AnalysisResult).filter(
        AnalysisResult.jobpost_id == job_post_id,
        AnalysisResult.analysis_type == 'job_based_checklist'
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Checklist not found for this job post. Please generate it first.")
    return result.analysis_data

@router.get("/interview-guideline/job/{job_post_id}")
@redis_cache(expire=1800)
async def get_job_based_guideline(job_post_id: int, db: Session = Depends(get_db)):
    """공고 기반 면접 가이드라인 조회 (AnalysisResult 테이블에서 조회)"""
    result = db.query(AnalysisResult).filter(
        AnalysisResult.jobpost_id == job_post_id,
        AnalysisResult.analysis_type == 'job_based_guideline'
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Guideline not found for this job post. Please generate it first.")
    return result.analysis_data

@router.get("/strengths-weaknesses/job/{job_post_id}")
@redis_cache(expire=1800)
async def get_job_based_strengths(job_post_id: int, db: Session = Depends(get_db)):
    """공고 기반 일반적 강점/약점 조회 (AnalysisResult 테이블에서 조회)"""
    result = db.query(AnalysisResult).filter(
        AnalysisResult.jobpost_id == job_post_id,
        AnalysisResult.analysis_type == 'job_based_strengths'
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Strengths/Weaknesses data not found for this job post. Please generate it first.")
    return result.analysis_data
