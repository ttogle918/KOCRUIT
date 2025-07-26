from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.interview_question import InterviewQuestion, QuestionType
from app.models.job import JobPost
from app.models.resume import Resume, Spec
from app.services.interview_question_service import InterviewQuestionService
from app.schemas.interview_question import (
    InterviewQuestionCreate, 
    InterviewQuestionResponse, 
    InterviewQuestionBulkCreate
)
from pydantic import BaseModel

from app.api.v1.company_question_rag import generate_questions
from app.utils.llm_cache import redis_cache

import redis
import json

from app.schemas.interview_question import InterviewQuestionBulkCreate, InterviewQuestionCreate, InterviewQuestionResponse
from app.models.interview_question_log import InterviewQuestionLog, InterviewType
import tempfile
import os

redis_client = redis.Redis(host='redis', port=6379, db=0)

router = APIRouter()

# 통합 API용 스키마
class IntegratedQuestionRequest(BaseModel):
    resume_id: Optional[int] = None
    application_id: Optional[int] = None
    company_name: str = ""
    name: str = ""

class IntegratedQuestionResponse(BaseModel):
    questions: list[str]
    question_bundle: dict
    summary_info: dict

# 기존 API용 스키마 (하위 호환성을 위해 유지)
class CompanyQuestionRequest(BaseModel):
    company_name: str

class ProjectQuestionRequest(BaseModel):
    resume_id: int
    company_name: str = ""
    name: str = ""

class JobQuestionRequest(BaseModel):
    application_id: int
    company_name: str = ""

class CompanyQuestionResponse(BaseModel):
    questions: list[str]

class ProjectQuestionResponse(BaseModel):
    questions: list[str]
    question_bundle: dict
    portfolio_info: str

class JobQuestionResponse(BaseModel):
    questions: list[str]
    question_bundle: dict
    job_matching_info: str

# 새로운 스키마 추가
class ResumeAnalysisRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None

class ResumeAnalysisResponse(BaseModel):
    resume_summary: str
    key_projects: List[str]
    technical_skills: List[str]
    soft_skills: List[str]
    experience_highlights: List[str]
    potential_concerns: List[str]
    interview_focus_areas: List[str]
    portfolio_analysis: Optional[str] = None
    job_matching_score: Optional[float] = None
    job_matching_details: Optional[str] = None

class InterviewChecklistRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None

class InterviewChecklistResponse(BaseModel):
    pre_interview_checklist: List[str]
    during_interview_checklist: List[str]
    post_interview_checklist: List[str]
    red_flags_to_watch: List[str]
    green_flags_to_confirm: List[str]

# 새로운 분석 툴들을 위한 스키마 추가
class ResumeOrchestratorRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_id: Optional[int] = None
    jobpost_id: Optional[int] = None
    enable_tools: Optional[List[str]] = None  # ['highlight', 'comprehensive', 'detailed', 'competitiveness', 'keyword_matching']

class ResumeOrchestratorResponse(BaseModel):
    metadata: Dict[str, Any]
    results: Dict[str, Any]
    errors: Dict[str, Any]
    summary: Dict[str, Any]

class DetailedAnalysisRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None

class DetailedAnalysisResponse(BaseModel):
    core_competencies: Dict[str, Any]
    experience_analysis: Dict[str, Any]
    growth_potential: Dict[str, Any]
    problem_solving: Dict[str, Any]
    leadership_collaboration: Dict[str, Any]
    specialization: Dict[str, Any]
    improvement_areas: Dict[str, Any]
    overall_assessment: Dict[str, Any]

class CompetitivenessComparisonRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None

class CompetitivenessComparisonResponse(BaseModel):
    market_competitiveness: Dict[str, Any]
    strength_areas: Dict[str, Any]
    weakness_areas: Dict[str, Any]
    differentiation_factors: Dict[str, Any]
    competitive_analysis: Dict[str, Any]
    sustainability: Dict[str, Any]
    improvement_strategy: Dict[str, Any]
    hiring_recommendation: Dict[str, Any]

class KeywordMatchingRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None

class KeywordMatchingResponse(BaseModel):
    technical_skills_matching: Dict[str, Any]
    experience_matching: Dict[str, Any]
    qualification_matching: Dict[str, Any]
    soft_skills_matching: Dict[str, Any]
    keyword_gaps: Dict[str, Any]
    unexpected_strengths: Dict[str, Any]
    matching_summary: Dict[str, Any]
    improvement_roadmap: Dict[str, Any]

class StrengthsWeaknessesRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None

class StrengthsWeaknessesResponse(BaseModel):
    strengths: List[dict]
    weaknesses: List[dict]
    development_areas: List[str]
    competitive_advantages: List[str]

class InterviewGuidelineRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None

class InterviewGuidelineResponse(BaseModel):
    interview_approach: str
    key_questions_by_category: dict
    evaluation_criteria: List[dict]
    time_allocation: dict
    follow_up_questions: List[str]

class EvaluationCriteriaRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None
    interview_stage: Optional[str] = None
    save_to_db: bool = False  # DB 저장 여부 (기본값: False)

class EvaluationCriteriaResponse(BaseModel):
    suggested_criteria: List[dict]
    weight_recommendations: List[dict]
    evaluation_questions: List[str]
    scoring_guidelines: dict

# --- 공고 기반 Request/Response 모델 ---
class JobBasedChecklistRequest(BaseModel):
    job_post_id: int
    company_name: str

class JobBasedChecklistResponse(BaseModel):
    pre_interview_checklist: List[str]
    during_interview_checklist: List[str]
    post_interview_checklist: List[str]
    red_flags_to_watch: List[str]
    green_flags_to_confirm: List[str]

class JobBasedGuidelineRequest(BaseModel):
    job_post_id: int
    company_name: str

class JobBasedGuidelineResponse(BaseModel):
    interview_approach: str
    key_questions_by_category: Dict
    evaluation_criteria: List[Dict]
    time_allocation: Dict
    follow_up_questions: List[str]

class JobBasedCriteriaRequest(BaseModel):
    job_post_id: int
    company_name: str

class JobBasedCriteriaResponse(BaseModel):
    suggested_criteria: List[Dict]
    weight_recommendations: List[Dict]
    evaluation_questions: List[str]
    scoring_guidelines: Dict

class JobBasedStrengthsRequest(BaseModel):
    job_post_id: int
    company_name: str

class JobBasedStrengthsResponse(BaseModel):
    strengths: List[Dict]
    weaknesses: List[Dict]
    development_areas: List[str]
    competitive_advantages: List[str]

def combine_resume_and_specs(resume: Resume, specs: List[Spec]) -> str:
    """Resume와 Spec을 조합하여 포괄적인 resume_text 생성"""
    
    # 기본 이력서 정보
    resume_text = f"""
이력서 제목: {resume.title}

기본 내용:
{resume.content or "내용 없음"}
"""
    
    # Spec 타입별로 분류
    spec_categories = {}
    for spec in specs:
        spec_type = spec.spec_type
        if spec_type not in spec_categories:
            spec_categories[spec_type] = []
        spec_categories[spec_type].append(spec)
    
    # 프로젝트 정보 (우선순위 높음)
    if "project" in spec_categories or "프로젝트" in spec_categories:
        projects = spec_categories.get("project", []) + spec_categories.get("프로젝트", [])
        resume_text += "\n\n주요 프로젝트 경험:\n"
        for i, project in enumerate(projects, 1):
            resume_text += f"{i}. {project.spec_title}\n"
            if project.spec_description:
                resume_text += f"   {project.spec_description}\n"
    
    # 교육사항
    if "education" in spec_categories or "교육" in spec_categories:
        educations = spec_categories.get("education", []) + spec_categories.get("교육", [])
        resume_text += "\n\n교육사항:\n"
        for education in educations:
            resume_text += f"- {education.spec_title}\n"
            if education.spec_description:
                resume_text += f"  {education.spec_description}\n"
    
    # 자격증
    if "certificate" in spec_categories or "자격증" in spec_categories:
        certificates = spec_categories.get("certificate", []) + spec_categories.get("자격증", [])
        resume_text += "\n\n자격증:\n"
        for cert in certificates:
            resume_text += f"- {cert.spec_title}\n"
            if cert.spec_description:
                resume_text += f"  {cert.spec_description}\n"
    
    # 기술스택
    if "skill" in spec_categories or "기술" in spec_categories:
        skills = spec_categories.get("skill", []) + spec_categories.get("기술", [])
        resume_text += "\n\n기술 스택:\n"
        for skill in skills:
            resume_text += f"- {skill.spec_title}\n"
            if skill.spec_description:
                resume_text += f"  {skill.spec_description}\n"
    
    # 기타 스펙들
    other_specs = []
    for spec_type, specs_list in spec_categories.items():
        if spec_type not in ["project", "프로젝트", "education", "교육", "certificate", "자격증", "skill", "기술"]:
            other_specs.extend(specs_list)
    
    if other_specs:
        resume_text += "\n\n기타 경험:\n"
        for spec in other_specs:
            resume_text += f"- {spec.spec_title} ({spec.spec_type})\n"
            if spec.spec_description:
                resume_text += f"  {spec.spec_description}\n"
    
    return resume_text.strip()

def parse_job_post_data(job_post: JobPost) -> str:
    """JobPost 데이터를 파싱하여 직무 정보 텍스트 생성"""
    
    job_info = f"""
공고 제목: {job_post.title}
부서: {job_post.department or "미지정"}

자격요건:
{job_post.qualifications or "자격요건 정보 없음"}

직무 내용:
{job_post.job_details or "직무 내용 정보 없음"}

근무 조건:
{job_post.conditions or "근무 조건 정보 없음"}

채용 절차:
{job_post.procedures or "채용 절차 정보 없음"}

근무지: {job_post.location or "미지정"}
고용형태: {job_post.employment_type or "미지정"}
모집인원: {job_post.headcount or "미지정"}명
"""
    
    return job_info.strip()

