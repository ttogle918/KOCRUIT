from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import api_key
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.interview_question import InterviewQuestion, InterviewQuestionCreate
from app.models.resume import Resume, Spec
from app.models.job import JobPost
from app.models.application import Application
from pydantic import BaseModel

from app.api.v1.company_question_rag import generate_questions

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

class EvaluationCriteriaResponse(BaseModel):
    suggested_criteria: List[dict]
    weight_recommendations: List[dict]
    evaluation_questions: List[str]
    scoring_guidelines: dict

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

@router.post("/", response_model=InterviewQuestion)
def create_question(question: InterviewQuestionCreate, db: Session = Depends(get_db)):
    db_question = InterviewQuestion(**question.dict())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

@router.get("/application/{application_id}", response_model=List[InterviewQuestion])
def get_questions_by_application(application_id: int, db: Session = Depends(get_db)):
    return db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id).all()


@router.post("/integrated-questions", response_model=IntegratedQuestionResponse)
async def generate_integrated_questions(request: IntegratedQuestionRequest, db: Session = Depends(get_db)):
    """통합 면접 질문 생성 API - 이력서, 공고, 회사 정보를 모두 활용"""
    # POST /api/v1/interview-questions/integrated-questions
    # Content-Type: application/json
    # {
    #   "resume_id": 41,
    #   "application_id": 41,
    #   "company_name": "KOSA공공",
    #   "name": "홍길동"
    # }

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
            from agent.agents.interview_question_node import generate_common_question_bundle
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
            from agent.tools.portfolio_tool import portfolio_tool
            
            # 자기소개서 요약 생성
            from agent.agents.interview_question_node import generate_resume_summary
            resume_summary_result = generate_resume_summary.invoke({"resume_text": resume_text})
            resume_summary = resume_summary_result.get("text", "")
            
            # 포트폴리오 정보 수집
            portfolio_links = portfolio_tool.extract_portfolio_links(resume_text, request.name)
            portfolio_info = portfolio_tool.analyze_portfolio_content(portfolio_links)
        
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
        from agent.agents.interview_question_node import generate_common_question_bundle, generate_job_question_bundle
        
        # 기본 질문 생성 (이력서 기반)
        basic_questions = {}
        if resume_text:
            basic_questions = generate_common_question_bundle(
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
        
        # 기본 질문들 추가
        if basic_questions:
            question_bundle.update(basic_questions)
            all_questions.extend(basic_questions.get("인성/동기", []))
            all_questions.extend(basic_questions.get("프로젝트 경험", []))
            all_questions.extend(basic_questions.get("회사 관련", []))
            all_questions.extend(basic_questions.get("상황 대처", []))
        
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
        
        return {
            "questions": all_questions,
            "question_bundle": question_bundle,
            "summary_info": summary_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resume-analysis", response_model=ResumeAnalysisResponse)
async def generate_resume_analysis(request: ResumeAnalysisRequest, db: Session = Depends(get_db)):
    """이력서 분석 리포트 생성 API"""
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
        
        # 포트폴리오 정보 수집
        portfolio_info = ""
        if request.name:
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
            from agent.tools.portfolio_tool import portfolio_tool
            portfolio_links = portfolio_tool.extract_portfolio_links(resume_text, request.name)
            portfolio_info = portfolio_tool.analyze_portfolio_content(portfolio_links)
        
        # LangGraph 기반 이력서 분석
        from agent.agents.interview_question_node import generate_resume_analysis_report
        analysis_result = generate_resume_analysis_report(
            resume_text=resume_text,
            job_info=job_info,
            portfolio_info=portfolio_info,
            job_matching_info=job_matching_info
        )
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interview-checklist", response_model=InterviewChecklistResponse)
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
            company_name=request.company_name
        )
        
        return checklist_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/strengths-weaknesses", response_model=StrengthsWeaknessesResponse)
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
            company_name=request.company_name
        )
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interview-guideline", response_model=InterviewGuidelineResponse)
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
            company_name=request.company_name
        )
        
        return guideline_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluation-criteria", response_model=EvaluationCriteriaResponse)
async def suggest_evaluation_criteria(request: EvaluationCriteriaRequest, db: Session = Depends(get_db)):
    """평가 기준 자동 제안 API"""
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
        
        # LangGraph 기반 평가 기준 제안
        from agent.agents.interview_question_node import suggest_evaluation_criteria
        criteria_result = suggest_evaluation_criteria(
            resume_text=resume_text,
            job_info=job_info,
            company_name=request.company_name
        )
        
        return criteria_result

@router.post("/company-questions", response_model=CompanyQuestionResponse)
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

@router.post("/project-questions", response_model=ProjectQuestionResponse)
async def generate_project_questions(request: ProjectQuestionRequest, db: Session = Depends(get_db)):
    """자기소개서/이력서 기반 프로젝트 면접 질문 생성"""
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
        
        # LangGraph 기반 프로젝트 질문 생성
        from agent.agents.interview_question_node import generate_common_question_bundle
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
        from agent.tools.portfolio_tool import portfolio_tool
        
        # 포트폴리오 링크 수집 및 분석
        portfolio_links = portfolio_tool.extract_portfolio_links(resume_text, request.name)
        portfolio_info = portfolio_tool.analyze_portfolio_content(portfolio_links)
        
        # 통합 질문 생성
        question_bundle = generate_common_question_bundle(
            resume_text=resume_text,
            company_name=request.company_name,
            portfolio_info=portfolio_info
        )
        
        # 모든 질문을 하나의 리스트로 통합
        all_questions = []
        all_questions.extend(question_bundle.get("인성/동기", []))
        all_questions.extend(question_bundle.get("프로젝트 경험", []))
        all_questions.extend(question_bundle.get("회사 관련", []))
        all_questions.extend(question_bundle.get("상황 대처", []))
        
        return {
            "questions": all_questions,
            "question_bundle": question_bundle,
            "portfolio_info": portfolio_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/job-questions", response_model=JobQuestionResponse)
async def generate_job_questions(request: JobQuestionRequest, db: Session = Depends(get_db)):
    """지원서 기반 직무 맞춤형 면접 질문 생성"""
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
        
        # LangGraph 기반 직무 질문 생성
        from agent.agents.interview_question_node import generate_job_question_bundle
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
        
        # 직무 맞춤형 질문 생성
        question_bundle = generate_job_question_bundle(
            resume_text=resume_text,
            job_info=job_info,
            # company_name=request.company_name,    # 이건, company_name이 공고 제목에서 회사명을 추출한 것(등록된것과다를수있음)
            # 실제데이터가아니라서 이게 더나은거같기도하고
            company_name=actual_company_name,
            job_matching_info=job_matching_info
        )
        
        # 모든 질문을 하나의 리스트로 통합
        all_questions = []
        all_questions.extend(question_bundle.get("직무 적합성", []))
        all_questions.extend(question_bundle.get("기술 스택", []))
        all_questions.extend(question_bundle.get("업무 이해도", []))
        all_questions.extend(question_bundle.get("경력 활용", []))
        all_questions.extend(question_bundle.get("상황 대처", []))
        
        return {
            "questions": all_questions,
            "question_bundle": question_bundle,
            "job_matching_info": job_matching_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
