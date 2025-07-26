from typing import List
from app.models.resume import Resume, Spec

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

def get_complete_resume_data_by_id(resume_id: int, db) -> str:
    """resume_id로 완전한 이력서 데이터 가져오기"""
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            raise ValueError(f"Resume not found: {resume_id}")
        
        specs = db.query(Spec).filter(Spec.resume_id == resume_id).all()
        return combine_resume_and_specs(resume, specs)
        
    except Exception as e:
        print(f"이력서 데이터 조회 오류: {str(e)}")
        raise e

def get_complete_resume_data_by_application_id(application_id: int, db) -> str:
    """application_id로 완전한 이력서 데이터 가져오기"""
    try:
        from app.models.application import Application
        
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application or not application.resume:
            raise ValueError(f"Application or Resume not found: {application_id}")
        
        specs = db.query(Spec).filter(Spec.resume_id == application.resume.id).all()
        return combine_resume_and_specs(application.resume, specs)
        
    except Exception as e:
        print(f"Application 기반 이력서 데이터 조회 오류: {str(e)}")
        raise e

def prepare_resume_for_analysis(resume_id: int = None, application_id: int = None, db = None) -> str:
    """분석 도구들이 사용할 수 있는 통합된 이력서 데이터 준비"""
    if not db:
        raise ValueError("데이터베이스 세션이 필요합니다.")
    
    if resume_id:
        return get_complete_resume_data_by_id(resume_id, db)
    elif application_id:
        return get_complete_resume_data_by_application_id(application_id, db)
    else:
        raise ValueError("resume_id 또는 application_id 중 하나는 필요합니다.")

# 분석 도구들을 위한 통합 인터페이스
def analyze_resume_with_tool(
    tool_function,
    resume_id: int = None, 
    application_id: int = None,
    job_info: str = "",
    db = None,
    **kwargs
):
    """분석 도구들을 위한 통합 인터페이스"""
    try:
        # 완전한 이력서 데이터 준비
        resume_text = prepare_resume_for_analysis(
            resume_id=resume_id,
            application_id=application_id,
            db=db
        )
        
        # 분석 도구 실행
        return tool_function(
            resume_text=resume_text,
            job_info=job_info,
            **kwargs
        )
        
    except Exception as e:
        print(f"이력서 분석 도구 실행 오류: {str(e)}")
        raise e 