def analyze_job_matching(resume_text: str, job_info: str) -> str:
    """이력서와 공고 정보를 분석하여 매칭 정보 생성"""
    
    # 간단한 키워드 매칭 분석
    matching_keywords = []
    
    # 공공기관 관련 키워드
    if "공공" in job_info or "기관" in job_info:
        if "공공" in resume_text or "기관" in resume_text or "정부" in resume_text:
            matching_keywords.append("공공기관 경험")
    
    # PM/PL 관련 키워드
    if "PM" in job_info or "PL" in job_info or "프로젝트관리" in job_info:
        if "PM" in resume_text or "PL" in resume_text or "프로젝트" in resume_text or "관리" in resume_text:
            matching_keywords.append("프로젝트 관리 경험")
    
    # IT/SI 관련 키워드
    if "IT" in job_info or "SI" in job_info or "개발" in job_info:
        if "IT" in resume_text or "SI" in resume_text or "개발" in resume_text or "프로그래밍" in resume_text:
            matching_keywords.append("IT/개발 경험")
    
    # 정보처리기사 관련
    if "정보처리기사" in job_info:
        if "정보처리기사" in resume_text or "기사" in resume_text:
            matching_keywords.append("정보처리기사 자격증")
    
    if matching_keywords:
        return f"매칭된 키워드: {', '.join(matching_keywords)}"
    else:
        return "직접적인 매칭 키워드가 발견되지 않았습니다."

@router.post("/", response_model=InterviewQuestionResponse)
def create_question(question: InterviewQuestionCreate, db: Session = Depends(get_db)):
    db_question = InterviewQuestion(**question.dict())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.get("/application/{application_id}", response_model=List[InterviewQuestionResponse])
@redis_cache(expire=300)  # 5분 캐시 (질문 조회)
def get_questions_by_application(application_id: int, db: Session = Depends(get_db)):
    from app.models.interview_question import InterviewQuestion
    return db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id).all()

@router.get("/application/{application_id}/by-type", response_model=InterviewQuestionResponse)
@redis_cache(expire=300)  # 5분 캐시 (질문 타입별 조회)
def get_questions_by_type(application_id: int, db: Session = Depends(get_db)):
    """지원서별 질문을 유형별로 분류하여 조회"""
    return InterviewQuestionService.get_questions_by_type(db, application_id)

@router.post("/bulk-create", response_model=List[InterviewQuestionResponse])
def create_questions_bulk(bulk_data: InterviewQuestionBulkCreate, db: Session = Depends(get_db)):
    """대량 질문 생성"""
    return InterviewQuestionService.create_questions_bulk(db, bulk_data)


