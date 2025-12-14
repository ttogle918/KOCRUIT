from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import Table, MetaData, select, func
from typing import List, Dict, Any
import json
import re
from app.core.database import get_db
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationDetail, ApplicationList
from app.models.v2.document.application import Application, ApplicationStage, OverallStatus, StageName, StageStatus
from app.models.v2.auth.user import User, ApplicantUser
from app.api.v2.auth.auth import get_current_user
from app.models.v2.document.resume import Resume, Spec
from app.models.v2.common.schedule import ScheduleInterview
from app.models.v2.recruitment.job import JobPost
from app.models.v2.recruitment.weight import Weight
from app.utils.llm_cache import redis_cache
from app.models.v2.test.written_test_answer import WrittenTestAnswer
from app.schemas.written_test_answer import WrittenTestAnswerResponse
from app.services.v2.document.application_evaluation_service import auto_evaluate_all_applications
from app.utils.enum_converter import get_safe_interview_statuses
from app.models.v2.interview.media_analysis import MediaAnalysis
from app.utils.resume_parser import parse_resume_specs
from app.services.v2.document.application_service import update_stage_status
import logging
import requests 

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[ApplicationList])
def get_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # joinedload를 사용하여 stages 정보를 함께 로드 (N+1 문제 방지)
    applications = db.query(Application).options(joinedload(Application.stages)).offset(skip).limit(limit).all()
    return applications


