from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any, List
import json
import re
from agent.utils.llm_cache import redis_cache

# 데이터베이스 모델 import
try:
    from backend.app.models.resume import Resume
    from backend.app.models.spec import Spec
    from backend.app.models.job import JobPost
    from backend.app.models.application import Application
    from sqlalchemy.orm import Session
except ImportError:
    # agent 디렉토리에서 실행할 때를 위한 fallback
    Resume = None
    Spec = None
    JobPost = None
    Application = None
    Session = None

# 공통 유틸리티 import
from agent.utils.resume_utils import combine_resume_and_specs

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini")

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

def calculate_job_matching_score(resume_text: str, job_info: str) -> float:
    """이력서와 직무 정보를 기반으로 객관적인 매칭 점수 계산"""
    
    score = 0.0
    total_weight = 0.0
    
    # 1. 기술 스택 매칭 (가중치: 0.3)
    tech_score = calculate_tech_stack_matching(resume_text, job_info)
    score += tech_score * 0.3
    total_weight += 0.3
    
    # 2. 경험 관련성 (가중치: 0.25)
    experience_score = calculate_experience_relevance(resume_text, job_info)
    score += experience_score * 0.25
    total_weight += 0.25
    
    # 3. 자격요건 충족도 (가중치: 0.2)
    qualification_score = calculate_qualification_match(resume_text, job_info)
    score += qualification_score * 0.2
    total_weight += 0.2
    
    # 4. 키워드 매칭 (가중치: 0.15)
    keyword_score = calculate_keyword_matching(resume_text, job_info)
    score += keyword_score * 0.15
    total_weight += 0.15
    
    # 5. 학력/배경 적합성 (가중치: 0.1)
    background_score = calculate_background_fit(resume_text, job_info)
    score += background_score * 0.1
    total_weight += 0.1
    
    # 최종 점수 계산 (0.0 ~ 1.0)
    final_score = score / total_weight if total_weight > 0 else 0.0
    return round(final_score, 2)

def calculate_tech_stack_matching(resume_text: str, job_info: str) -> float:
    """기술 스택 매칭 점수 계산"""
    tech_keywords = [
        "Java", "Python", "JavaScript", "React", "Vue", "Angular", "Node.js",
        "Spring", "Django", "Flask", "MySQL", "PostgreSQL", "MongoDB",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git",
        "HTML", "CSS", "TypeScript", "PHP", "C++", "C#", ".NET"
    ]
    
    resume_tech_count = sum(1 for tech in tech_keywords if tech.lower() in resume_text.lower())
    job_tech_count = sum(1 for tech in tech_keywords if tech.lower() in job_info.lower())
    
    if job_tech_count == 0:
        return 0.5  # 기술 요구사항이 없으면 중간 점수
    
    matching_techs = []
    for tech in tech_keywords:
        if tech.lower() in job_info.lower() and tech.lower() in resume_text.lower():
            matching_techs.append(tech)
    
    match_ratio = len(matching_techs) / job_tech_count if job_tech_count > 0 else 0
    return min(match_ratio, 1.0)

def calculate_experience_relevance(resume_text: str, job_info: str) -> float:
    """경험 관련성 점수 계산"""
    experience_keywords = [
        "프로젝트", "개발", "설계", "분석", "관리", "운영", "테스트",
        "프론트엔드", "백엔드", "풀스택", "데이터베이스", "API",
        "웹", "모바일", "앱", "시스템", "서버", "클라우드"
    ]
    
    resume_exp_count = sum(1 for exp in experience_keywords if exp in resume_text)
    job_exp_count = sum(1 for exp in experience_keywords if exp in job_info)
    
    if job_exp_count == 0:
        return 0.5
    
    # 경험 관련성 점수 계산
    relevance_score = min(resume_exp_count / max(job_exp_count, 1), 1.0)
    return relevance_score

