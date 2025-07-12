from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import api_key
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.interview_question import InterviewQuestion, InterviewQuestionCreate
from app.models.resume import Resume, Spec
from pydantic import BaseModel

from app.api.v1.company_question_rag import generate_questions

router = APIRouter()

class CompanyQuestionRequest(BaseModel):
    company_name: str

class ProjectQuestionRequest(BaseModel):
    resume_id: int
    company_name: str = ""
    name: str = ""

class CompanyQuestionResponse(BaseModel):
    questions: list[str]

class ProjectQuestionResponse(BaseModel):
    questions: list[str]
    question_bundle: dict
    portfolio_info: str

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
