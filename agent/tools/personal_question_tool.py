"""
개인별 면접 질문 생성 도구
서류 합격자의 이력서를 기반으로 개인별 맞춤형 면접 질문을 생성합니다.
"""

import json
from typing import Dict, List, Any
from langchain_core.tools import tool


@tool
def generate_personal_interview_questions(
    resume_data: Dict[str, Any],
    job_posting: str,
    company_name: str = "회사"
) -> Dict[str, Any]:
    """
    서류 합격자의 이력서를 기반으로 개인별 맞춤형 면접 질문을 생성합니다.
    
    Args:
        resume_data: 지원자의 이력서 및 스펙 데이터
        job_posting: 채용공고 내용
        company_name: 회사명
    
    Returns:
        개인별 면접 질문 카테고리별 분류
    """
    
    # 이력서 데이터에서 주요 정보 추출
    personal_info = resume_data.get("personal_info", {})
    education = resume_data.get("education", {})
    experience = resume_data.get("experience", {})
    skills = resume_data.get("skills", {})
    projects = resume_data.get("projects", [])
    activities = resume_data.get("activities", [])
    
    # 지원자 이름
    applicant_name = personal_info.get("name", "지원자")
    
    # 학력 정보
    university = education.get("university", "")
    major = education.get("major", "")
    degree = education.get("degree", "")
    gpa = education.get("gpa", "")
    
    # 경험 정보
    companies = experience.get("companies", [])
    position = experience.get("position", "")
    duration = experience.get("duration", "")
    
    # 기술 스택
    programming_languages = skills.get("programming_languages", [])
    frameworks = skills.get("frameworks", [])
    databases = skills.get("databases", [])
    tools = skills.get("tools", [])
    
    # 프로젝트 정보
    project_names = [p.get("name", "") for p in projects if p.get("name")]
    project_descriptions = [p.get("description", "") for p in projects if p.get("description")]
    
    # 활동 정보
    activity_names = [a.get("name", "") for a in activities if a.get("name")]
    
    prompt = f"""
    아래의 지원자 정보를 바탕으로 개인별 맞춤형 면접 질문을 생성해주세요.
    
    지원자 정보:
    - 이름: {applicant_name}
    - 학력: {university} {major} {degree} (GPA: {gpa})
    - 경력: {', '.join(companies)} {position} ({duration})
    - 프로그래밍 언어: {', '.join(programming_languages)}
    - 프레임워크: {', '.join(frameworks)}
    - 데이터베이스: {', '.join(databases)}
    - 도구: {', '.join(tools)}
    - 주요 프로젝트: {', '.join(project_names)}
    - 주요 활동: {', '.join(activity_names)}
    
    채용공고:
    {job_posting}
    
    회사: {company_name}
    
    다음 카테고리별로 개인별 질문을 생성해주세요:
    1. 학력/전공 관련 질문 (3-5개)
    2. 경력/직무 관련 질문 (3-5개)
    3. 기술 스택 관련 질문 (3-5개)
    4. 프로젝트 경험 관련 질문 (3-5개)
    5. 인성/동기 관련 질문 (3-5개)
    6. 회사/직무 적합성 질문 (3-5개)
    
    각 질문은 지원자의 구체적인 경험과 스펙을 바탕으로 개인화되어야 합니다.
    
    응답 형식 (JSON):
    {{
        "applicant_name": "{applicant_name}",
        "questions": {{
            "학력/전공": [
                "질문1",
                "질문2",
                "질문3"
            ],
            "경력/직무": [
                "질문1",
                "질문2",
                "질문3"
            ],
            "기술 스택": [
                "질문1",
                "질문2",
                "질문3"
            ],
            "프로젝트 경험": [
                "질문1",
                "질문2",
                "질문3"
            ],
            "인성/동기": [
                "질문1",
                "질문2",
                "질문3"
            ],
            "회사/직무 적합성": [
                "질문1",
                "질문2",
                "질문3"
            ]
        }},
        "summary": "이 지원자에 대한 면접 포인트 요약"
    }}
    """
    
    # 실제로는 LLM을 호출하여 질문 생성
    # 여기서는 예시 응답을 반환
    sample_response = {
        "applicant_name": applicant_name,
        "questions": {
            "학력/전공": [
                f"{university} {major} 전공 과정에서 가장 어려웠던 과목은 무엇이고, 어떻게 극복하셨나요?",
                f"{major} 전공 지식을 실제 프로젝트에 어떻게 활용해보셨나요?",
                f"학부 과정에서 배운 이론 중 현재 업무에 가장 도움이 되는 것은 무엇인가요?"
            ],
            "경력/직무": [
                f"{', '.join(companies)}에서 {position}로 일하시면서 가장 성취감을 느꼈던 프로젝트는 무엇인가요?",
                f"{duration}간의 경력에서 가장 큰 도전과제는 무엇이었고, 어떻게 해결하셨나요?",
                f"이전 회사에서 팀워크를 통해 성과를 낸 구체적인 사례를 들어주세요."
            ],
            "기술 스택": [
                f"{', '.join(programming_languages)} 중에서 가장 자신 있는 언어는 무엇이고, 그 이유는 무엇인가요?",
                f"{', '.join(frameworks)} 프레임워크를 사용하면서 겪었던 문제점과 해결 방법을 설명해주세요.",
                f"새로운 기술을 학습할 때 어떤 방법을 사용하시나요?"
            ],
            "프로젝트 경험": [
                f"{', '.join(project_names)} 프로젝트에서 본인의 역할과 기여도를 설명해주세요.",
                f"프로젝트 진행 중 발생한 문제점과 해결 과정을 구체적으로 설명해주세요.",
                f"프로젝트 완료 후 개선하고 싶은 부분이 있다면 무엇인가요?"
            ],
            "인성/동기": [
                f"{company_name}에 지원하게 된 구체적인 동기는 무엇인가요?",
                f"앞으로 5년간의 커리어 계획을 어떻게 세우고 계신가요?",
                f"업무 외에 개인적으로 관심 있는 분야나 학습하고 있는 것이 있나요?"
            ],
            "회사/직무 적합성": [
                f"{company_name}의 문화나 비전 중에서 본인과 가장 잘 맞는다고 생각하는 부분은 무엇인가요?",
                f"지원하신 직무에서 본인의 강점을 어떻게 발휘할 수 있을까요?",
                f"팀 프로젝트에서 본인의 역할과 협업 스타일은 어떤 것인가요?"
            ]
        },
        "summary": f"{applicant_name} 지원자는 {university} {major} 전공자로 {duration}간의 {position} 경력을 보유하고 있습니다. {', '.join(programming_languages)} 등 다양한 기술 스택을 보유하고 있으며, {', '.join(project_names)} 등의 프로젝트 경험이 있습니다. 면접 시 학력과 경력의 연계성, 기술적 역량, 그리고 {company_name}에 대한 적합성을 중점적으로 확인하는 것이 좋겠습니다."
    }
    
    return sample_response


@tool
def generate_batch_personal_questions(
    applicants_data: List[Dict[str, Any]],
    job_posting: str,
    company_name: str = "회사"
) -> Dict[str, Any]:
    """
    여러 서류 합격자에 대해 일괄적으로 개인별 면접 질문을 생성합니다.
    
    Args:
        applicants_data: 서류 합격자들의 이력서 데이터 리스트
        job_posting: 채용공고 내용
        company_name: 회사명
    
    Returns:
        각 지원자별 개인별 면접 질문
    """
    
    results = {}
    
    for applicant in applicants_data:
        applicant_name = applicant.get("name", "지원자")
        resume_data = applicant.get("resume_data", {})
        
        # 개별 지원자에 대한 질문 생성
        personal_questions = generate_personal_interview_questions(
            resume_data=resume_data,
            job_posting=job_posting,
            company_name=company_name
        )
        
        results[applicant_name] = personal_questions
    
    return {
        "total_applicants": len(applicants_data),
        "company_name": company_name,
        "personal_questions": results
    } 