def calculate_qualification_match(resume_text: str, job_info: str) -> float:
    """자격요건 충족도 점수 계산"""
    qualification_keywords = [
        "학사", "석사", "박사", "대학교", "대학원", "졸업",
        "정보처리기사", "컴활", "토익", "토플", "오픽",
        "자격증", "인증", "수료", "과정", "교육"
    ]
    
    resume_qual_count = sum(1 for qual in qualification_keywords if qual in resume_text)
    job_qual_count = sum(1 for qual in qualification_keywords if qual in job_info)
    
    if job_qual_count == 0:
        return 0.5
    
    # 자격요건 충족도 계산
    match_score = min(resume_qual_count / max(job_qual_count, 1), 1.0)
    return match_score

def calculate_keyword_matching(resume_text: str, job_info: str) -> float:
    """키워드 매칭 점수 계산"""
    matching_keywords = []
    
    # 공공기관 관련
    if any(keyword in job_info for keyword in ["공공", "기관", "정부"]):
        if any(keyword in resume_text for keyword in ["공공", "기관", "정부"]):
            matching_keywords.append("공공기관")
    
    # PM/PL 관련
    if any(keyword in job_info for keyword in ["PM", "PL", "프로젝트관리"]):
        if any(keyword in resume_text for keyword in ["PM", "PL", "프로젝트", "관리"]):
            matching_keywords.append("프로젝트관리")
    
    # IT/개발 관련
    if any(keyword in job_info for keyword in ["IT", "SI", "개발", "프로그래밍"]):
        if any(keyword in resume_text for keyword in ["IT", "SI", "개발", "프로그래밍"]):
            matching_keywords.append("IT개발")
    
    # 매칭 키워드가 있으면 높은 점수, 없으면 낮은 점수
    return 0.8 if matching_keywords else 0.2

def calculate_background_fit(resume_text: str, job_info: str) -> float:
    """학력/배경 적합성 점수 계산"""
    # 학력 수준 매칭
    education_levels = {
        "고등학교": 1,
        "전문대": 2,
        "대학교": 3,
        "대학원": 4,
        "박사": 5
    }
    
    resume_edu_level = 0
    job_edu_level = 0
    
    for edu, level in education_levels.items():
        if edu in resume_text:
            resume_edu_level = max(resume_edu_level, level)
        if edu in job_info:
            job_edu_level = max(job_edu_level, level)
    
    if job_edu_level == 0:
        return 0.5
    
    # 학력 적합성 점수 (요구 학력 이상이면 높은 점수)
    if resume_edu_level >= job_edu_level:
        return 0.9
    elif resume_edu_level >= job_edu_level - 1:
        return 0.6
    else:
        return 0.3