@router.post("/integrated-questions", response_model=IntegratedQuestionResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_integrated_questions(request: IntegratedQuestionRequest, db: Session = Depends(get_db)):
    """통합 면접 질문 생성 API - 이력서, 공고, 회사 정보를 모두 활용"""


    cache_key = f"integrated_questions:{request.resume_id}:{request.application_id}:{request.company_name}:{request.name}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached.decode('utf-8'))

    try:
        resume_text = ""
        job_info = ""
        actual_company_name = request.company_name
        job_matching_info = ""
        portfolio_info = ""
        
        # 1. 이력서 정보 수집
        resume_summary = ""
        if request.resume_id:
            resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")
            
            specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
            resume_text = combine_resume_and_specs(resume, specs)
            
                    # 자기소개서 요약 생성
        from agent.agents.interview_question_node import generate_common_question_bundle, generate_resume_summary
        resume_summary_result = generate_resume_summary.invoke({"resume_text": resume_text})
        resume_summary = resume_summary_result.get("text", "")
        
        # 포트폴리오 정보 수집 (임시로 빈 문자열)
        portfolio_info = ""
        
        # 2. 공고 정보 수집
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if not application:
                raise HTTPException(status_code=404, detail="Application not found")
            
            job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
            if not job_post:
                raise HTTPException(status_code=404, detail="Job post not found")
            
            job_info = parse_job_post_data(job_post)
            actual_company_name = job_post.company.name if job_post.company else request.company_name
            
            # 직무 매칭 분석
            if resume_text:
                job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # 3. 통합 질문 생성
        from agent.agents.interview_question_node import generate_personal_questions, generate_job_question_bundle, generate_common_questions
        
        # 공통 질문 생성 (인성/동기 포함)
        common_questions = generate_common_questions(
            company_name=actual_company_name,
            job_info=job_info
        )
        
        # 개인별 맞춤형 질문 생성 (이력서 기반, 인성/동기 제외)
        personal_questions = {}
        if resume_text:
            personal_questions = generate_personal_questions(
                resume_text=resume_text,
                company_name=actual_company_name,
                portfolio_info=portfolio_info
            )
        
        # 직무 맞춤형 질문 생성 (공고 기반)
        job_questions = {}
        if job_info and resume_text:
            job_questions = generate_job_question_bundle(
                resume_text=resume_text,
                job_info=job_info,
                company_name=actual_company_name,
                job_matching_info=job_matching_info
            )
        
        # 4. 질문 통합 및 정리
        all_questions = []
        question_bundle = {}
        
        # 공통 질문들 추가 (인성/동기 포함)
        if common_questions:
            question_bundle.update(common_questions)
            all_questions.extend(common_questions.get("인성/동기", []))
            all_questions.extend(common_questions.get("회사 관련", []))
            all_questions.extend(common_questions.get("직무 이해", []))
            all_questions.extend(common_questions.get("상황 대처", []))
        
        # 개인별 질문들 추가 (인성/동기 제외)
        if personal_questions:
            question_bundle.update(personal_questions)
            all_questions.extend(personal_questions.get("프로젝트 경험", []))
            all_questions.extend(personal_questions.get("회사 관련", []))
            all_questions.extend(personal_questions.get("상황 대처", []))
        
        # 직무 맞춤형 질문들 추가
        if job_questions:
            question_bundle.update(job_questions)
            all_questions.extend(job_questions.get("직무 적합성", []))
            all_questions.extend(job_questions.get("기술 스택", []))
            all_questions.extend(job_questions.get("업무 이해도", []))
            all_questions.extend(job_questions.get("경력 활용", []))
        
        # 5. 요약 정보 생성
        summary_info = {
            "resume_used": bool(request.resume_id),
            "job_post_used": bool(request.application_id),
            "company_name": actual_company_name,
            "job_matching_info": job_matching_info,
            "portfolio_info": portfolio_info,
            "resume_summary": resume_summary
        }
        
        result = {
            "questions": all_questions,
            "question_bundle": question_bundle,
            "summary_info": summary_info
        }
        
        # DB에 질문 저장 (application_id가 있는 경우에만)
        if request.application_id:
            try:
                InterviewQuestionService.save_langgraph_questions(
                    db=db,
                    application_id=request.application_id,
                    questions_data=question_bundle
                )
            except Exception as e:
                # DB 저장 실패해도 API 응답은 계속 진행
                print(f"질문 DB 저장 실패: {str(e)}")
        
        redis_client.set(cache_key, json.dumps(result), ex=60*60*24)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resume-analysis", response_model=ResumeAnalysisResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_resume_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """이력서 분석 리포트 생성 API"""
    # 캐시 로직 완전히 제거!
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        # 직무 정보 수집 (application_id가 있는 경우)
        job_info = ""
        job_matching_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
                    job_matching_info = analyze_job_matching(resume_text, job_info)
        # 포트폴리오 정보 수집 (임시로 빈 문자열)
        portfolio_info = ""
        # LangGraph 기반 종합 분석 (항상 직접 수행)
        from agent.tools.comprehensive_analysis_tool import generate_comprehensive_analysis_report
        analysis_result = generate_comprehensive_analysis_report(
            resume_text=resume_text,
            job_info=job_info,
            portfolio_info=portfolio_info,
            job_matching_info=job_matching_info
        )
        
        # ResumeAnalysisResponse 형식에 맞게 변환
        return ResumeAnalysisResponse(
            resume_summary=analysis_result.get("resume_summary", ""),
            key_projects=analysis_result.get("key_projects", []),
            technical_skills=analysis_result.get("technical_skills", []),
            soft_skills=analysis_result.get("soft_skills", []),
            experience_highlights=analysis_result.get("experience_highlights", []),
            potential_concerns=analysis_result.get("potential_concerns", []),
            interview_focus_areas=analysis_result.get("interview_focus_areas", []),
            portfolio_analysis=analysis_result.get("portfolio_analysis"),
            job_matching_score=analysis_result.get("job_matching_score"),
            job_matching_details=analysis_result.get("job_matching_details")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interview-checklist", response_model=InterviewChecklistResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_interview_checklist(request: InterviewChecklistRequest, db: Session = Depends(get_db)):
    """면접 체크리스트 생성 API"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # LangGraph 기반 체크리스트 생성
        from agent.agents.interview_question_node import generate_interview_checklist
        checklist_result = generate_interview_checklist(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "회사"
        )
        
        return checklist_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/strengths-weaknesses", response_model=StrengthsWeaknessesResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def analyze_strengths_weaknesses(request: StrengthsWeaknessesRequest, db: Session = Depends(get_db)):
    """지원자 강점/약점 분석 API"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # LangGraph 기반 강점/약점 분석
        from agent.agents.interview_question_node import analyze_candidate_strengths_weaknesses
        analysis_result = analyze_candidate_strengths_weaknesses(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "회사"
        )
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interview-guideline", response_model=InterviewGuidelineResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_interview_guideline(request: InterviewGuidelineRequest, db: Session = Depends(get_db)):
    """면접 가이드라인 생성 API"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # LangGraph 기반 면접 가이드라인 생성
        from agent.agents.interview_question_node import generate_interview_guideline
        guideline_result = generate_interview_guideline(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "회사"
        )
        
        return guideline_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluation-criteria", response_model=EvaluationCriteriaResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def suggest_evaluation_criteria(request: EvaluationCriteriaRequest, db: Session = Depends(get_db)):
    """평가 기준 자동 제안 API (이력서 기반)"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # 면접 단계별 평가 기준 생성
        from agent.agents.interview_question_node import suggest_evaluation_criteria
        
        # 면접 단계별 프롬프트 조정
        interview_stage = getattr(request, 'interview_stage', 'practical')  # 기본값: 실무진
        
        if interview_stage == 'practical':
            # 실무진 면접: 기술적 역량 중심
            criteria_result = await suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사",
                focus_area="technical_skills"  # 기술적 역량 중심
            )
        elif interview_stage == 'executive':
            # 임원진 면접: 인성/리더십 중심
            criteria_result = await suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사",
                focus_area="leadership_potential"  # 리더십/인성 중심
            )
        else:
            # 기본: 종합적 평가
            criteria_result = await suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사"
            )
        
        # DB 저장 옵션이 활성화된 경우 저장
        if request.save_to_db:
            try:
                from app.services.evaluation_criteria_service import EvaluationCriteriaService
                from app.schemas.evaluation_criteria import EvaluationCriteriaCreate
                
                criteria_service = EvaluationCriteriaService(db)
                
                # LangGraph 결과를 스키마에 맞게 변환
                suggested_criteria = []
                for item in criteria_result.get("suggested_criteria", []):
                    if isinstance(item, dict):
                        suggested_criteria.append({
                            "criterion": item.get("criterion", ""),
                            "description": item.get("description", ""),
                            "max_score": item.get("max_score", 10)
                        })
                
                weight_recommendations = []
                for item in criteria_result.get("weight_recommendations", []):
                    if isinstance(item, dict):
                        weight_recommendations.append({
                            "criterion": item.get("criterion", ""),
                            "weight": float(item.get("weight", 0.0)),
                            "reason": item.get("reason", "")
                        })
                
                evaluation_questions = criteria_result.get("evaluation_questions", [])
                if not isinstance(evaluation_questions, list):
                    evaluation_questions = []
                
                scoring_guidelines = criteria_result.get("scoring_guidelines", {})
                if not isinstance(scoring_guidelines, dict):
                    scoring_guidelines = {}

                criteria_data = EvaluationCriteriaCreate(
                    job_post_id=None,
                    resume_id=request.resume_id,
                    application_id=request.application_id,
                    evaluation_type="resume_based",
                    company_name=request.company_name,
                    suggested_criteria=suggested_criteria,
                    weight_recommendations=weight_recommendations,
                    evaluation_questions=evaluation_questions,
                    scoring_guidelines=scoring_guidelines
                )
                
                # 기존 데이터 확인 및 저장/업데이트
                existing_criteria = criteria_service.get_evaluation_criteria_by_resume(
                    request.resume_id, 
                    request.application_id,
                    interview_stage
                )
                
                if existing_criteria:
                    criteria_service.update_evaluation_criteria_by_resume(
                        request.resume_id, 
                        criteria_data,
                        request.application_id,
                        interview_stage
                    )
                else:
                    criteria_service.create_evaluation_criteria(criteria_data)
                    
            except Exception as db_error:
                print(f"⚠️ DB 저장 중 오류 발생: {db_error}")
                # DB 저장 실패해도 LangGraph 결과는 반환
                pass
        
        return criteria_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/company-questions", response_model=CompanyQuestionResponse)
@redis_cache(expire=3600)  # 1시간 캐시 (회사 정보 기반)
async def generate_company_questions(request: CompanyQuestionRequest):
    """회사명 기반 면접 질문 생성 (인재상 + 뉴스 기반)"""
    # POST /api/v1/interview-questions/company-questions
    # Content-Type: application/json
    # {    "company_name": "삼성전자"     }
    # TODO: 산업 트렌드/경쟁사 비교
    # TODO: 기술 혁신/신사업
    # TODO: 회사 기본 정보 이해

    try:
        # LangGraph 기반 통합 질문 생성
        result = generate_questions(request.company_name)
        questions = result.get("text", [])
        
        if isinstance(questions, str):
            questions = questions.strip().split("\n")
        
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/application/{application_id}/practical-questions")
@redis_cache(expire=300)  # 5분 캐시 (실무진 질문 조회)
async def get_practical_interview_questions(application_id: int, db: Session = Depends(get_db)):
    """실무진 면접 질문 조회 (DB에서 기존 질문 가져오기)"""
    try:
        # application_id로 지원자 정보 조회
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # 이력서 기반 평가 기준에서 질문 가져오기
        resume_criteria = db.query(EvaluationCriteria).filter(
            EvaluationCriteria.resume_id == application.resume_id,
            EvaluationCriteria.evaluation_type == "resume_based",
            EvaluationCriteria.interview_stage == "practical"
        ).first()
        
        if resume_criteria and resume_criteria.evaluation_questions:
            questions = resume_criteria.evaluation_questions
        else:
            # 기존 질문이 없으면 기본 질문 반환
            questions = [
                "지원자의 주요 프로젝트 경험에 대해 설명해주세요.",
                "기술적 문제를 해결한 경험이 있다면 구체적으로 설명해주세요.",
                "팀 프로젝트에서 본인의 역할과 기여도는 어떻게 되었나요?",
                "최근 관심 있는 기술이나 트렌드가 있다면 무엇인가요?",
                "직무와 관련된 본인의 강점과 개선점은 무엇인가요?"
            ]
        
        return {
            "application_id": application_id,
            "resume_id": application.resume_id,
            "questions": questions,
            "source": "database" if resume_criteria else "default"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/project-questions", response_model=ProjectQuestionResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_project_questions(request: ProjectQuestionRequest, db: Session = Depends(get_db)):
    """자기소개서/이력서 기반 프로젝트 면접 질문 생성 (LangGraph 워크플로우 사용)"""
    # POST /api/v1/interview-questions/project-questions
    # Content-Type: application/json
    # {
    #   "resume_id": 1,
    #   "company_name": "네이버",
    #   "name": "홍길동"
    # }

    try:
        # Resume와 Spec 데이터 조회
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        
        # Resume + Spec 통합 텍스트 생성
        resume_text = combine_resume_and_specs(resume, specs)
        
        # LangGraph 워크플로우를 사용한 종합 질문 생성
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            company_name=request.company_name,
            applicant_name=request.name,
            interview_type="general"
        )
        
        # 결과에서 질문 추출
        questions = workflow_result.get("questions", [])
        question_bundle = workflow_result.get("question_bundle", {})
        portfolio_info = ""
        
        # 포트폴리오 정보 추출
        if "personal" in question_bundle and "자기소개서 요약" in question_bundle["personal"]:
            portfolio_info = question_bundle["personal"].get("자기소개서 요약", "")
        
        result = {
            "resume_id": request.resume_id,
            "company_name": request.company_name,
            "questions": questions,
            "question_bundle": question_bundle,
            "portfolio_info": portfolio_info
        }
        
        return ProjectQuestionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/common-questions", response_model=Dict[str, Any])
@redis_cache(expire=3600)  # 1시간 캐시 (공통 질문)
async def generate_common_questions_endpoint(
    company_name: str = "",
    job_post_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """모든 지원자에게 공통으로 적용할 수 있는 질문 생성 API"""
    try:
        job_info = ""
        if job_post_id:
            job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
            if job_post:
                job_info = parse_job_post_data(job_post)
        
        # 공통 질문 생성
        from agent.agents.interview_question_node import generate_common_questions
        common_questions = generate_common_questions(
            company_name=company_name,
            job_info=job_info
        )
        
        # 모든 질문을 하나의 리스트로 통합
        all_questions = []
        all_questions.extend(common_questions.get("인성/동기", []))
        all_questions.extend(common_questions.get("회사 관련", []))
        all_questions.extend(common_questions.get("직무 이해", []))
        all_questions.extend(common_questions.get("상황 대처", []))
        
        result = {
            "questions": all_questions,
            "question_bundle": common_questions,
            "company_name": company_name,
            "job_post_id": job_post_id
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/job-questions", response_model=JobQuestionResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_job_questions(request: JobQuestionRequest, db: Session = Depends(get_db)):
    """지원서 기반 직무 맞춤형 면접 질문 생성 (LangGraph 워크플로우 사용)"""
    # POST /api/v1/interview-questions/job-questions
    # Content-Type: application/json
    # {
    #   "application_id": 41,
    #   "company_name": "KOSA공공"
    # }

    try:
        # Application 데이터 조회
        application = db.query(Application).filter(Application.id == request.application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # JobPost 데이터 조회
        job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        
        # Resume 데이터 조회
        resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Spec 데이터 조회
        specs = db.query(Spec).filter(Spec.resume_id == application.resume_id).all()
        
        # Resume + Spec 통합 텍스트 생성
        resume_text = combine_resume_and_specs(resume, specs)
        
        # JobPost 정보 파싱
        job_info = parse_job_post_data(job_post)
        
        # 실제 회사명 가져오기
        actual_company_name = job_post.company.name if job_post.company else request.company_name
        
        # 직무 매칭 분석
        job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # LangGraph 워크플로우를 사용한 종합 질문 생성
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=actual_company_name,
            applicant_name=getattr(request, 'name', '') or '',
            interview_type="general",
            job_matching_info=job_matching_info
        )
        
        # 결과에서 질문 추출
        questions = workflow_result.get("questions", [])
        question_bundle = workflow_result.get("question_bundle", {})
        
        result = {
            "application_id": request.application_id,
            "company_name": actual_company_name,
            "questions": questions,
            "question_bundle": question_bundle,
            "job_matching_info": job_matching_info
        }
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/passed-applicants-questions", response_model=Dict[str, Any])
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_passed_applicants_questions(
    request: dict,
    db: Session = Depends(get_db)
):
    job_post_id = request.get("job_post_id")
    company_name = request.get("company_name", "회사")
    """서류 합격자들에 대한 개인별 면접 질문 일괄 생성"""
    # POST /api/v1/interview-questions/passed-applicants-questions
    # Content-Type: application/json
    # {
    #   "job_post_id": 17,
    #   "company_name": "KOSA공공"
    # }

    try:
        # 서류 합격자 조회 - applications.py의 함수를 직접 호출
        from app.api.v1.applications import get_passed_applicants
        passed_applicants_response = get_passed_applicants(job_post_id, db)
        passed_applicants = passed_applicants_response.get("passed_applicants", [])
        
        if not passed_applicants:
            return {
                "message": "서류 합격자가 없습니다.",
                "total_applicants": 0,
                "personal_questions": {}
            }
        
        # JobPost 데이터 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        
        # 채용공고 정보 파싱
        job_posting = parse_job_post_data(job_post)
        
        # 실제 회사명 가져오기
        actual_company_name = job_post.company.name if job_post.company else company_name
        
        # 각 합격자에 대한 개인별 질문 생성
        applicants_data = []
        
        for applicant in passed_applicants:
            # Resume 데이터 조회
            resume = db.query(Resume).filter(Resume.id == applicant["resume_id"]).first()
            if not resume:
                continue
            
            # Spec 데이터 조회
            specs = db.query(Spec).filter(Spec.resume_id == applicant["resume_id"]).all()
            
            # Resume + Spec 통합 텍스트 생성
            resume_text = combine_resume_and_specs(resume, specs)
            
            # 이력서 데이터 구성
            resume_data = {
                "personal_info": {
                    "name": applicant["name"],
                    "email": applicant["email"],
                    "phone": applicant.get("phone", ""),
                    "address": applicant.get("address", "")
                },
                "education": {
                    "university": applicant.get("education", ""),
                    "major": applicant.get("major", ""),
                    "degree": applicant.get("degree_type", ""),
                    "gpa": ""
                },
                "experience": {
                    "companies": [],
                    "position": "",
                    "duration": ""
                },
                "skills": {
                    "programming_languages": [],
                    "frameworks": [],
                    "databases": [],
                    "tools": []
                },
                "projects": [],
                "activities": [],
                "certificates": applicant.get("certificates", [])
            }
            
            # Spec 데이터에서 추가 정보 추출
            for spec in specs:
                if str(spec.spec_type) == "experience" and str(spec.spec_title) == "company":
                    resume_data["experience"]["companies"].append(spec.spec_description or "")
                elif str(spec.spec_type) == "experience" and str(spec.spec_title) == "position":
                    resume_data["experience"]["position"] = spec.spec_description or ""
                elif str(spec.spec_type) == "experience" and str(spec.spec_title) == "duration":
                    resume_data["experience"]["duration"] = spec.spec_description or ""
                elif str(spec.spec_type) == "skills" and str(spec.spec_title) == "name":
                    if "Java" in (spec.spec_description or ""):
                        resume_data["skills"]["programming_languages"].append("Java")
                    if "Python" in (spec.spec_description or ""):
                        resume_data["skills"]["programming_languages"].append("Python")
                    if "Spring" in (spec.spec_description or ""):
                        resume_data["skills"]["frameworks"].append("Spring")
                    if "React" in (spec.spec_description or ""):
                        resume_data["skills"]["frameworks"].append("React")
                elif str(spec.spec_type) == "projects" and str(spec.spec_title) == "name":
                    resume_data["projects"].append({
                        "name": spec.spec_description or "",
                        "description": ""
                    })
                elif str(spec.spec_type) == "activities" and str(spec.spec_title) == "name":
                    resume_data["activities"].append({
                        "name": spec.spec_description or "",
                        "description": ""
                    })
            
            applicants_data.append({
                "name": applicant["name"],
                "resume_data": resume_data,
                "resume_text": resume_text
            })
        
        # AI Agent를 통한 개인별 질문 생성
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
        from agent.tools.personal_question_tool import generate_batch_personal_questions
        
        # 일괄 질문 생성
        batch_questions = generate_batch_personal_questions(
            applicants_data=applicants_data,
            job_posting=job_posting,
            company_name=actual_company_name
        )
        
        result = {
            "message": "서류 합격자 개인별 질문 생성 완료",
            "job_post_id": job_post_id,
            "company_name": actual_company_name,
            "total_applicants": len(passed_applicants),
            "personal_questions": batch_questions.get("personal_questions", {})
        }
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analysis-questions", response_model=Dict[str, Any])
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_analysis_questions(request: IntegratedQuestionRequest, db: Session = Depends(get_db)):
    """
    다양한 직무 역량(실무, 문제해결, 커뮤니케이션, 성장 가능성 등) 평가 질문 통합 API
    """
    try:
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)

        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)

        from agent.agents.interview_question_node import generate_advanced_competency_questions

        competency_questions = generate_advanced_competency_questions(resume_text=resume_text, job_info=job_info)

        result = {"competency_questions": competency_questions}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 공고/직무/회사 기준의 실무진 공통 질문 생성 API
@router.post("/job-common-questions", response_model=Dict[str, Any])
@redis_cache(expire=3600)  # 1시간 캐시 (공통 질문)
async def generate_job_common_questions(
    job_post_id: int,
    company_name: str = "",
    db: Session = Depends(get_db)
):
    """
    공고/직무/회사 기준의 실무진 공통 질문 생성 API
    (지원자별이 아닌, 모든 지원자에게 적용할 수 있는 직무 중심 질문)
    """
    job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
    if not job_post:
        raise HTTPException(status_code=404, detail="Job post not found")
    job_info = parse_job_post_data(job_post)
    from agent.agents.interview_question_node import generate_job_question_bundle
    # resume_text 없이(공통 질문)
    question_bundle = await generate_job_question_bundle(
        resume_text="",
        job_info=job_info,
        company_name=company_name,
        job_matching_info=""
    )
    result = {"question_bundle": question_bundle}
    return result

# --- 공고 기반 체크리스트 ---
@router.post("/interview-checklist/job-based", response_model=JobBasedChecklistResponse)
@redis_cache(expire=3600)  # 1시간 캐시 (공고 기반)
async def generate_job_based_checklist(request: JobBasedChecklistRequest, db: Session = Depends(get_db)):
    try:
        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        job_info = parse_job_post_data(job_post)
        from agent.agents.interview_question_node import generate_interview_checklist
        checklist_result = await generate_interview_checklist(
            resume_text="",
            job_info=job_info,
            company_name=request.company_name or ""
        )
        return checklist_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 공고 기반 강점/약점 ---
@router.post("/strengths-weaknesses/job-based", response_model=JobBasedStrengthsResponse)
@redis_cache(expire=3600)  # 1시간 캐시 (공고 기반)
async def analyze_job_based_strengths_weaknesses(request: JobBasedStrengthsRequest, db: Session = Depends(get_db)):
    try:
        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        job_info = parse_job_post_data(job_post)
        from agent.agents.interview_question_node import analyze_candidate_strengths_weaknesses
        analysis_result = await analyze_candidate_strengths_weaknesses(
            resume_text="",
            job_info=job_info,
            company_name=request.company_name or ""
        )
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 공고 기반 가이드라인 ---
@router.post("/interview-guideline/job-based", response_model=JobBasedGuidelineResponse)
@redis_cache(expire=3600)  # 1시간 캐시 (공고 기반)
async def generate_job_based_guideline(request: JobBasedGuidelineRequest, db: Session = Depends(get_db)):
    try:
        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        job_info = parse_job_post_data(job_post)
        from agent.agents.interview_question_node import generate_interview_guideline
        guideline_result = generate_interview_guideline(
            resume_text="",
            job_info=job_info,
            company_name=request.company_name or ""
        )
        return guideline_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 공고 기반 평가 기준 (중복 제거) ---

# === 임원면접 질문 생성 API ===
class ExecutiveInterviewRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None

class ExecutiveInterviewResponse(BaseModel):
    questions: str
    interview_type: str = "executive"

# === AI 면접 질문 생성 API ===
class AiInterviewRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None

class AiInterviewResponse(BaseModel):
    questions: str
    interview_type: str = "ai"

class AiInterviewSaveRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None
    save_to_db: bool = True  # DB에 저장할지 여부

class AiInterviewSaveResponse(BaseModel):
    questions: str
    interview_type: str = "ai"
    saved_questions_count: int
    message: str

@router.post("/ai-interview", response_model=AiInterviewResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_ai_interview_questions(request: AiInterviewRequest, db: Session = Depends(get_db)):
    """AI 면접 질문 생성 (LangGraph 워크플로우 사용)"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # LangGraph 워크플로우를 사용한 AI 면접 질문 생성
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "회사",
            applicant_name=request.name or "",
            interview_type="ai"
        )
        
        # 결과에서 질문 추출
        questions = workflow_result.get("questions", [])
        question_text = "\n".join(questions) if questions else "질문을 생성할 수 없습니다."
        
        return {
            "questions": question_text,
            "interview_type": "ai"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-interview-save", response_model=AiInterviewSaveResponse)
async def generate_and_save_ai_interview_questions(request: AiInterviewSaveRequest, db: Session = Depends(get_db)):
    """AI 면접 질문 생성 및 DB 저장"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # AI 면접 질문 생성 (fallback 사용)
        try:
            # LangGraph 워크플로우를 사용한 AI 면접 질문 생성
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
            from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
            
            # 워크플로우 실행
            workflow_result = generate_comprehensive_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사",
                applicant_name=request.name or "",
                interview_type="ai"
            )
            
            # 결과에서 질문 추출
            generated_questions = workflow_result.get("generated_questions", {})
            ai_questions = generated_questions.get("ai", {})
            
            # 질문을 텍스트로 변환
            all_questions = []
            for category, questions in ai_questions.items():
                if isinstance(questions, list):
                    all_questions.extend(questions)
                elif isinstance(questions, dict) and "questions" in questions:
                    all_questions.extend(questions["questions"])
            
        except Exception as e:
            print(f"AI 면접 질문 생성 실패, fallback 사용: {e}")
            # Fallback: 랜덤 기본 질문 사용
            from app.data.general_interview_questions import get_random_general_questions
            
            # 7개의 랜덤 일반 질문 선택
            random_questions = get_random_general_questions(7)
            all_questions = [q["question"] for q in random_questions]
            
            # 추가로 3개의 기본 질문 추가 (총 10개)
            additional_questions = [
                "자기소개를 해주세요.",
                "이 직무에 지원한 이유는 무엇인가요?",
                "본인의 강점과 약점은 무엇인가요?"
            ]
            all_questions.extend(additional_questions)
        
        question_text = "\n".join(all_questions) if all_questions else "질문을 생성할 수 없습니다."
        
        # DB에 저장
        saved_count = 0
        if request.save_to_db and all_questions:
            from app.models.interview_question import InterviewQuestion, QuestionType
            
            # job_post_id 찾기
            job_post_id = None
            if request.application_id:
                application = db.query(Application).filter(Application.id == request.application_id).first()
                if application:
                    job_post_id = application.job_post_id
            
            if job_post_id:
                # 기존 AI 면접 질문 삭제 (job_post_id 기반, 중복 방지)
                db.query(InterviewQuestion).filter(
                    InterviewQuestion.job_post_id == job_post_id,
                    InterviewQuestion.type == QuestionType.AI_INTERVIEW
                ).delete()
                
                # 새로운 질문들 저장 (job_post_id 기반, application_id는 NULL)
                for i, question in enumerate(all_questions):
                    # 질문 카테고리 결정
                    category = "common"
                    if i < 3:
                        category = "common"
                    elif i < 6:
                        category = "personal"
                    elif i < 8:
                        category = "company"
                    else:
                        category = "job"
                    
                    # DB에 저장 (AI 면접은 job_post_id 기반, application_id는 NULL)
                    interview_question = InterviewQuestion(
                        application_id=None,  # AI 면접은 공고별 공유
                        job_post_id=job_post_id,
                        type=QuestionType.AI_INTERVIEW,
                        question_text=question,
                        category=category,
                        difficulty="medium"  # AI 면접은 기본적으로 medium
                    )
                    db.add(interview_question)
                    saved_count += 1
                
                db.commit()
            
            # 캐시 무효화
            try:
                from app.core.cache import invalidate_cache
                # 관련 캐시 키들 무효화
                cache_patterns_to_clear = [
                    f"cache:applications:job:{request.application_id}:*",
                    f"cache:interview-questions:application:{request.application_id}:*",
                    f"cache:interview-questions:job:{request.application_id}:*"
                ]
                
                for cache_pattern in cache_patterns_to_clear:
                    try:
                        invalidate_cache(cache_pattern)
                        print(f"캐시 무효화 완료: {cache_pattern}")
                    except Exception as cache_error:
                        print(f"캐시 무효화 실패: {cache_pattern} - {cache_error}")
            except Exception as cache_error:
                print(f"캐시 무효화 중 오류: {cache_error}")
        
        return {
            "questions": question_text,
            "interview_type": "ai",
            "saved_questions_count": saved_count,
            "message": f"AI 면접 질문 {saved_count}개가 성공적으로 저장되었습니다." if saved_count > 0 else "질문이 저장되지 않았습니다."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/application/{application_id}/ai-questions")
@redis_cache(expire=300)  # 5분 캐시 (AI 질문 조회)
def get_ai_interview_questions(application_id: int, db: Session = Depends(get_db)):
    """특정 지원자의 AI 면접 질문 조회 (job_post_id 기반)"""
    try:
        from app.models.interview_question import InterviewQuestion, QuestionType
        
        # 지원자의 job_post_id 찾기
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # job_post_id 기반으로 AI 면접 질문 조회
        questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == application.job_post_id,
            InterviewQuestion.type == QuestionType.AI_INTERVIEW
        ).order_by(InterviewQuestion.category, InterviewQuestion.id).all()
        
        # 카테고리별로 그룹화
        grouped_questions = {}
        for question in questions:
            category = question.category or "common"
            if category not in grouped_questions:
                grouped_questions[category] = []
            grouped_questions[category].append({
                "id": question.id,
                "question_text": question.question_text,
                "type": question.type.value,
                "category": question.category,
                "difficulty": question.difficulty,
                "created_at": question.created_at
            })
        
        return {
            "application_id": application_id,
            "job_post_id": application.job_post_id,
            "interview_stage": "ai",
            "questions": grouped_questions,
            "total_count": len(questions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/job/{job_post_id}/ai-questions")
@redis_cache(expire=300)  # 5분 캐시 (AI 질문 조회)
def get_ai_interview_questions_by_job(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 AI 면접 질문 조회 (공통 + 직무별 + 게임)"""
    try:
        from app.models.interview_question import InterviewQuestion, QuestionType
        from app.models.job import JobPost
        
        # 공고 정보 조회
        job = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job post not found")
        
        # 1. 직무별 질문 조회 (job_post_id 기반)
        job_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job_post_id,
            InterviewQuestion.type == QuestionType.AI_INTERVIEW,
            InterviewQuestion.category == "job_specific"
        ).order_by(InterviewQuestion.id).all()
        
        # 2. 공통 질문 조회 (job_post_id 기반으로 변경)
        common_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job_post_id,
            InterviewQuestion.type == QuestionType.AI_INTERVIEW,
            InterviewQuestion.category == "common"
        ).order_by(InterviewQuestion.id).all()
        
        # 3. 게임 테스트 조회 (job_post_id 기반으로 변경)
        game_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job_post_id,
            InterviewQuestion.type == QuestionType.AI_INTERVIEW,
            InterviewQuestion.category == "game_test"
        ).order_by(InterviewQuestion.id).all()
        
        # 카테고리별로 그룹화
        grouped_questions = {
            "common": [
                {
                    "id": q.id,
                    "question_text": q.question_text,
                    "type": q.type.value,
                    "category": q.category,
                    "difficulty": q.difficulty,
                    "created_at": q.created_at
                } for q in common_questions
            ],
            "job_specific": [
                {
                    "id": q.id,
                    "question_text": q.question_text,
                    "type": q.type.value,
                    "category": q.category,
                    "difficulty": q.difficulty,
                    "created_at": q.created_at
                } for q in job_questions
            ],
            "game_test": [
                {
                    "id": q.id,
                    "question_text": q.question_text,
                    "type": q.type.value,
                    "category": q.category,
                    "difficulty": q.difficulty,
                    "created_at": q.created_at
                } for q in game_questions
            ]
        }
        
        total_count = len(common_questions) + len(job_questions) + len(game_questions)
        
        return {
            "job_post_id": job_post_id,
            "company_id": job.company_id if job else None,
            "interview_stage": "ai",
            "questions": grouped_questions,
            "total_count": total_count,
            "breakdown": {
                "common": len(common_questions),
                "job_specific": len(job_questions),
                "game_test": len(game_questions)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/job/{job_post_id}/common-questions")
@redis_cache(expire=300)  # 5분 캐시 (공통 질문 조회)
def get_common_questions_for_job_post(
    job_post_id: int,
    db: Session = Depends(get_db)
):
    """공고별 공통 질문 조회"""
    try:
        # 해당 공고의 첫 번째 지원자에게 생성된 공통 질문 조회
        first_application = db.query(Application).filter(
            Application.job_post_id == job_post_id,
            Application.document_status == DocumentStatus.PASSED.value
        ).first()
        
        if not first_application:
            return {"common_questions": []}
        
        common_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.application_id == first_application.id,
            InterviewQuestion.type == QuestionType.COMMON
        ).all()
        
        return {
            "common_questions": [
                {
                    "id": q.id,
                    "question_text": q.question_text,
                    "category": q.category,
                    "difficulty": q.difficulty,
                    "created_at": q.created_at.isoformat() if q.created_at else None
                }
                for q in common_questions
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공통 질문 조회 실패: {str(e)}")

@router.get("/application/{application_id}/questions")
@redis_cache(expire=300)  # 5분 캐시 (질문 조회)
def get_questions_for_application(
    application_id: int,
    question_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """지원자별 면접 질문 조회"""
    try:
        # 지원자 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다.")
        
        # 질문 조회
        query = db.query(InterviewQuestion).filter(
            InterviewQuestion.application_id == application_id
        )
        
        if question_type:
            query = query.filter(InterviewQuestion.type == QuestionType(question_type))
        
        questions = query.all()
        
        # 타입별로 그룹화
        grouped_questions = {}
        for question in questions:
            question_type_key = question.type.value
            if question_type_key not in grouped_questions:
                grouped_questions[question_type_key] = []
            
            grouped_questions[question_type_key].append({
                "id": question.id,
                "question_text": question.question_text,
                "category": question.category,
                "difficulty": question.difficulty,
                "created_at": question.created_at.isoformat() if question.created_at else None
            })
        
        return {
            "application_id": application_id,
            "questions": grouped_questions,
            "total_count": len(questions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"질문 조회 실패: {str(e)}")

@router.post("/job/{job_post_id}/generate-common-questions")
def generate_common_questions_for_job_post(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """공고별 공통 질문 수동 생성"""
    try:
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
        
        company_name = job_post.company.name if job_post.company else ""
        job_info = parse_job_post_data(job_post)
        
        # 공통 질문 생성
        questions = InterviewQuestionService.generate_common_questions_for_job_post(
            db=db,
            job_post_id=job_post_id,
            company_name=company_name,
            job_info=job_info
        )
        
        return {
            "message": f"공통 질문 생성 완료: {len(questions)}개",
            "questions_count": len(questions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공통 질문 생성 실패: {str(e)}")

@router.post("/application/{application_id}/generate-individual-questions")
def generate_individual_questions_for_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지원자별 개별 질문 수동 생성"""
    try:
        # 지원자 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다.")
        
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
        
        company_name = job_post.company.name if job_post.company else ""
        job_info = parse_job_post_data(job_post)
        
        # 개별 질문 생성
        questions = InterviewQuestionService.generate_individual_questions_for_applicant(
            db=db,
            application_id=application_id,
            job_info=job_info,
            company_name=company_name
        )
        
        return {
            "message": f"개별 질문 생성 완료: {len(questions)}개",
            "questions_count": len(questions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"개별 질문 생성 실패: {str(e)}")

@router.get("/job/{job_post_id}/questions-status")
@redis_cache(expire=60)  # 1분 캐시 (상태 조회)
def get_questions_generation_status(
    job_post_id: int,
    db: Session = Depends(get_db)
):
    """공고별 질문 생성 상태 조회"""
    try:
        # 해당 공고의 지원자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == job_post_id,
            Application.document_status == DocumentStatus.PASSED.value
        ).all()
        
        if not applications:
            return {
                "job_post_id": job_post_id,
                "total_applications": 0,
                "common_questions_generated": False,
                "individual_questions_generated": 0,
                "total_questions": 0
            }
        
        # 공통 질문 생성 여부 확인
        first_app = applications[0]
        common_questions_count = db.query(InterviewQuestion).filter(
            InterviewQuestion.application_id == first_app.id,
            InterviewQuestion.type == QuestionType.COMMON
        ).count()
        
        # 개별 질문 생성된 지원자 수 확인
        individual_questions_count = 0
        total_questions = 0
        
        for app in applications:
            app_questions = db.query(InterviewQuestion).filter(
                InterviewQuestion.application_id == app.id,
                InterviewQuestion.type != QuestionType.COMMON
            ).count()
            
            if app_questions > 0:
                individual_questions_count += 1
                total_questions += app_questions
        
        return {
            "job_post_id": job_post_id,
            "total_applications": len(applications),
            "common_questions_generated": common_questions_count > 0,
            "common_questions_count": common_questions_count,
            "individual_questions_generated": individual_questions_count,
            "total_questions": total_questions + common_questions_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"질문 상태 조회 실패: {str(e)}")

# AI 도구 통합 API 엔드포인트 추가
class AiToolsRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    company_name: Optional[str] = None
    name: Optional[str] = None
    interview_stage: Optional[str] = None
    evaluator_type: Optional[str] = None

class AiToolsResponse(BaseModel):
    evaluation_tools: dict
    questions: Optional[str] = None

@router.post("/ai-tools", response_model=AiToolsResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_ai_tools(request: AiToolsRequest, db: Session = Depends(get_db)):
    """AI 면접을 위한 통합 도구 생성 (체크리스트, 강점/약점, 가이드라인, 평가 기준)"""
    try:
        # 이력서 정보 조회
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="이력서를 찾을 수 없습니다.")
        
        # Spec 정보 조회
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        
        # 통합 이력서 텍스트 생성
        resume_text = combine_resume_and_specs(resume, specs)
        
        # AI 면접 도구 생성 프롬프트
        ai_tools_prompt = f"""
다음 지원자의 이력서를 바탕으로 AI 면접을 위한 종합적인 평가 도구를 생성해주세요.

지원자 정보:
- 이름: {request.name or "알 수 없음"}
- 회사: {request.company_name or "알 수 없음"}
- 면접 단계: {request.interview_stage or "AI 면접"}

이력서 내용:
{resume_text}

다음 4가지 도구를 JSON 형식으로 생성해주세요:

1. 면접 체크리스트 (pre_interview_checklist, during_interview_checklist, post_interview_checklist, red_flags_to_watch, green_flags_to_confirm)
2. 강점/약점 분석 (strengths, weaknesses, development_areas, competitive_advantages)
3. 면접 가이드라인 (interview_approach, key_questions_by_category, evaluation_criteria, time_allocation, follow_up_questions)
4. 평가 기준 (suggested_criteria, weight_recommendations, evaluation_questions, scoring_guidelines)

응답 형식:
{{
    "evaluation_tools": {{
        "checklist": {{
            "pre_interview_checklist": ["항목1", "항목2"],
            "during_interview_checklist": ["항목1", "항목2"],
            "post_interview_checklist": ["항목1", "항목2"],
            "red_flags_to_watch": ["주의사항1", "주의사항2"],
            "green_flags_to_confirm": ["긍정신호1", "긍정신호2"]
        }},
        "strengths_weaknesses": {{
            "strengths": [{{"area": "기술역량", "description": "설명", "evidence": "근거"}}],
            "weaknesses": [{{"area": "경험부족", "description": "설명", "suggestion": "개선방안"}}],
            "development_areas": ["개발영역1", "개발영역2"],
            "competitive_advantages": ["경쟁우위1", "경쟁우위2"]
        }},
        "guideline": {{
            "interview_approach": "면접 접근 방식",
            "key_questions_by_category": {{
                "기술역량": ["질문1", "질문2"],
                "프로젝트경험": ["질문1", "질문2"]
            }},
            "evaluation_criteria": [{{"criterion": "기준", "description": "설명", "weight": 0.3}}],
            "time_allocation": {{"기술질문": 0.4, "경험질문": 0.3, "소프트스킬": 0.3}},
            "follow_up_questions": ["후속질문1", "후속질문2"]
        }},
        "evaluation_criteria": {{
            "suggested_criteria": [{{"criterion": "기준", "description": "설명", "weight": 0.3}}],
            "weight_recommendations": [{{"category": "카테고리", "weight": 0.3, "reason": "이유"}}],
            "evaluation_questions": ["평가질문1", "평가질문2"],
            "scoring_guidelines": {{"A": "90-100점", "B": "80-89점", "C": "70-79점", "D": "60-69점", "F": "60점 미만"}}
        }}
    }}
}}
"""
        
        # OpenAI API 호출
        import openai
        import os
        api_key = os.getenv("OPENAI_API_KEY")  # 환경변수에서 가져오기
        client = openai.OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": ai_tools_prompt}],
            temperature=0.7,
            max_tokens=3000
        )
        
        # 응답 파싱
        try:
            content = response.choices[0].message.content.strip()
            print(f"OpenAI 응답: {content}")
            
            # JSON 블록 추출 시도
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                if json_end != -1:
                    content = content[json_start:json_end].strip()
            
            tools_data = json.loads(content)
            return AiToolsResponse(
                evaluation_tools=tools_data.get("evaluation_tools", {}),
                questions=None
            )
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 오류: {e}")
            print(f"응답 내용: {response.choices[0].message.content}")
            # 기본 구조 반환
            return AiToolsResponse(
                evaluation_tools={
                    "checklist": {
                        "pre_interview_checklist": ["이력서 검토", "기술 스택 확인"],
                        "during_interview_checklist": ["기술 질문", "경험 확인"],
                        "post_interview_checklist": ["평가 기록", "결과 정리"],
                        "red_flags_to_watch": ["기술 부족", "경험 부족"],
                        "green_flags_to_confirm": ["기술 우수", "경험 풍부"]
                    },
                    "strengths_weaknesses": {
                        "strengths": [{"area": "기술역량", "description": "기술 스택이 다양함", "evidence": "이력서 기반"}],
                        "weaknesses": [{"area": "경험부족", "description": "실무 경험 부족", "suggestion": "프로젝트 경험 확대"}],
                        "development_areas": ["실무 경험", "팀워크"],
                        "competitive_advantages": ["기술 다양성", "학습 능력"]
                    },
                    "guideline": {
                        "interview_approach": "기술 중심 면접",
                        "key_questions_by_category": {
                            "기술역량": ["주요 기술 스택은?", "프로젝트에서 어떻게 활용했나?"],
                            "프로젝트경험": ["가장 어려웠던 프로젝트는?", "팀에서의 역할은?"]
                        },
                        "evaluation_criteria": [{"criterion": "기술역량", "description": "기술 스택 숙련도", "weight": 0.4}],
                        "time_allocation": {"기술질문": 0.5, "경험질문": 0.3, "소프트스킬": 0.2},
                        "follow_up_questions": ["구체적인 기술 활용 사례는?", "문제 해결 과정은?"]
                    },
                    "evaluation_criteria": {
                        "suggested_criteria": [{"criterion": "기술역량", "description": "기술 스택 숙련도", "weight": 0.4}],
                        "weight_recommendations": [{"category": "기술역량", "weight": 0.4, "reason": "핵심 역량"}],
                        "evaluation_questions": ["기술 스택 숙련도는?", "프로젝트 경험은?"],
                        "scoring_guidelines": {"A": "90-100점", "B": "80-89점", "C": "70-79점", "D": "60-69점", "F": "60점 미만"}
                    }
                }
            )
        
    except Exception as e:
        print(f"AI 도구 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=f"AI 도구 생성 실패: {str(e)}")

@router.get("/application/{application_id}/logs")
@redis_cache(expire=300)  # 5분 캐시 (로그 조회)
def get_interview_question_logs_by_application(
    application_id: int, 
    interview_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """특정 지원자의 면접 질문+답변(텍스트/오디오/비디오) 로그 리스트 반환 (DB에서 읽기만)"""
    query = db.query(InterviewQuestionLog).filter(InterviewQuestionLog.application_id == application_id)
    if interview_type:
        query = query.filter(InterviewQuestionLog.interview_type == interview_type)
    logs = query.order_by(InterviewQuestionLog.created_at).all()

    result = []
    for log in logs:
        item = {
            "question_id": log.question_id,
            "interview_type": log.interview_type.value if log.interview_type else "AI_INTERVIEW",
            "question_text": log.question_text,
            "answer_text": log.answer_text,
            "answer_audio_url": log.answer_audio_url,
            "answer_video_url": log.answer_video_url,
            "answer_text_transcribed": log.answer_text_transcribed,
            "emotion": log.emotion,
            "attitude": log.attitude,
            "answer_score": log.answer_score,
            "answer_feedback": log.answer_feedback,
            "created_at": log.created_at,
            "updated_at": log.updated_at
        }
        result.append(item)
    return result

@router.get("/application/{application_id}/logs/statistics")
@redis_cache(expire=300)  # 5분 캐시 (통계 조회)
def get_interview_logs_statistics(application_id: int, db: Session = Depends(get_db)):
    """특정 지원자의 면접 유형별 통계 반환"""
    # 면접 유형별 개수 조회
    stats = db.query(
        InterviewQuestionLog.interview_type,
        func.count(InterviewQuestionLog.id).label('count')
    ).filter(
        InterviewQuestionLog.application_id == application_id
    ).group_by(
        InterviewQuestionLog.interview_type
    ).all()
    
    # 전체 통계
    total_count = db.query(InterviewQuestionLog).filter(
        InterviewQuestionLog.application_id == application_id
    ).count()
    
    return {
        "total_interviews": total_count,
        "by_type": [
            {
                "interview_type": stat.interview_type.value if stat.interview_type else "AI_INTERVIEW",
                "count": stat.count
            }
            for stat in stats
        ]
    }

@router.post("/application/{application_id}/evaluate-audio")
async def evaluate_audio(
    application_id: int,
    question_id: int,  # 질문 ID도 프론트에서 같이 보내야 DB 저장 가능
    question_text: str,
    audio_file: UploadFile = File(...)
):
    """
    오디오 파일을 받아 agent 컨테이너에 전달하여 실시간 분석 후 결과 반환
    """
    import httpx
    
    # 1. 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(await audio_file.read())
        tmp_path = tmp.name

    try:
        # 2. agent 컨테이너에 HTTP 요청으로 분석 요청
        async with httpx.AsyncClient() as client:
            with open(tmp_path, "rb") as f:
                files = {"audio_file": f}
                data = {
                    "application_id": application_id,
                    "question_id": question_id,
                    "question_text": question_text
                }
                response = await client.post(
                    "http://agent:8001/evaluate-audio",
                    files=files,
                    data=data
                )
                result = response.json()
        
        # 3. DB 저장
        db = next(get_db())  # Depends 사용 불가 시 직접 호출
        log = db.query(InterviewQuestionLog).filter(
            InterviewQuestionLog.application_id == application_id,
            InterviewQuestionLog.question_id == question_id
        ).first()
        if log:
            log.answer_text_transcribed = result.get("answer_text_transcribed")
            log.emotion = result.get("emotion")
            log.attitude = result.get("attitude")
            log.answer_score = result.get("answer_score")
            log.answer_feedback = result.get("answer_feedback")
            db.commit()
        
        return result
    finally:
        # 임시 파일 삭제
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# --- 공고 기반 평가 기준 ---
@router.post("/evaluation-criteria/job-based", response_model=JobBasedCriteriaResponse)
async def create_job_based_evaluation_criteria(request: JobBasedCriteriaRequest, db: Session = Depends(get_db)):
    """공고 기반 평가항목 생성 및 DB 저장"""
    try:
        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        
        job_info = parse_job_post_data(job_post)
        
        # LangGraph를 통한 평가항목 생성
        from agent.agents.interview_question_node import suggest_evaluation_criteria
        criteria_result = suggest_evaluation_criteria(
            resume_text="",
            job_info=job_info,
            company_name=request.company_name or ""
        )
        
        # DB 저장은 임시로 제거 (에러 디버깅 중)
        print(f"🔍 LangGraph 결과: {criteria_result}")
        
        # DB 저장 시도 (에러 발생 시 로그만 출력)
        try:
            from app.services.evaluation_criteria_service import EvaluationCriteriaService
            from app.schemas.evaluation_criteria import EvaluationCriteriaCreate
            
            print("🔍 EvaluationCriteriaService import 성공")
            criteria_service = EvaluationCriteriaService(db)
            print("🔍 EvaluationCriteriaService 인스턴스 생성 성공")
            
            # 기존 데이터가 있으면 업데이트, 없으면 새로 생성
            existing_criteria = criteria_service.get_evaluation_criteria_by_job_post(request.job_post_id)
            print(f"🔍 기존 데이터 확인: {existing_criteria}")
            
            # LangGraph 결과를 스키마에 맞게 변환
            suggested_criteria = []
            for item in criteria_result.get("suggested_criteria", []):
                if isinstance(item, dict):
                    suggested_criteria.append({
                        "criterion": item.get("criterion", ""),
                        "description": item.get("description", ""),
                        "max_score": item.get("max_score", 10)
                    })
            
            weight_recommendations = []
            for item in criteria_result.get("weight_recommendations", []):
                if isinstance(item, dict):
                    weight_recommendations.append({
                        "criterion": item.get("criterion", ""),
                        "weight": float(item.get("weight", 0.0)),
                        "reason": item.get("reason", "")
                    })
            
            # Pydantic 모델을 딕셔너리로 변환 (JSON 직렬화를 위해)
            suggested_criteria_dict = []
            for item in suggested_criteria:
                suggested_criteria_dict.append({
                    "criterion": item["criterion"],
                    "description": item["description"],
                    "max_score": item["max_score"]
                })
            
            weight_recommendations_dict = []
            for item in weight_recommendations:
                weight_recommendations_dict.append({
                    "criterion": item["criterion"],
                    "weight": item["weight"],
                    "reason": item["reason"]
                })
            
            evaluation_questions = criteria_result.get("evaluation_questions", [])
            if not isinstance(evaluation_questions, list):
                evaluation_questions = []
            
            scoring_guidelines = criteria_result.get("scoring_guidelines", {})
            if not isinstance(scoring_guidelines, dict):
                scoring_guidelines = {}
            
            # evaluation_items 처리 (새로운 구체적 평가 항목)
            evaluation_items = criteria_result.get("evaluation_items", [])
            if not isinstance(evaluation_items, list):
                evaluation_items = []
            
            print(f"🔍 변환된 데이터:")
            print(f"  - suggested_criteria: {suggested_criteria_dict}")
            print(f"  - weight_recommendations: {weight_recommendations_dict}")
            print(f"  - evaluation_questions: {evaluation_questions}")
            print(f"  - scoring_guidelines: {scoring_guidelines}")
            print(f"  - evaluation_items: {evaluation_items}")
            
            criteria_data = EvaluationCriteriaCreate(
                job_post_id=request.job_post_id,
                company_name=request.company_name,
                suggested_criteria=suggested_criteria_dict,
                weight_recommendations=weight_recommendations_dict,
                evaluation_questions=evaluation_questions,
                scoring_guidelines=scoring_guidelines,
                evaluation_items=evaluation_items  # 새로운 구체적 평가 항목 추가
            )
            print(f"🔍 criteria_data 생성 성공: {criteria_data}")
            
            if existing_criteria:
                # 기존 데이터 업데이트
                criteria_service.update_evaluation_criteria(request.job_post_id, criteria_data)
                print(f"✅ 평가항목 업데이트 완료: job_post_id={request.job_post_id}")
            else:
                # 새로 생성
                criteria_service.create_evaluation_criteria(criteria_data)
                print(f"✅ 평가항목 생성 완료: job_post_id={request.job_post_id}")
                
        except Exception as db_error:
            print(f"⚠️ DB 저장 중 오류 발생: {db_error}")
            print(f"⚠️ 오류 타입: {type(db_error)}")
            import traceback
            print(f"⚠️ 상세 오류: {traceback.format_exc()}")
            # DB 저장 실패해도 LangGraph 결과는 반환
            pass
        
        # evaluation_items가 포함된 응답 반환
        return JobBasedCriteriaResponse(
            suggested_criteria=criteria_result.get("suggested_criteria", []),
            weight_recommendations=criteria_result.get("weight_recommendations", []),
            evaluation_questions=criteria_result.get("evaluation_questions", []),
            scoring_guidelines=criteria_result.get("scoring_guidelines", {}),
            evaluation_items=criteria_result.get("evaluation_items", [])  # 새로운 구체적 평가 항목 추가
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evaluation-criteria/job/{job_post_id}", response_model=JobBasedCriteriaResponse)
@redis_cache(expire=300)  # 5분 캐시 (DB 조회)
async def get_job_based_evaluation_criteria(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 저장된 평가항목 조회"""
    try:
        from app.services.evaluation_criteria_service import EvaluationCriteriaService
        
        criteria_service = EvaluationCriteriaService(db)
        criteria = criteria_service.get_evaluation_criteria_by_job_post(job_post_id)
        
        if not criteria:
            raise HTTPException(status_code=404, detail="Evaluation criteria not found for this job post")
        
        return JobBasedCriteriaResponse(
            suggested_criteria=criteria.suggested_criteria,
            weight_recommendations=criteria.weight_recommendations,
            evaluation_questions=criteria.evaluation_questions,
            scoring_guidelines=criteria.scoring_guidelines,
            evaluation_items=criteria.evaluation_items  # 새로운 구체적 평가 항목 추가
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/evaluation-criteria/job/{job_post_id}")
async def delete_job_based_evaluation_criteria(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 평가항목 삭제"""
    try:
        from app.services.evaluation_criteria_service import EvaluationCriteriaService
        
        criteria_service = EvaluationCriteriaService(db)
        success = criteria_service.delete_evaluation_criteria(job_post_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Evaluation criteria not found for this job post")
        
        return {"message": "Evaluation criteria deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluation-criteria/resume-based", response_model=EvaluationCriteriaResponse)
async def create_resume_based_evaluation_criteria(request: EvaluationCriteriaRequest, db: Session = Depends(get_db)):
    """이력서 기반 평가 기준 생성 및 DB 저장"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
        
        # 면접 단계별 평가 기준 생성
        from agent.agents.interview_question_node import suggest_evaluation_criteria
        
        # 면접 단계별 프롬프트 조정
        interview_stage = getattr(request, 'interview_stage', 'practical')  # 기본값: 실무진
        
        if interview_stage == 'practical':
            # 실무진 면접: 기술적 역량 중심
            criteria_result = await suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사",
                focus_area="technical_skills"  # 기술적 역량 중심
            )
        elif interview_stage == 'executive':
            # 임원진 면접: 인성/리더십 중심
            criteria_result = await suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사",
                focus_area="leadership_potential"  # 리더십/인성 중심
            )
        else:
            # 기본: 종합적 평가
            criteria_result = await suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=request.company_name or "회사"
            )
        
        # DB에 저장
        print(f"🔍 LangGraph 결과: {criteria_result}")
        try:
            from app.services.evaluation_criteria_service import EvaluationCriteriaService
            from app.schemas.evaluation_criteria import EvaluationCriteriaCreate
            
            print("🔍 EvaluationCriteriaService import 성공")
            criteria_service = EvaluationCriteriaService(db)
            print("🔍 EvaluationCriteriaService 인스턴스 생성 성공")
            
            # 기존 데이터가 있으면 업데이트, 없으면 새로 생성
            existing_criteria = criteria_service.get_evaluation_criteria_by_resume(
                request.resume_id, 
                request.application_id,
                interview_stage
            )
            print(f"🔍 기존 데이터 확인: {existing_criteria}")
            
            # LangGraph 결과를 스키마에 맞게 변환
            suggested_criteria = []
            for item in criteria_result.get("suggested_criteria", []):
                if isinstance(item, dict):
                    suggested_criteria.append({
                        "criterion": item.get("criterion", ""),
                        "description": item.get("description", ""),
                        "max_score": item.get("max_score", 10)
                    })
            
            weight_recommendations = []
            for item in criteria_result.get("weight_recommendations", []):
                if isinstance(item, dict):
                    weight_recommendations.append({
                        "criterion": item.get("criterion", ""),
                        "weight": float(item.get("weight", 0.0)),
                        "reason": item.get("reason", "")
                    })
            
            evaluation_questions = criteria_result.get("evaluation_questions", [])
            if not isinstance(evaluation_questions, list):
                evaluation_questions = []
            
            scoring_guidelines = criteria_result.get("scoring_guidelines", {})
            if not isinstance(scoring_guidelines, dict):
                scoring_guidelines = {}
            
            # evaluation_items 처리 (새로운 구체적 평가 항목)
            evaluation_items = criteria_result.get("evaluation_items", [])
            if not isinstance(evaluation_items, list):
                evaluation_items = []
            
            print(f"🔍 변환된 데이터:")
            print(f"  - suggested_criteria: {suggested_criteria}")
            print(f"  - weight_recommendations: {weight_recommendations}")
            print(f"  - evaluation_questions: {evaluation_questions}")
            print(f"  - scoring_guidelines: {scoring_guidelines}")
            print(f"  - evaluation_items: {evaluation_items}")

            criteria_data = EvaluationCriteriaCreate(
                job_post_id=None,  # 이력서 기반이므로 None
                resume_id=request.resume_id,
                application_id=request.application_id,
                evaluation_type="resume_based",
                company_name=request.company_name,
                suggested_criteria=suggested_criteria,
                weight_recommendations=weight_recommendations,
                evaluation_questions=evaluation_questions,
                scoring_guidelines=scoring_guidelines,
                evaluation_items=evaluation_items  # 새로운 구체적 평가 항목 추가
            )
            print(f"🔍 criteria_data 생성 성공: {criteria_data}")
            
            if existing_criteria:
                # 기존 데이터 업데이트
                criteria_service.update_evaluation_criteria_by_resume(
                    request.resume_id, 
                    criteria_data,
                    request.application_id,
                    interview_stage
                )
                print(f"✅ 평가항목 업데이트 완료: resume_id={request.resume_id}")
            else:
                # 새로 생성
                criteria_service.create_evaluation_criteria(criteria_data)
                print(f"✅ 평가항목 생성 완료: resume_id={request.resume_id}")
                
        except Exception as db_error:
            print(f"⚠️ DB 저장 중 오류 발생: {db_error}")
            print(f"⚠️ 오류 타입: {type(db_error)}")
            import traceback
            print(f"⚠️ 상세 오류: {traceback.format_exc()}")
            # DB 저장 실패해도 LangGraph 결과는 반환
            pass
        
        return criteria_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evaluation-criteria/resume/{resume_id}", response_model=EvaluationCriteriaResponse)
@redis_cache(expire=300)  # 5분 캐시 (DB 조회)
async def get_resume_based_evaluation_criteria(
    resume_id: int, 
    application_id: Optional[int] = None,
    interview_stage: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """이력서 기반 저장된 평가 기준 조회"""
    try:
        from app.services.evaluation_criteria_service import EvaluationCriteriaService
        
        criteria_service = EvaluationCriteriaService(db)
        criteria = criteria_service.get_evaluation_criteria_by_resume(resume_id, application_id, interview_stage)
        
        if not criteria:
            raise HTTPException(status_code=404, detail="Evaluation criteria not found for this resume")
        
        return EvaluationCriteriaResponse(
            suggested_criteria=criteria.suggested_criteria,
            weight_recommendations=criteria.weight_recommendations,
            evaluation_questions=criteria.evaluation_questions,
            scoring_guidelines=criteria.scoring_guidelines,
            evaluation_items=criteria.evaluation_items  # 새로운 구체적 평가 항목 추가
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 새로운 API: 면접 단계별 평가 항목 조회 (Frontend용)
class InterviewEvaluationItemsRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None
    interview_stage: str  # "practical" 또는 "executive"

class InterviewEvaluationItemsResponse(BaseModel):
    interview_stage: str
    evaluation_items: List[Dict[str, Any]]
    total_weight: float
    max_total_score: int
    message: str = "평가 항목을 성공적으로 조회했습니다."

@router.post("/evaluation-items/interview", response_model=InterviewEvaluationItemsResponse)
@redis_cache(expire=300)  # 5분 캐시
async def get_interview_evaluation_items(
    request: InterviewEvaluationItemsRequest,
    db: Session = Depends(get_db)
):
    """면접 단계별 평가 항목 조회 (단순화된 기본 기준)"""
    try:
        # 단순화된 기본 평가 기준 반환 (DB 의존성 제거)
        if request.interview_stage == "practical":
            evaluation_items = [
                {
                    "item_name": "기술 역량",
                    "description": "지원자의 기술적 능력과 실무 적용 가능성",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 해당 분야 전문가 수준",
                        "4점": "양호 - 실무 가능한 수준",
                        "3점": "보통 - 기본적인 수준",
                        "2점": "미흡 - 개선 필요",
                        "1점": "부족 - 학습 필요"
                    },
                    "evaluation_questions": [
                        "주요 기술 스택에 대한 이해도를 설명해주세요",
                        "실무에서 해당 기술을 어떻게 활용하시겠습니까?"
                    ],
                    "weight": 0.30
                },
                {
                    "item_name": "경험 및 성과",
                    "description": "지원자의 프로젝트 경험과 성과",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 성과와 경험",
                        "4점": "양호 - 충분한 경험과 성과",
                        "3점": "보통 - 기본적인 경험",
                        "2점": "미흡 - 경험 부족",
                        "1점": "부족 - 경험 없음"
                    },
                    "evaluation_questions": [
                        "가장 성공적이었던 프로젝트 경험을 설명해주세요",
                        "본인의 기여도와 성과를 구체적으로 설명해주세요"
                    ],
                    "weight": 0.25
                },
                {
                    "item_name": "문제해결 능력",
                    "description": "지원자의 문제 인식 및 해결 능력",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 창의적이고 효과적인 해결",
                        "4점": "양호 - 논리적이고 체계적인 해결",
                        "3점": "보통 - 기본적인 해결 능력",
                        "2점": "미흡 - 해결 능력 부족",
                        "1점": "부족 - 문제 인식 어려움"
                    },
                    "evaluation_questions": [
                        "어려운 문제를 해결한 경험을 설명해주세요",
                        "예상치 못한 상황에 어떻게 대응하시겠습니까?"
                    ],
                    "weight": 0.20
                },
                {
                    "item_name": "의사소통 및 협업",
                    "description": "지원자의 팀워크와 의사소통 능력",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 소통과 리더십",
                        "4점": "양호 - 원활한 소통과 협업",
                        "3점": "보통 - 기본적인 소통 능력",
                        "2점": "미흡 - 소통 능력 부족",
                        "1점": "부족 - 소통 어려움"
                    },
                    "evaluation_questions": [
                        "팀 프로젝트에서의 역할과 기여도를 설명해주세요",
                        "갈등 상황을 어떻게 해결하시겠습니까?"
                    ],
                    "weight": 0.15
                },
                {
                    "item_name": "성장 의지",
                    "description": "지원자의 학습 의지와 성장 가능성",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 학습 의지와 계획",
                        "4점": "양호 - 적극적인 학습 의지",
                        "3점": "보통 - 기본적인 학습 의지",
                        "2점": "미흡 - 학습 의지 부족",
                        "1점": "부족 - 학습 의지 없음"
                    },
                    "evaluation_questions": [
                        "새로운 기술을 학습한 경험을 설명해주세요",
                        "앞으로의 성장 계획을 구체적으로 제시해주세요"
                    ],
                    "weight": 0.10
                }
            ]
        else:  # executive
            evaluation_items = [
                {
                    "item_name": "리더십",
                    "description": "팀 리딩과 의사결정 능력",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 리더십과 의사결정 능력",
                        "4점": "양호 - 양호한 리더십과 의사결정 능력",
                        "3점": "보통 - 일반적인 리더십과 의사결정 능력",
                        "2점": "미흡 - 제한적인 리더십과 의사결정 능력",
                        "1점": "부족 - 리더십과 의사결정 능력 부족"
                    },
                    "evaluation_questions": [
                        "팀을 이끌어본 경험을 설명해주세요",
                        "어려운 의사결정을 내린 경험을 설명해주세요"
                    ],
                    "weight": 0.30
                },
                {
                    "item_name": "전략적 사고",
                    "description": "비전 제시와 전략 수립 능력",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 전략적 사고와 비전 제시 능력",
                        "4점": "양호 - 양호한 전략적 사고와 비전 제시 능력",
                        "3점": "보통 - 일반적인 전략적 사고와 비전 제시 능력",
                        "2점": "미흡 - 제한적인 전략적 사고와 비전 제시 능력",
                        "1점": "부족 - 전략적 사고와 비전 제시 능력 부족"
                    },
                    "evaluation_questions": [
                        "조직의 미래 비전을 어떻게 설정하시겠습니까?",
                        "시장 변화에 대응하는 전략을 설명해주세요"
                    ],
                    "weight": 0.25
                },
                {
                    "item_name": "인성과 가치관",
                    "description": "윤리의식과 조직 문화 적합성",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 윤리의식과 조직 문화 적합성",
                        "4점": "양호 - 양호한 윤리의식과 조직 문화 적합성",
                        "3점": "보통 - 일반적인 윤리의식과 조직 문화 적합성",
                        "2점": "미흡 - 제한적인 윤리의식과 조직 문화 적합성",
                        "1점": "부족 - 윤리의식과 조직 문화 적합성 부족"
                    },
                    "evaluation_questions": [
                        "윤리적 딜레마 상황을 어떻게 해결하시겠습니까?",
                        "조직의 가치관과 본인의 가치관이 일치하는지 설명해주세요"
                    ],
                    "weight": 0.25
                },
                {
                    "item_name": "성장 잠재력",
                    "description": "미래 성장 가능성과 동기부여",
                    "max_score": 5,
                    "scoring_criteria": {
                        "5점": "우수 - 뛰어난 성장 잠재력과 강한 동기부여",
                        "4점": "양호 - 양호한 성장 잠재력과 동기부여",
                        "3점": "보통 - 일반적인 성장 잠재력과 동기부여",
                        "2점": "미흡 - 제한적인 성장 잠재력과 동기부여",
                        "1점": "부족 - 성장 잠재력과 동기부여 부족"
                    },
                    "evaluation_questions": [
                        "앞으로의 성장 계획을 설명해주세요",
                        "이 직무에 지원한 동기를 설명해주세요"
                    ],
                    "weight": 0.20
                }
            ]
        
        # 총 가중치와 최대 점수 계산
        total_weight = sum(item.get("weight", 0) for item in evaluation_items)
        max_total_score = sum(item.get("max_score", 5) for item in evaluation_items)
        
        return InterviewEvaluationItemsResponse(
            interview_stage=request.interview_stage,
            evaluation_items=evaluation_items,
            total_weight=total_weight,
            max_total_score=max_total_score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