@router.get("/{application_id}", response_model=ApplicationDetail)
# @redis_cache(expire=300) 
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # joinedload를 사용하여 관계 데이터를 한 번에 가져오기
    application = (
        db.query(Application)
        .options(
            joinedload(Application.stages),
            joinedload(Application.user),
            joinedload(Application.resume).joinedload(Resume.specs)
        )
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 스펙 데이터 파싱
    specs = application.resume.specs if application.resume else []
    parsed_specs = parse_resume_specs(specs)
    
    response_data = {
        # 기본 필드
        "id": application.id,
        "user_id": application.user_id,
        "resume_id": application.resume_id,
        "job_post_id": application.job_post_id,
        "score": application.score,
        "ai_score": application.ai_score,
        "human_score": application.human_score,
        "final_score": application.final_score,
        "status": application.status,
        "applied_at": application.applied_at,
        "application_source": application.application_source,
        "pass_reason": application.pass_reason,
        "fail_reason": application.fail_reason,
        
        # Stages
        "stages": application.stages,
        "current_stage": application.current_stage,
        "overall_status": application.overall_status,
        
        # Computed Fields (@property)
        "document_status": application.document_status,
        "ai_interview_status": application.ai_interview_status,
        "practical_interview_status": application.practical_interview_status,
        "executive_interview_status": application.executive_interview_status,
        "ai_interview_score": application.ai_interview_score,
        "ai_interview_pass_reason": application.ai_interview_pass_reason,
        "ai_interview_fail_reason": application.ai_interview_fail_reason,
        "ai_interview_video_url": application.ai_interview_video_url,

        # 이력서/유저 정보 추가
        "applicantName": application.user.name if application.user else "",
        "gender": application.user.gender if application.user else "",
        "birthDate": str(application.user.birth_date) if application.user and application.user.birth_date else None,
        "email": application.user.email if application.user else "",
        "address": application.user.address if application.user else "",
        "phone": application.user.phone if application.user else "",
        "content": application.resume.content if application.resume else "",
        
        # 파싱된 스펙 데이터
        "educations": parsed_specs["educations"],
        "awards": parsed_specs["awards"],
        "certificates": parsed_specs["certificates"],
        "skills": parsed_specs["skills"],
        "experiences": parsed_specs["experiences"]
    }
    
    return response_data


@router.post("/", response_model=ApplicationDetail)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 중복 지원 확인
    existing_application = db.query(Application).filter(
        Application.user_id == application.user_id,
        Application.job_post_id == application.job_post_id
    ).first()
    
    if existing_application:
        raise HTTPException(status_code=400, detail="User has already applied for this job post")

    # 2. Application 생성
    db_application = Application(
        job_post_id=application.job_post_id,
        user_id=application.user_id,
        resume_id=application.resume_id,
        application_source=application.application_source,
        current_stage=StageName.DOCUMENT,
        overall_status=OverallStatus.IN_PROGRESS
    )
    db.add(db_application)
    db.flush() 

    # 3. 초기 Stage 생성
    document_stage = ApplicationStage(
        application_id=db_application.id,
        stage_name=StageName.DOCUMENT,
        stage_order=1,
        status=StageStatus.PENDING
    )
    db.add(document_stage)
    
    db.commit()
    db.refresh(db_application)
    return db_application


@router.put("/{application_id}/status")
def update_application_status(
    application_id: int,
    status_update: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if status_update.overall_status:
        application.overall_status = status_update.overall_status.value
        
    if status_update.current_stage:
        application.current_stage = status_update.current_stage.value
        
        # Upsert Stage (Service 함수 사용)
        update_stage_status(db, application.id, status_update.current_stage.value, StageStatus.PENDING)

    db.commit()
    
    # 캐시 무효화
    try:
        from app.utils.llm_cache import invalidate_cache
        application_cache_pattern = f"api_cache:get_application:*application_id_{application_id}*"
        invalidate_cache(application_cache_pattern)
        job_post_id = application.job_post_id
        applicants_cache_pattern = f"api_cache:get_applicants_by_job:*job_post_id_{job_post_id}*"
        applicants_with_interview_cache_pattern = f"api_cache:get_applicants_with_interview:*job_post_id_{job_post_id}*"
        invalidate_cache(applicants_cache_pattern)
        invalidate_cache(applicants_with_interview_cache_pattern)
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    return {"message": "Application status updated successfully"}


@router.post("/{application_id}/ai-evaluate")
def ai_evaluate_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job_posting = {
        "title": application.job_post.title,
        "content": application.job_post.job_details,
        "requirements": application.job_post.qualifications
    }
    
    resume_data = {
        "content": application.resume.content,
        "title": application.resume.title
    }
    
    # Spec 데이터 분류 (유틸리티 함수 활용)
    specs = application.resume.specs if application.resume else []
    structured_spec_data = parse_resume_specs(specs)
    
    # 가중치 데이터 로드
    weights = db.query(Weight).filter(Weight.jobpost_id == application.job_post.id).all()
    weight_dict = {w.field_name: w.weight_value for w in weights} if weights else {}

    # AI Agent 호출
    try:
        agent_url = "http://kocruit_agent:8001/evaluate-application/"
        payload = {
            "job_posting": job_posting,
            "spec_data": structured_spec_data, 
            "resume_data": resume_data,
            "weight_data": weight_dict
        }
        
        logger.info(f"Sending evaluation request for application {application_id}")
        
        response = requests.post(agent_url, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # [리팩토링] 데이터베이스 업데이트 (Service 함수 사용)
        ai_score = result.get("ai_score", 0.0)
        pass_reason = result.get("pass_reason", "")
        fail_reason = result.get("fail_reason", "")
        
        update_stage_status(
            db, application_id, StageName.AI_INTERVIEW, StageStatus.COMPLETED, 
            score=ai_score, reason=pass_reason or fail_reason
        )
        
        # AI 제안에 따른 서류 합불 처리
        ai_suggested_status = result.get("document_status", "REJECTED")
        doc_status = StageStatus.PASSED if ai_suggested_status == "PASSED" else StageStatus.FAILED
        
        update_stage_status(
            db, application_id, StageName.DOCUMENT, doc_status
        )
        
        # 메인 상태 동기화
        if doc_status == StageStatus.PASSED:
            application.current_stage = StageName.AI_INTERVIEW 
            application.overall_status = OverallStatus.IN_PROGRESS
        else:
            application.overall_status = OverallStatus.REJECTED

        db.commit()
        return {"message": "AI evaluation completed successfully"}

    except Exception as e:
        logger.error(f"AI evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/job/{job_post_id}/applicants", response_model=List[ApplicationList])
def get_applicants_by_job(
    job_post_id: int,
    db: Session = Depends(get_db)
):
    """채용공고별 지원자 목록 조회"""
    applications = (
        db.query(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.resume),
            joinedload(Application.stages)
        )
        .filter(Application.job_post_id == job_post_id)
        .all()
    )
    return applications


@router.get("/job/{job_post_id}/applicants-with-practical-interview")
# @redis_cache(expire=300) 
def get_applicants_with_practical_interview(job_post_id: int, db: Session = Depends(get_db)):
    """실무진 면접 지원자 목록 조회 API"""
    try:
        AIStage = aliased(ApplicationStage)
        PracticalStage = aliased(ApplicationStage)
        
        query = db.query(Application).join(AIStage, Application.id == AIStage.application_id)\
            .outerjoin(PracticalStage, Application.id == PracticalStage.application_id)\
            .filter(
                Application.job_post_id == job_post_id,
                AIStage.stage_name == StageName.AI_INTERVIEW,
                AIStage.status == StageStatus.PASSED,
                Application.overall_status == OverallStatus.IN_PROGRESS
            )
            
        applicants = query.all()
        return applicants
        
    except Exception as e:
        logger.error(f"Failed to fetch applicants: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applicants")


@router.get("/job/{job_post_id}/applicants-with-executive-interview")
def get_applicants_with_executive_interview(job_post_id: int, db: Session = Depends(get_db)):
    """임원진 면접 지원자 목록 조회 API"""
    try:
        PracticalStage = aliased(ApplicationStage)
        
        query = db.query(Application).join(PracticalStage, Application.id == PracticalStage.application_id)\
            .filter(
                Application.job_post_id == job_post_id,
                PracticalStage.stage_name == StageName.PRACTICAL_INTERVIEW,
                PracticalStage.status == StageStatus.PASSED,
                Application.overall_status == OverallStatus.IN_PROGRESS
            )
            
        applicants = query.all()
        return applicants
        
    except Exception as e:
        logger.error(f"Failed to fetch executive applicants: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch applicants")


@router.get("/{application_id}/content")
def get_application_content(
    application_id: int,
    db: Session = Depends(get_db)
):
    """Agent용: 인증 없이 자소서 내용만 가져오기"""
    application = (
        db.query(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.resume).joinedload(Resume.specs)
        )
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "content": application.resume.content if application.resume else "",
        "application_id": application_id
    }

@router.get("/{application_id}/agent")
def get_application_for_agent(
    application_id: int,
    db: Session = Depends(get_db)
):
    """Agent용: 인증 없이 application의 기본 정보만 가져오기"""
    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "id": application.id,
        "job_post_id": application.job_post_id,
        "user_id": application.user_id,
        "resume_id": application.resume_id
    }