# 종합 분석 리포트 생성 프롬프트
comprehensive_analysis_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 이력서 정보입니다:
    ---
    {resume_text}
    ---
    
    직무 정보 (있는 경우):
    ---
    {job_info}
    ---
    
    포트폴리오 분석 (있는 경우):
    ---
    {portfolio_info}
    ---
    
    직무 매칭 정보 (있는 경우):
    ---
    {job_matching_info}
    ---
    
    위 정보를 바탕으로 면접관을 위한 종합 분석 리포트를 생성해 주세요.
    다음 항목들을 포함해서 작성해 주세요:
    
    1. 이력서 요약 
    2. 주요 프로젝트 3-4개 (각각 50자 이내)
    3. 기술 스택 (구체적인 기술명들)
    4. 소프트 스킬 (커뮤니케이션, 리더십 등)
    5. 경험 하이라이트 (주목할 만한 경험들)
    6. 잠재적 우려사항 (면접에서 확인해야 할 부분들)
    7. 면접 집중 영역 (중점적으로 질문할 부분들)
    
    JSON 형식으로 응답해 주세요:
    {{
        "resume_summary": "요약",
        "key_projects": ["프로젝트1", "프로젝트2"],
        "technical_skills": ["기술1", "기술2"],
        "soft_skills": ["스킬1", "스킬2"],
        "experience_highlights": ["하이라이트1", "하이라이트2"],
        "potential_concerns": ["우려사항1", "우려사항2"],
        "interview_focus_areas": ["집중영역1", "집중영역2"],
        "portfolio_analysis": "포트폴리오 분석 결과",
        "job_matching_score": 0.85,
        "job_matching_details": "직무 매칭 상세 분석"
    }}
    """
)

# LLM 체인 초기화
comprehensive_analysis_chain = LLMChain(llm=llm, prompt=comprehensive_analysis_prompt)

@redis_cache()
def generate_comprehensive_analysis_report(resume_text: str, job_info: str = "", portfolio_info: str = "", job_matching_info: str = ""):
    """종합 분석 리포트 생성"""
    try:
        # 객관적인 매칭 점수 계산
        calculated_score = calculate_job_matching_score(resume_text, job_info) if job_info else 0.5
        
        result = comprehensive_analysis_chain.invoke({
            "resume_text": resume_text,
            "job_info": job_info or "직무 정보가 없습니다.",
            "portfolio_info": portfolio_info or "포트폴리오 정보가 없습니다.",
            "job_matching_info": job_matching_info or "직무 매칭 정보가 없습니다."
        })
        
        # JSON 파싱 (더 안전한 방식)
        text = result.get("text", "")
        print(f"AI 응답: {text[:200]}...")  # 디버깅용
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                # 계산된 객관적 점수로 AI 점수 대체 또는 보완
                if "job_matching_score" not in analysis_data or analysis_data["job_matching_score"] is None:
                    analysis_data["job_matching_score"] = calculated_score
                else:
                    # AI 점수와 계산된 점수의 평균 사용 (더 안정적인 결과)
                    ai_score = analysis_data["job_matching_score"]
                    analysis_data["job_matching_score"] = round((ai_score + calculated_score) / 2, 2)
                
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"JSON 파싱 오류: {je}")
        
        # JSON이 없으면 기본 응답 반환
        return {
            "resume_summary": "AI 응답을 파싱할 수 없습니다. 기본 분석을 제공합니다.",
            "key_projects": ["프로젝트 경험 분석 필요"],
            "technical_skills": ["기술 스택 분석 필요"],
            "soft_skills": ["소프트 스킬 분석 필요"],
            "experience_highlights": ["주요 경험 분석 필요"],
            "potential_concerns": ["면접 시 확인 필요"],
            "interview_focus_areas": ["기술력", "경험", "인성"],
            "portfolio_analysis": portfolio_info or "포트폴리오 정보가 없습니다.",
            "job_matching_score": calculated_score,
            "job_matching_details": job_matching_info or "직무 매칭 정보가 없습니다."
        }
    except Exception as e:
        print(f"종합 분석 오류: {str(e)}")
        # 기본 응답 반환
        return {
            "resume_summary": "종합 분석 중 오류가 발생했습니다.",
            "key_projects": [],
            "technical_skills": [],
            "soft_skills": [],
            "experience_highlights": [],
            "potential_concerns": [],
            "interview_focus_areas": [],
            "portfolio_analysis": portfolio_info or "포트폴리오 정보가 없습니다.",
            "job_matching_score": calculated_score if 'calculated_score' in locals() else 0.5,
            "job_matching_details": job_matching_info or "직무 매칭 정보가 없습니다."
        }

@redis_cache()
def generate_comprehensive_analysis_from_db(resume_id: int, application_id: Optional[int] = None, db: Session = None):
    """데이터베이스에서 직접 데이터를 가져와서 종합 분석 리포트 생성"""
    if not db:
        raise ValueError("데이터베이스 세션이 필요합니다.")
    
    try:
        # 이력서 정보 수집
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            raise ValueError("이력서를 찾을 수 없습니다.")
        
        specs = db.query(Spec).filter(Spec.resume_id == resume_id).all()
        resume_text = combine_resume_and_specs(resume, specs)
        
        # 직무 정보 수집 (application_id가 있는 경우)
        job_info = ""
        job_matching_info = ""
        if application_id:
            application = db.query(Application).filter(Application.id == application_id).first()
            if application:
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                if job_post:
                    job_info = parse_job_post_data(job_post)
                    job_matching_info = analyze_job_matching(resume_text, job_info)
        
        # 포트폴리오 정보 수집 (임시로 빈 문자열)
        portfolio_info = ""
        
        # 종합 분석 리포트 생성
        return generate_comprehensive_analysis_report(
            resume_text=resume_text,
            job_info=job_info,
            portfolio_info=portfolio_info,
            job_matching_info=job_matching_info
        )
        
    except Exception as e:
        print(f"데이터베이스 기반 종합 분석 오류: {str(e)}")
        raise e 