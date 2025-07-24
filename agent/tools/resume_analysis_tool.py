from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any
import json
import re
from agent.utils.llm_cache import redis_cache

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini")

# 이력서 분석 리포트 생성 프롬프트
resume_analysis_prompt = PromptTemplate.from_template(
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
    
    위 정보를 바탕으로 면접관을 위한 이력서 분석 리포트를 생성해 주세요.
    다음 항목들을 포함해서 작성해 주세요:
    
    1. 이력서 요약 (200자 이내)
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
resume_analysis_chain = LLMChain(llm=llm, prompt=resume_analysis_prompt)

@redis_cache()
def generate_resume_analysis_report(resume_text: str, job_info: str = "", portfolio_info: str = "", job_matching_info: str = ""):
    """이력서 분석 리포트 생성"""
    try:
        result = resume_analysis_chain.invoke({
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
            "job_matching_score": 0.5,
            "job_matching_details": job_matching_info or "직무 매칭 정보가 없습니다."
        }
    except Exception as e:
        print(f"이력서 분석 오류: {str(e)}")
        # 기본 응답 반환
        return {
            "resume_summary": "이력서 분석 중 오류가 발생했습니다.",
            "key_projects": [],
            "technical_skills": [],
            "soft_skills": [],
            "experience_highlights": [],
            "potential_concerns": [],
            "interview_focus_areas": [],
            "portfolio_analysis": portfolio_info or "포트폴리오 정보가 없습니다.",
            "job_matching_score": None,
            "job_matching_details": job_matching_info or "직무 매칭 정보가 없습니다."
        } 