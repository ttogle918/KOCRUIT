from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
import redis
from pydantic import BaseModel
from app.utils.llm_cache import redis_cache
import datetime
from app.core.database import get_db
from app.api.v2.auth.auth import get_current_user
from app.models.v2.auth.user import User
from app.models.v2.document.application import Application, ApplicationStage, OverallStatus, StageStatus, StageName
from app.models.v2.recruitment.job import JobPost
from app.models.v2.document.resume import Resume, Spec
from app.models.v2.interview.personal_question_result import PersonalQuestionResult
from app.services.v2.interview.interview_question_service import InterviewQuestionService
from app.schemas.interview_question import InterviewQuestionCreate, InterviewQuestionBulkCreate,InterviewQuestionResponse, InterviewQuestionBulkCreate
from app.models.v2.interview.interview_question import InterviewQuestion, QuestionType
from app.api.v2.interview.company_question_rag import generate_questions, CompanyQuestionRagResponse
from app.services.v2.interview.evaluation_criteria_service import EvaluationCriteriaService
from app.models.v2.interview.evaluation_criteria import EvaluationCriteria
from app.schemas.evaluation_criteria import EvaluationCriteriaCreate
from app.models.v2.interview.interview_question_log import InterviewQuestionLog, InterviewType

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
    resume_data: Optional[Dict[str, Any]] = None

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

@router.post("/bulk-create", response_model=List[InterviewQuestionResponse])
def create_questions_bulk(bulk_data: InterviewQuestionBulkCreate, db: Session = Depends(get_db)):
    """대량 질문 생성"""
    return InterviewQuestionService.create_questions_bulk(db, bulk_data)


@router.post("/integrated-questions", response_model=IntegratedQuestionResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_integrated_questions(request: IntegratedQuestionRequest, db: Session = Depends(get_db)):
    """통합 면접 질문 생성 (LangGraph 워크플로우 사용, DB 저장 없음)"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        job_matching_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
                    job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # LangGraph 워크플로우를 사용한 종합 질문 생성 (DB 저장 없음)
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name,
            applicant_name=request.name,
            interview_type="general",
            job_matching_info=job_matching_info
        )
        
        # 결과에서 질문 추출
        questions = workflow_result.get("questions", [])
        question_bundle = workflow_result.get("question_bundle", {})
        evaluation_tools = workflow_result.get("evaluation_tools", {})
        resume_analysis = workflow_result.get("resume_analysis", {})
        
        # 요약 정보 구성
        summary_info = {
            "total_questions": len(questions),
            "question_categories": list(question_bundle.keys()) if question_bundle else [],
            "evaluation_tools_available": list(evaluation_tools.keys()) if evaluation_tools else [],
            "resume_analysis_available": bool(resume_analysis),
            "workflow_execution_time": workflow_result.get("execution_time", 0),
            "generated_at": workflow_result.get("generated_at", "")
        }
        
        return IntegratedQuestionResponse(
            questions=questions,
            question_bundle=question_bundle,
            summary_info=summary_info
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resume-analysis", response_model=ResumeAnalysisResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_resume_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """이력서 분석 리포트 생성 (LangGraph 워크플로우 사용, DB 저장 없음)"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        job_matching_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
                    job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # LangGraph 워크플로우를 사용한 이력서 분석 (DB 저장 없음)
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행 (이력서 분석만)
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "",
            applicant_name=request.name or "",
            interview_type="general",
            job_matching_info=job_matching_info
        )
        
        # 이력서 분석 결과 추출
        resume_analysis = workflow_result.get("resume_analysis", {})
        
        return ResumeAnalysisResponse(**resume_analysis)
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

