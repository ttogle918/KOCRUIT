from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.schemas.resume import (
    ResumeCreate, ResumeUpdate, ResumeDetail, ResumeList,
    ResumeMemoCreate, ResumeMemoUpdate, ResumeMemoDetail
)
from app.models.resume import Resume, ResumeMemo
from app.models.auth.user import User
from app.models.application import Application
from app.api.v1.auth.auth import get_current_user
from app.utils.llm_cache import redis_cache
from pydantic import BaseModel
from app.models.job import JobPost
from app.models.resume import Spec
from app.models.analysis_result import AnalysisResult
from datetime import datetime

# 공통 유틸리티 import
from agent.utils.resume_utils import combine_resume_and_specs
import time

router = APIRouter()

# 이력서 분석 도구를 위한 스키마
class ResumeAnalysisRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None

class ResumeAnalysisResponse(BaseModel):
    results: Dict[str, Any]
    errors: Dict[str, Any]
    summary: Dict[str, Any]
    metadata: Dict[str, Any]


@router.get("/", response_model=List[ResumeList])
def get_resumes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).offset(skip).limit(limit).all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeDetail)
@redis_cache(expire=300)  # 5분 캐시
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("/", response_model=ResumeDetail)
def create_resume(
    resume: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_resume = Resume(**resume.dict(), user_id=current_user.id)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.put("/{resume_id}", response_model=ResumeDetail)
def update_resume(
    resume_id: int,
    resume: ResumeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    for field, value in resume.dict(exclude_unset=True).items():
        setattr(db_resume, field, value)
    
    db.commit()
    db.refresh(db_resume)
    
    # 캐시 무효화: 이력서가 수정되었으므로 관련 캐시 무효화
    try:
        from app.utils.llm_cache import invalidate_cache
        
        # 이력서 상세 캐시 무효화
        resume_cache_pattern = f"api_cache:get_resume:*resume_id_{resume_id}*"
        invalidate_cache(resume_cache_pattern)
        
        # 해당 이력서를 사용하는 지원자들의 캐시도 무효화
        applications = db.query(Application).filter(Application.resume_id == resume_id).all()
        for app in applications:
            application_cache_pattern = f"api_cache:get_application:*application_id_{app.id}*"
            invalidate_cache(application_cache_pattern)
            
            # 지원자 목록 캐시도 무효화
            job_applicants_cache_pattern = f"api_cache:get_applicants_by_job:*job_post_id_{app.job_post_id}*"
            job_applicants_with_interview_cache_pattern = f"api_cache:get_applicants_with_interview:*job_post_id_{app.job_post_id}*"
            invalidate_cache(job_applicants_cache_pattern)
            invalidate_cache(job_applicants_with_interview_cache_pattern)
        
        print(f"Cache invalidated after updating resume {resume_id}")
    except Exception as e:
        print(f"Failed to invalidate cache: {e}")
    
    return db_resume


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db.delete(db_resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


# Resume Memo endpoints
@router.post("/{resume_id}/memos", response_model=ResumeMemoDetail)
def create_resume_memo(
    resume_id: int,
    memo: ResumeMemoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_memo = ResumeMemo(**memo.dict(), writer_id=current_user.id)
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo


@router.get("/{resume_id}/memos", response_model=List[ResumeMemoDetail])
def get_resume_memos(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    memos = db.query(ResumeMemo).filter(ResumeMemo.resume_id == resume_id).all()
    return memos


@router.put("/memos/{memo_id}", response_model=ResumeMemoDetail)
def update_resume_memo(
    memo_id: int,
    memo: ResumeMemoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_memo = db.query(ResumeMemo).filter(ResumeMemo.id == memo_id, ResumeMemo.writer_id == current_user.id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    
    for field, value in memo.dict(exclude_unset=True).items():
        setattr(db_memo, field, value)
    
    db.commit()
    db.refresh(db_memo)
    return db_memo 

# combine_resume_and_specs 함수는 comprehensive_analysis_tool에서 import하여 사용

@router.post("/applicant-comparison", response_model=ResumeAnalysisResponse)
async def generate_applicant_comparison_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """해당 공고 내 지원자들 간 비교 분석 생성 API"""
    start_time = time.time()
    
    try:
        # 저장된 결과가 있는지 먼저 확인
        if request.application_id:
            existing_result = db.query(AnalysisResult).filter(
                AnalysisResult.application_id == request.application_id,
                AnalysisResult.analysis_type == 'applicant_comparison'
            ).first()
            
            if existing_result:
                # 저장된 결과 반환
                return ResumeAnalysisResponse(
                    results={'applicant_comparison': existing_result.analysis_data},
                    errors={},
                    summary={'total_applicants_analyzed': existing_result.analysis_data.get('competition_analysis', {}).get('total_applicants_analyzed', 0)},
                    metadata={'tool_used': 'applicant_comparison', 'from_cache': True}
                )
        
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 및 공고 ID 수집
        job_info = ""
        job_post_id = None
        company_id = None
        
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application and application.job_post_id:
                job_post_id = application.job_post_id
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = f"직무: {job_post.title}\n설명: {job_post.job_details or '상세 설명 없음'}"
                    company_id = job_post.company_id if job_post.company_id else None
        
        if not job_post_id:
            raise HTTPException(status_code=400, detail="Job post information is required for applicant comparison")
        
        # 같은 공고의 다른 지원자들 데이터 수집
        from sqlalchemy.orm import joinedload
        from app.models.applicant_user import ApplicantUser
        
        other_applications = (
            db.query(Application)
            .options(
                joinedload(Application.user),
                joinedload(Application.resume).joinedload(Resume.specs)
            )
            .filter(Application.job_post_id == job_post_id)
            .filter(Application.id != request.application_id)
            .limit(5)
            .all()
        )
        
        other_applicants = []
        for app in other_applications:
            try:
                # ApplicantUser 확인
                is_applicant = db.query(ApplicantUser).filter(ApplicantUser.id == app.user_id).first()
                if not is_applicant or not app.user or not app.resume:
                    continue
                
                # 이력서 텍스트 생성
                app_resume_text = combine_resume_and_specs(app.resume, app.resume.specs)
                
                # 기본 정보 추출
                education = "정보 없음"
                major = "정보 없음"
                
                if app.resume.specs:
                    # 학력 정보 추출
                    edu_specs = [s for s in app.resume.specs if s.spec_type == "education" and s.spec_title == "institution"]
                    if edu_specs:
                        education = edu_specs[0].spec_description or "정보 없음"
                    
                    # 전공 정보 추출
                    degree_specs = [s for s in app.resume.specs if s.spec_type == "education" and s.spec_title == "degree"]
                    if degree_specs:
                        degree_raw = degree_specs[0].spec_description or ""
                        if degree_raw:
                            import re
                            m = re.match(r"(.+?)\((.+?)\)", degree_raw)
                            if m:
                                major = m.group(1).strip()
                            else:
                                major = degree_raw.strip()
                
                applicant_data = {
                    "application_id": app.id,
                    "name": app.user.name or f"지원자 {app.id}",
                    "education": education,
                    "major": major,
                    "status": app.status or "서류 검토 중",
                    "resume_text": app_resume_text,
                    "summary": app_resume_text[:300] + "..." if len(app_resume_text) > 300 else app_resume_text
                }
                other_applicants.append(applicant_data)
            except Exception as e:
                print(f"개별 지원자 처리 오류 (application_id: {app.id}): {str(e)}")
                continue
        
        # 새로운 지원자 비교 분석 도구 사용 (other_applicants 데이터를 직접 전달)
        from agent.tools.competitiveness_comparison_tool import generate_applicant_comparison_analysis_with_data
        
        # 새로운 함수가 없으면 기존 함수 사용
        try:
            result = generate_applicant_comparison_analysis_with_data(
                current_resume_text=resume_text,
                other_applicants=other_applicants,
                job_info=job_info,
                job_post_id=job_post_id
            )
        except AttributeError:
            # 기존 함수 사용
            from agent.tools.competitiveness_comparison_tool import generate_applicant_comparison_analysis
            result = generate_applicant_comparison_analysis(
                current_resume_text=resume_text,
                job_post_id=job_post_id,
                application_id=request.application_id,
                job_info=job_info,
                db=db,
                comparison_count=5
            )
        
        # 분석 결과를 DB에 저장
        if request.application_id:
            try:
                analysis_duration = time.time() - start_time
                db_result = AnalysisResult(
                    application_id=request.application_id,
                    resume_id=request.resume_id,
                    jobpost_id=job_post_id,
                    company_id=company_id,
                    analysis_type='applicant_comparison',
                    analysis_data=result,
                    analysis_version="1.0",
                    analysis_duration=analysis_duration
                )
                
                # 기존 결과가 있으면 업데이트
                existing_result = db.query(AnalysisResult).filter(
                    AnalysisResult.application_id == request.application_id,
                    AnalysisResult.analysis_type == 'applicant_comparison'
                ).first()
                
                if existing_result:
                    existing_result.analysis_data = result
                    existing_result.analysis_duration = analysis_duration
                    existing_result.updated_at = datetime.utcnow()
                else:
                    db.add(db_result)
                
                db.commit()
            except Exception as e:
                print(f"분석 결과 저장 실패: {str(e)}")
                db.rollback()
        
        # ResumeAnalysisResponse 형식에 맞게 변환
        return ResumeAnalysisResponse(
            results={'applicant_comparison': result},
            errors={},
            summary={'total_applicants_analyzed': result.get('competition_analysis', {}).get('total_applicants_analyzed', 0)},
            metadata={'tool_used': 'applicant_comparison', 'job_post_id': job_post_id}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detailed-analysis", response_model=ResumeAnalysisResponse)
async def generate_detailed_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """상세 분석 리포트 생성 API"""
    start_time = time.time()
    
    try:
        # 저장된 결과가 있는지 먼저 확인
        if request.application_id:
            existing_result = db.query(AnalysisResult).filter(
                AnalysisResult.application_id == request.application_id,
                AnalysisResult.analysis_type == 'detailed'
            ).first()
            
            if existing_result:
                # 저장된 결과 반환
                return ResumeAnalysisResponse(
                    results={'detailed': existing_result.analysis_data},
                    errors={},
                    summary={'analysis_completed': True},
                    metadata={'tool_used': 'detailed_analysis', 'from_cache': True}
                )
        
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집 (application_id가 있는 경우)
        job_info = ""
        jobpost_id = None
        company_id = None
        
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application and application.job_post_id:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = f"직무: {job_post.title}\n설명: {job_post.job_details or '상세 설명 없음'}"
                    jobpost_id = application.job_post_id
                    company_id = job_post.company_id if job_post.company_id else None
        
        # resume_orchestrator를 사용한 상세 분석
        from agent.agents.resume_orchestrator import analyze_resume_selective
        print(f"상세분석 시작 - resume_text 길이: {len(resume_text)}, job_info: {job_info[:100]}...")
        result = analyze_resume_selective(
            resume_text=resume_text,
            tools_to_run=['detailed'],
            job_info=job_info
        )
        print(f"상세분석 결과: {result}")
        
        # 분석 결과를 DB에 저장
        if request.application_id:
            try:
                analysis_duration = time.time() - start_time
                db_result = AnalysisResult(
                    application_id=request.application_id,
                    resume_id=request.resume_id,
                    jobpost_id=jobpost_id,
                    company_id=company_id,
                    analysis_type='detailed',
                    analysis_data=result,
                    analysis_version="1.0",
                    analysis_duration=analysis_duration
                )
                
                # 기존 결과가 있으면 업데이트
                existing_result = db.query(AnalysisResult).filter(
                    AnalysisResult.application_id == request.application_id,
                    AnalysisResult.analysis_type == 'detailed'
                ).first()
                
                if existing_result:
                    existing_result.analysis_data = result
                    existing_result.analysis_duration = analysis_duration
                    existing_result.updated_at = datetime.utcnow()
                else:
                    db.add(db_result)
                
                db.commit()
            except Exception as e:
                print(f"분석 결과 저장 실패: {str(e)}")
                db.rollback()
        
        # ResumeAnalysisResponse 형식에 맞게 변환
        return ResumeAnalysisResponse(
            results={'detailed': result},
            errors={},
            summary={'analysis_completed': True},
            metadata={'tool_used': 'detailed_analysis'}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/competitiveness-comparison", response_model=ResumeAnalysisResponse)
async def generate_competitiveness_comparison(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """경쟁력 비교 분석 생성 API"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집 (application_id가 있는 경우)
        job_info = ""
        job_post_id = None
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application and application.job_post_id:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = f"직무: {job_post.title}\n설명: {job_post.job_details or '상세 설명 없음'}"
                    job_post_id = application.job_post_id
        
        # 직접 competitiveness_comparison_tool 호출 (application_id 전달)
        from agent.tools.competitiveness_comparison_tool import generate_applicant_comparison_analysis
        result = generate_applicant_comparison_analysis(
            current_resume_text=resume_text,
            job_post_id=job_post_id,
            application_id=request.application_id,
            job_info=job_info,
            db=db,
            comparison_count=5
        )
        
        # ResumeAnalysisResponse 형식에 맞게 변환
        return ResumeAnalysisResponse(
            results={'competitiveness': result},
            errors={},
            summary={'competitiveness_grade': result.get('competition_analysis', {}).get('competitiveness_grade', 'N/A')},
            metadata={'tool_used': 'competitiveness_comparison'}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/comprehensive-analysis", response_model=ResumeAnalysisResponse)
async def generate_comprehensive_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """핵심 분석 리포트 생성 API"""
    start_time = time.time()
    
    try:
        # 저장된 결과가 있는지 먼저 확인
        if request.application_id:
            existing_result = db.query(AnalysisResult).filter(
                AnalysisResult.application_id == request.application_id,
                AnalysisResult.analysis_type == 'comprehensive'
            ).first()
            
            if existing_result:
                # 저장된 결과 반환
                return ResumeAnalysisResponse(
                    results={'comprehensive': existing_result.analysis_data},
                    errors={},
                    summary={'job_matching_score': existing_result.analysis_data.get('job_matching_score', 0.0)},
                    metadata={'tool_used': 'comprehensive_analysis', 'from_cache': True}
                )
        
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집 (application_id가 있는 경우)
        job_info = ""
        job_matching_info = ""
        jobpost_id = None
        company_id = None
        
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application and application.job_post_id:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = f"직무: {job_post.title}\n설명: {job_post.job_details or '상세 설명 없음'}"
                    job_matching_info = f"직무 매칭 정보: {job_post.title}"
                    jobpost_id = application.job_post_id
                    company_id = job_post.company_id if job_post.company_id else None
        
        # 포트폴리오 정보 수집 (임시로 빈 문자열)
        portfolio_info = ""
        
        # 핵심 분석 도구 호출
        from agent.tools.comprehensive_analysis_tool import generate_comprehensive_analysis_report
        analysis_result = generate_comprehensive_analysis_report(
            resume_text=resume_text,
            job_info=job_info,
            portfolio_info=portfolio_info,
            job_matching_info=job_matching_info
        )
        
        # 분석 결과를 DB에 저장
        if request.application_id:
            try:
                analysis_duration = time.time() - start_time
                db_result = AnalysisResult(
                    application_id=request.application_id,
                    resume_id=request.resume_id,
                    jobpost_id=jobpost_id,
                    company_id=company_id,
                    analysis_type='comprehensive',
                    analysis_data=analysis_result,
                    analysis_version="1.0",
                    analysis_duration=analysis_duration
                )
                
                # 기존 결과가 있으면 업데이트
                existing_result = db.query(AnalysisResult).filter(
                    AnalysisResult.application_id == request.application_id,
                    AnalysisResult.analysis_type == 'comprehensive'
                ).first()
                
                if existing_result:
                    existing_result.analysis_data = analysis_result
                    existing_result.analysis_duration = analysis_duration
                    existing_result.updated_at = datetime.utcnow()
                else:
                    db.add(db_result)
                
                db.commit()
            except Exception as e:
                print(f"분석 결과 저장 실패: {str(e)}")
                db.rollback()
        
        # ResumeAnalysisResponse 형식에 맞게 변환
        return ResumeAnalysisResponse(
            results={'comprehensive': analysis_result},
            errors={},
            summary={'job_matching_score': analysis_result.get('job_matching_score', 0.0)},
            metadata={'tool_used': 'comprehensive_analysis'}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/impact-points", response_model=ResumeAnalysisResponse)
async def generate_impact_points_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """임팩트 포인트 분석 생성 API"""
    start_time = time.time()
    
    try:
        # 저장된 결과가 있는지 먼저 확인
        if request.application_id:
            existing_result = db.query(AnalysisResult).filter(
                AnalysisResult.application_id == request.application_id,
                AnalysisResult.analysis_type == 'impact_points'
            ).first()
            
            if existing_result:
                # 저장된 결과 반환
                return ResumeAnalysisResponse(
                    results={'impact_points': existing_result.analysis_data},
                    errors={},
                    summary={'analysis_completed': True},
                    metadata={'tool_used': 'impact_points', 'from_cache': True}
                )
        
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집 (application_id가 있는 경우)
        job_info = ""
        jobpost_id = None
        company_id = None
        
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application and application.job_post_id:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = f"직무: {job_post.title}\n설명: {job_post.job_details or '상세 설명 없음'}"
                    jobpost_id = application.job_post_id
                    company_id = job_post.company_id if job_post.company_id else None
        
        # 임팩트 포인트 분석 도구 호출
        from agent.tools.impact_points_tool import ImpactPointsTool
        impact_tool = ImpactPointsTool()
        result = impact_tool.analyze_impact_points(resume_text=resume_text, job_info=job_info)
        
        # 분석 결과를 DB에 저장
        if request.application_id:
            try:
                analysis_duration = time.time() - start_time
                db_result = AnalysisResult(
                    application_id=request.application_id,
                    resume_id=request.resume_id,
                    jobpost_id=jobpost_id,
                    company_id=company_id,
                    analysis_type='impact_points',
                    analysis_data=result,
                    analysis_version="1.0",
                    analysis_duration=analysis_duration
                )
                
                # 기존 결과가 있으면 업데이트
                existing_result = db.query(AnalysisResult).filter(
                    AnalysisResult.application_id == request.application_id,
                    AnalysisResult.analysis_type == 'impact_points'
                ).first()
                
                if existing_result:
                    existing_result.analysis_data = result
                    existing_result.analysis_duration = analysis_duration
                    existing_result.updated_at = datetime.utcnow()
                else:
                    db.add(db_result)
                
                db.commit()
            except Exception as e:
                print(f"분석 결과 저장 실패: {str(e)}")
                db.rollback()
        
        # ResumeAnalysisResponse 형식에 맞게 변환
        return ResumeAnalysisResponse(
            results={'impact_points': result},
            errors={},
            summary={'analysis_completed': True},
            metadata={'tool_used': 'impact_points'}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 