@router.post("/project-questions", response_model=ProjectQuestionResponse)
@redis_cache(expire=1800)  # 30분 캐시 (LLM 생성 결과)
async def generate_project_questions(request: ProjectQuestionRequest, db: Session = Depends(get_db)):
    """자기소개서/이력서 기반 프로젝트 면접 질문 생성 (LangGraph 워크플로우 사용)"""
    # POST /api/v2/interview-questions/project-questions
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
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
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
async def generate_job_questions(request: JobQuestionRequest, db: Session = Depends(get_db)):
    """지원서 기반 직무 맞춤형 면접 질문 생성 (LangGraph 워크플로우 사용)"""
    # POST /api/v2/interview-questions/job-questions
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
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        try:
            workflow_result = generate_comprehensive_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=actual_company_name,
                applicant_name='',  # getattr(request, 'name', '') or '',
                interview_type="general",
                job_matching_info=job_matching_info
            )
            
            # 결과 검증
            if not workflow_result or not isinstance(workflow_result, dict):
                raise Exception("워크플로우에서 유효한 결과를 반환하지 못했습니다.")
            
            # 결과에서 질문 추출
            questions = workflow_result.get("questions", [])
            question_bundle = workflow_result.get("question_bundle", {})
            
            # 개인별 질문 생성이 요청된 경우 추가 처리
            if request.resume_data:
                try:
                    print(f"개인별 질문 생성 시작 - application_id: {request.application_id}")
                    print(f"resume_data 키: {list(request.resume_data.keys()) if request.resume_data else 'None'}")
                    print(f"job_info 길이: {len(job_info) if job_info else 0}")
                    print(f"company_name: {actual_company_name}")
                    
                    from agent.tools.personal_question_tool import generate_personal_interview_questions
                    
                    # 개인별 질문 생성 - tool 함수를 직접 호출
                    personal_result = generate_personal_interview_questions(
                        resume_data=request.resume_data,
                        job_posting=job_info,
                        company_name=actual_company_name
                    )
                    
                    print(f"개인별 질문 생성 완료 - 결과 타입: {type(personal_result)}")
                    print(f"개인별 질문 생성 완료 - 결과 키: {list(personal_result.keys()) if personal_result else 'None'}")
                    
                    # 개인별 질문을 question_bundle에 추가
                    if personal_result and personal_result.get("questions"):
                        personal_questions = personal_result["questions"]
                        print(f"개인별 질문 카테고리: {list(personal_questions.keys())}")
                        
                        # 기존 question_bundle을 개인별 질문으로 완전히 교체
                        question_bundle = personal_questions
                        
                        # 전체 질문 목록도 개인별 질문으로 교체
                        questions = []
                        for questions_list in personal_questions.values():
                            if isinstance(questions_list, list):
                                questions.extend(questions_list)
                            elif isinstance(questions_list, str):
                                questions.append(questions_list)
                            
                        print(f"개인별 질문으로 교체 완료 - 총 질문 수: {len(questions)}")
                        print(f"개인별 질문 카테고리 수: {len(question_bundle)}")
                    else:
                        print("⚠️ 개인별 질문 생성 결과가 비어있습니다.")
                        # 기본 질문 유지
                            
                except Exception as e:
                    print(f"개인별 질문 생성 중 오류: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    # 개인별 질문 생성 실패 시 기본 질문만 사용
                    # 에러를 발생시키지 않고 기본 질문으로 계속 진행
                    print("기본 질문으로 계속 진행합니다.")
            
            # 최종 결과 검증
            if not question_bundle or (isinstance(question_bundle, dict) and len(question_bundle) == 0):
                print("⚠️ 질문이 생성되지 않았습니다.")
                raise HTTPException(
                    status_code=500, 
                    detail="AI 개인 질문 생성에 실패했습니다. 다시 시도해주세요."
                )
            
            # 4. DB에 결과 저장
            try:
                print(f"💾 DB 저장 시작: application_id={request.application_id}")
                
                # 기존 결과가 있으면 업데이트, 없으면 새로 생성
                existing_result = db.query(PersonalQuestionResult).filter(
                    PersonalQuestionResult.application_id == request.application_id
                ).first()
                
                print(f"🔍 기존 결과 조회: {'있음' if existing_result else '없음'}")
                
                if existing_result:
                    # 기존 결과 업데이트
                    print(f"🔄 기존 결과 업데이트 시작: ID {existing_result.id}")
                    existing_result.questions = questions
                    existing_result.question_bundle = question_bundle
                    existing_result.job_matching_info = job_matching_info
                    existing_result.updated_at = func.now()
                    personal_result = existing_result
                    print(f"🔄 기존 개인 질문 결과 업데이트: ID {existing_result.id}")
                else:
                    # 새로운 결과 생성
                    print(f"🆕 새로운 결과 생성 시작")
                    personal_result = PersonalQuestionResult(
                        application_id=request.application_id,
                        jobpost_id=application.job_post_id,
                        company_id=application.job_post.company_id if application.job_post else None,
                        questions=questions,
                        question_bundle=question_bundle,
                        job_matching_info=job_matching_info
                    )
                    print(f"🆕 PersonalQuestionResult 객체 생성 완료")
                    db.add(personal_result)
                    print(f"💾 새로운 개인 질문 결과 저장")
                
                print(f"💾 DB commit 시작")
                db.commit()
                print(f"✅ 개인 질문 결과 DB 저장 완료: ID {personal_result.id}")
                
            except Exception as db_error:
                print(f"⚠️ DB 저장 실패 (분석 결과는 반환): {db_error}")
                print(f"⚠️ DB 저장 실패 상세: {type(db_error).__name__}: {str(db_error)}")
                import traceback
                print(f"⚠️ DB 저장 실패 스택트레이스: {traceback.format_exc()}")
                db.rollback()
                # DB 저장 실패해도 분석 결과는 반환
            
            return JobQuestionResponse(
                questions=questions,
                question_bundle=question_bundle,
                job_matching_info=job_matching_info
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
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
    # POST /api/v2/interview-questions/passed-applicants-questions
    # Content-Type: application/json
    # {
    #   "job_post_id": 17,
    #   "company_name": "KOSA공공"
    # }

    try:
        # 서류 합격자 조회 - applications.py의 함수를 직접 호출
        from app.api.v2.document.applications import get_passed_applicants
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
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
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

import json
import re

def parse_json_from_llm(content):
    """LLM 응답에서 마크다운 펜스를 제거하고 JSON으로 변환"""
    if isinstance(content, dict): return content
    try:
        # 마크다운 블록 제거
        clean_content = re.sub(r'```(?:json)?\s*([\s\S]*?)\s*```', r'\1', content)
        return json.loads(clean_content.strip())
    except Exception as e:
        print(f"❌ JSON 파싱 실패: {e}")
        return content

# --- 공고 기반 체크리스트 ---
@router.post("/interview-checklist/job-based")
@redis_cache(expire=3600)
async def generate_job_based_checklist(
    request: JobBasedChecklistRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """공고 기반 면접 체크리스트 생성 (DB 체크 후 없으면 Background Task)"""
    try:
        from app.models.v2.analysis.analysis_result import AnalysisResult
        
        # 1. 먼저 DB에 데이터가 있는지 확인
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.jobpost_id == request.job_post_id,
            AnalysisResult.analysis_type == 'job_based_checklist'
        ).first()
        
        if existing:
            return existing.analysis_data

        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        
        # 백그라운드 작업 추가
        background_tasks.add_task(
            process_job_based_checklist,
            request.job_post_id,
            request.company_name or "",
            job_post.company_id
        )
        
        return {"message": "generating"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_job_based_checklist(job_post_id: int, company_name: str, company_id: int):
    """실제 체크리스트 생성 및 DB 저장 (Background)"""
    db = next(get_db())
    try:
        from app.models.v2.analysis.analysis_result import AnalysisResult
        from agent.agents.interview_question_node import generate_interview_checklist
        
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        job_info = parse_job_post_data(job_post)
        
        print(f"🚀 [Background] 체크리스트 생성 시작: JobPost {job_post_id}")
        
        raw_result = generate_interview_checklist(
            resume_text="",
            job_info=job_info,
            company_name=company_name
        )
        checklist_result = parse_json_from_llm(raw_result)
        
        # DB 저장 (AnalysisResult)
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.jobpost_id == job_post_id,
            AnalysisResult.analysis_type == 'job_based_checklist'
        ).first()
        
        if existing:
            existing.analysis_data = checklist_result
            existing.updated_at = datetime.datetime.now()
        else:
            new_result = AnalysisResult(
                application_id=None,
                resume_id=None,
                jobpost_id=job_post_id,
                company_id=company_id,
                analysis_type='job_based_checklist',
                analysis_data=checklist_result
            )
            db.add(new_result)
        db.commit()
        print(f"✅ [Background] 체크리스트 생성 및 저장 완료: JobPost {job_post_id}")
    except Exception as e:
        print(f"❌ [Background] 체크리스트 생성 실패: {e}")
        db.rollback()
    finally:
        db.close()

# --- 공고 기반 강점/약점 ---
@router.post("/strengths-weaknesses/job-based")
@redis_cache(expire=3600)
async def analyze_job_based_strengths_weaknesses(
    request: JobBasedStrengthsRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """공고 기반 강점/약점 분석 (DB 체크 후 없으면 Background Task)"""
    try:
        from app.models.v2.analysis.analysis_result import AnalysisResult
        
        # 1. 먼저 DB에 데이터가 있는지 확인
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.jobpost_id == request.job_post_id,
            AnalysisResult.analysis_type == 'job_based_strengths'
        ).first()
        
        if existing:
            return {"message": "기존 데이터를 반환합니다.", "data": existing.analysis_data, "job_post_id": request.job_post_id}

        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
            
        background_tasks.add_task(
            process_job_based_strengths,
            request.job_post_id,
            request.company_name or "",
            job_post.company_id
        )
        
        return {"message": "강점/약점 분석이 백그라운드에서 시작되었습니다.", "job_post_id": request.job_post_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_job_based_strengths(job_post_id: int, company_name: str, company_id: int):
    """실제 강점/약점 분석 및 저장 (Background)"""
    db = next(get_db())
    try:
        from app.models.v2.analysis.analysis_result import AnalysisResult
        from agent.agents.interview_question_node import analyze_candidate_strengths_weaknesses
        
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        job_info = parse_job_post_data(job_post)
        
        print(f"🚀 [Background] 강점/약점 분석 시작: JobPost {job_post_id}")
        
        analysis_result = analyze_candidate_strengths_weaknesses(
            resume_text="",
            job_info=job_info,
            company_name=company_name
        )
        
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.jobpost_id == job_post_id,
            AnalysisResult.analysis_type == 'job_based_strengths'
        ).first()
        
        if existing:
            existing.analysis_data = analysis_result
            existing.updated_at = datetime.datetime.now()
        else:
            new_res = AnalysisResult(
                application_id=None,
                resume_id=None,
                jobpost_id=job_post_id,
                company_id=company_id,
                analysis_type='job_based_strengths',
                analysis_data=analysis_result
            )
            db.add(new_res)
        db.commit()
        print(f"✅ [Background] 강점/약점 분석 및 저장 완료: JobPost {job_post_id}")
    except Exception as e:
        print(f"❌ [Background] 강점/약점 분석 실패: {e}")
        db.rollback()
    finally:
        db.close()

# --- 공고 기반 가이드라인 ---
@router.post("/interview-guideline/job-based")
@redis_cache(expire=3600)
async def generate_job_based_guideline(
    request: JobBasedGuidelineRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """공고 기반 가이드라인 생성 (DB 체크 후 없으면 Background Task)"""
    try:
        from app.models.v2.analysis.analysis_result import AnalysisResult
        
        # 1. 먼저 DB에 데이터가 있는지 확인
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.jobpost_id == request.job_post_id,
            AnalysisResult.analysis_type == 'job_based_guideline'
        ).first()
        
        if existing:
            return existing.analysis_data

        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
            
        background_tasks.add_task(
            process_job_based_guideline,
            request.job_post_id,
            request.company_name or "",
            job_post.company_id
        )
        
        return {"message": "generating"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_job_based_guideline(job_post_id: int, company_name: str, company_id: int):
    """실제 가이드라인 생성 및 저장 (Background)"""
    db = next(get_db())
    try:
        from app.models.v2.analysis.analysis_result import AnalysisResult
        from agent.agents.interview_question_node import generate_interview_guideline
        
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        job_info = parse_job_post_data(job_post)
        
        print(f"🚀 [Background] 가이드라인 생성 시작: JobPost {job_post_id}")
        
        raw_result = generate_interview_guideline(
            resume_text="",
            job_info=job_info,
            company_name=company_name
        )
        guideline_result = parse_json_from_llm(raw_result)
        
        existing = db.query(AnalysisResult).filter(
            AnalysisResult.jobpost_id == job_post_id,
            AnalysisResult.analysis_type == 'job_based_guideline'
        ).first()
        
        if existing:
            existing.analysis_data = guideline_result
            existing.updated_at = datetime.datetime.now()
        else:
            new_res = AnalysisResult(
                application_id=None,
                resume_id=None,
                jobpost_id=job_post_id,
                company_id=company_id,
                analysis_type='job_based_guideline',
                analysis_data=guideline_result
            )
            db.add(new_res)
        db.commit()
        print(f"✅ [Background] 가이드라인 생성 및 저장 완료: JobPost {job_post_id}")
    except Exception as e:
        print(f"❌ [Background] 가이드라인 생성 실패: {e}")
        db.rollback()
    finally:
        db.close()

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
    """AI 면접 질문 생성 (LangGraph 워크플로우 사용, DB 저장 없음)"""
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
        
        # LangGraph 워크플로우를 사용한 AI 면접 질문 생성 (DB 저장 없음)
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
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
            "interview_type": "ai",
            "workflow_result": {
                "total_questions": len(questions),
                "execution_time": workflow_result.get("execution_time", 0),
                "generated_at": workflow_result.get("generated_at", "")
            }
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
            sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
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
            now = datetime.datetime.now()
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
    # 이력서 정보 조회
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="이력서를 찾을 수 없습니다.")
    
    # Spec 정보 조회
    specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
    
    # 통합 이력서 텍스트 생성
    resume_text = combine_resume_and_specs(resume, specs)
    
    # Agent 호출 준비
    import httpx
    from app.core.config import settings
    agent_url = settings.AGENT_URL or "http://agent:8001"
    url = f"{agent_url}/api/v2/agent/tools/interview-prep"
    
    # Agent 요청을 위한 데이터 구성
    job_post_dict = {
        "title": request.interview_stage or "AI 면접",
        "qualifications": "", # 공고 정보가 없으면 빈 문자열
        "conditions": "",
        "job_details": f"회사: {request.company_name}"
    }
    
    resume_dict = {
        "name": request.name or "지원자",
        "career_summary": resume_text[:1000], # 요약 필요 시
        "skills": "", # 파싱 필요 시
        "introduction": resume_text
    }
    
    payload = {
        "job_post": job_post_dict,
        "resume_data": resume_dict,
        "interview_type": "AI_INTERVIEW"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=60.0)
            if resp.status_code == 200:
                tools_data = resp.json()
                # 응답 구조가 {"evaluation_tools": ...} 형태라고 가정
                return AiToolsResponse(
                    evaluation_tools=tools_data.get("evaluation_tools", {}),
                    questions=None
                )
            else:
                print(f"Agent API 호출 실패: {resp.status_code} {resp.text}")
                raise Exception("Agent API Error")

    except Exception as e:
        print(f"AI 도구 생성 오류 (Agent 호출): {e}")
        # Fallback 로직 (기존 예외 처리와 동일하게 유지하거나 간소화)
        # 여기서는 기존의 기본값 반환 로직을 그대로 사용
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
@router.post("/evaluation-criteria/job-based")
@redis_cache(expire=3600)
async def create_job_based_evaluation_criteria(
    request: JobBasedCriteriaRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """공고 기반 평가항목 생성 (DB 체크 후 없으면 Background Task)"""
    try:
        from app.services.v2.interview.evaluation_criteria_service import EvaluationCriteriaService
        
        # 1. 먼저 DB에 데이터가 있는지 확인
        criteria_service = EvaluationCriteriaService(db)
        existing = criteria_service.get_evaluation_criteria_by_job_post(request.job_post_id)
        
        if existing:
            return existing

        job_post = db.query(JobPost).filter(JobPost.id == request.job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
            
        background_tasks.add_task(
            process_job_based_evaluation_criteria,
            request.job_post_id,
            request.company_name or ""
        )
        
        return {"message": "generating"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_job_based_evaluation_criteria(job_post_id: int, company_name: str):
    """실제 평가항목 생성 및 저장 (Background)"""
    db = next(get_db())
    try:
        from app.services.v2.interview.evaluation_criteria_service import EvaluationCriteriaService
        from app.schemas.evaluation_criteria import EvaluationCriteriaCreate
        from agent.agents.interview_question_node import suggest_evaluation_criteria
        
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        job_info = parse_job_post_data(job_post)
        
        print(f"🚀 [Background] 평가항목 생성 시작: JobPost {job_post_id}")
        
        raw_result = suggest_evaluation_criteria(
            resume_text="",
            job_info=job_info,
            company_name=company_name
        )
        criteria_result = parse_json_from_llm(raw_result)
        
        criteria_service = EvaluationCriteriaService(db)
        existing_criteria = criteria_service.get_evaluation_criteria_by_job_post(job_post_id)
        
        # 데이터 변환 로직
        suggested_criteria_dict = []
        for item in criteria_result.get("suggested_criteria", []):
            if isinstance(item, dict):
                suggested_criteria_dict.append({
                    "criterion": item.get("criterion", ""),
                    "description": item.get("description", ""),
                    "max_score": item.get("max_score", 10)
                })
        
        weight_recommendations_dict = []
        for item in criteria_result.get("weight_recommendations", []):
            if isinstance(item, dict):
                weight_recommendations_dict.append({
                    "criterion": item.get("criterion", ""),
                    "weight": float(item.get("weight", 0.0)),
                    "reason": item.get("reason", "")
                })
        
        criteria_data = EvaluationCriteriaCreate(
            job_post_id=job_post_id,
            company_name=company_name,
            suggested_criteria=suggested_criteria_dict,
            weight_recommendations=weight_recommendations_dict,
            evaluation_questions=criteria_result.get("evaluation_questions", []),
            scoring_guidelines=criteria_result.get("scoring_guidelines", {}),
            evaluation_items=criteria_result.get("evaluation_items", [])
        )
        
        if existing_criteria:
            criteria_service.update_evaluation_criteria(job_post_id, criteria_data)
        else:
            criteria_service.create_evaluation_criteria(criteria_data)
            
        print(f"✅ [Background] 평가항목 생성 및 저장 완료: JobPost {job_post_id}")
    except Exception as e:
        print(f"❌ [Background] 평가항목 생성 실패: {e}")
    finally:
        db.close()

@router.delete("/evaluation-criteria/job/{job_post_id}")
async def delete_job_based_evaluation_criteria(job_post_id: int, db: Session = Depends(get_db)):
    """공고별 평가항목 삭제"""
    try:
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

# 랭그래프 워크플로우 중심 API들 (DB 저장 없음)
@router.post("/langgraph/interview-questions", response_model=Dict[str, Any])
async def generate_interview_questions_with_langgraph(request: IntegratedQuestionRequest, db: Session = Depends(get_db)):
    """랭그래프 워크플로우를 사용한 면접 질문 생성 (DB 저장 없음)"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        job_matching_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
                    job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # LangGraph 워크플로우 실행
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name,
            applicant_name=request.name,
            interview_type="general",
            job_matching_info=job_matching_info
        )
        
        return {
            "success": True,
            "workflow_type": "interview_question_generation",
            "result": workflow_result,
            "executed_at": workflow_result.get("generated_at", "")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "workflow_type": "interview_question_generation"
        }

@router.post("/langgraph/resume-analysis", response_model=Dict[str, Any])
async def generate_resume_analysis_with_langgraph(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """랭그래프 워크플로우를 사용한 이력서 분석 (DB 저장 없음)"""
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        specs = db.query(Spec).filter(Spec.resume_id == request.resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집
        job_info = ""
        job_matching_info = ""
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
                    job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # LangGraph 워크플로우 실행
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "",
            applicant_name=request.name or "",
            interview_type="general",
            job_matching_info=job_matching_info
        )
        
        return {
            "success": True,
            "workflow_type": "resume_analysis",
            "result": {
                "resume_analysis": workflow_result.get("resume_analysis", {}),
                "evaluation_tools": workflow_result.get("evaluation_tools", {})
            },
            "executed_at": workflow_result.get("generated_at", "")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "workflow_type": "resume_analysis"
        }

@router.post("/langgraph/ai-interview", response_model=Dict[str, Any])
async def generate_ai_interview_with_langgraph(request: AiInterviewRequest, db: Session = Depends(get_db)):
    """랭그래프 워크플로우를 사용한 AI 면접 질문 생성 (DB 저장 없음)"""
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
        
        # LangGraph 워크플로우 실행
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "회사",
            applicant_name=request.name or "",
            interview_type="ai"
        )
        
        return {
            "success": True,
            "workflow_type": "ai_interview_question_generation",
            "result": workflow_result,
            "executed_at": workflow_result.get("generated_at", "")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "workflow_type": "ai_interview_question_generation"
        }

@router.post("/langgraph/evaluation-tools", response_model=Dict[str, Any])
async def generate_evaluation_tools_with_langgraph(request: AiToolsRequest, db: Session = Depends(get_db)):
    """랭그래프 워크플로우를 사용한 평가 도구 생성 (DB 저장 없음)"""
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
        
        # LangGraph 워크플로우 실행
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 워크플로우 실행
        workflow_result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name or "회사",
            applicant_name=request.name or "",
            interview_type=request.interview_stage or "general"
        )
        
        return {
            "success": True,
            "workflow_type": "evaluation_tools_generation",
            "result": {
                "evaluation_tools": workflow_result.get("evaluation_tools", {}),
                "resume_analysis": workflow_result.get("resume_analysis", {})
            },
            "executed_at": workflow_result.get("generated_at", "")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "workflow_type": "evaluation_tools_generation"
        }

# 백그라운드 에이전트 실행 API들
@router.post("/background/generate-interview-questions")
async def trigger_background_interview_questions_generation(request: IntegratedQuestionRequest, db: Session = Depends(get_db)):
    """백그라운드에서 면접 질문 생성 트리거"""
    try:
        if not request.application_id:
            raise HTTPException(status_code=400, detail="application_id가 필요합니다")
        
        # 백그라운드 작업 트리거
        import asyncio
        from app.scheduler.langgraph_background_scheduler import generate_interview_questions_for_application_async
        
        # 비동기로 백그라운드 작업 실행
        asyncio.create_task(generate_interview_questions_for_application_async(request.application_id))
        
        return {
            "success": True,
            "message": f"지원 {request.application_id}에 대한 면접 질문 생성이 백그라운드에서 시작되었습니다.",
            "task_type": "interview_questions_generation",
            "application_id": request.application_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "task_type": "interview_questions_generation"
        }

@router.post("/background/generate-resume-analysis")
async def trigger_background_resume_analysis_generation(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """백그라운드에서 이력서 분석 생성 트리거"""
    try:
        if not request.application_id:
            raise HTTPException(status_code=400, detail="application_id가 필요합니다")
        
        # 백그라운드 작업 트리거
        import asyncio
        from app.scheduler.langgraph_background_scheduler import generate_resume_analysis_for_application_async
        
        # 비동기로 백그라운드 작업 실행
        asyncio.create_task(generate_resume_analysis_for_application_async(request.application_id))
        
        return {
            "success": True,
            "message": f"지원 {request.application_id}에 대한 이력서 분석이 백그라운드에서 시작되었습니다.",
            "task_type": "resume_analysis_generation",
            "application_id": request.application_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "task_type": "resume_analysis_generation"
        }

@router.post("/background/generate-evaluation-tools")
async def trigger_background_evaluation_tools_generation(request: AiToolsRequest, db: Session = Depends(get_db)):
    """백그라운드에서 평가 도구 생성 트리거"""
    try:
        if not request.application_id:
            raise HTTPException(status_code=400, detail="application_id가 필요합니다")
        
        # 백그라운드 작업 트리거
        import asyncio
        from app.scheduler.langgraph_background_scheduler import generate_evaluation_tools_for_application_async
        
        # 비동기로 백그라운드 작업 실행
        asyncio.create_task(generate_evaluation_tools_for_application_async(request.application_id))
        
        return {
            "success": True,
            "message": f"지원 {request.application_id}에 대한 평가 도구 생성이 백그라운드에서 시작되었습니다.",
            "task_type": "evaluation_tools_generation",
            "application_id": request.application_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "task_type": "evaluation_tools_generation"
        }
