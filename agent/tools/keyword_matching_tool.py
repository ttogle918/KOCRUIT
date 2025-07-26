from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any, List
import json
import re
from agent.utils.llm_cache import redis_cache

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini")

# 키워드 매칭 분석 프롬프트
keyword_matching_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 이력서 정보입니다:
    ---
    {resume_text}
    ---
    
    직무 요구사항 및 키워드:
    ---
    {job_info}
    ---
    
    위 정보를 바탕으로 직무 요구사항과 이력서 간의 키워드 매칭 분석을 수행해 주세요.
    
    다음 관점에서 분석해 주세요:
    
    1. 필수 기술 키워드 매칭 (채용공고의 필수 기술과 이력서 매칭도)
    2. 우대 기술 키워드 매칭 (우대사항과 이력서 매칭도)
    3. 경험 키워드 매칭 (요구 경험과 실제 경험 매칭도)
    4. 자격증/인증 매칭 (요구 자격과 보유 자격 매칭도)
    5. 소프트 스킬 매칭 (요구 역량과 보유 역량 매칭도)
    6. 누락된 중요 키워드 (부족한 부분)
    7. 추가 강점 키워드 (예상치 못한 장점)
    8. 매칭 점수 및 보완 방안
    
    JSON 형식으로 응답해 주세요:
    {{
        "technical_skills_matching": {{
            "required_skills": [
                {{"keyword": "Java", "found": true, "context": "3년 Java 개발 경험", "relevance_score": 95}},
                {{"keyword": "Spring", "found": true, "context": "Spring Boot 프로젝트 수행", "relevance_score": 90}},
                {{"keyword": "Docker", "found": false, "context": "", "relevance_score": 0}}
            ],
            "preferred_skills": [
                {{"keyword": "AWS", "found": true, "context": "AWS EC2, S3 사용 경험", "relevance_score": 85}},
                {{"keyword": "Kubernetes", "found": false, "context": "", "relevance_score": 0}}
            ],
            "matching_percentage": 75,
            "overall_assessment": "기술 스택 매칭도 평가"
        }},
        "experience_matching": {{
            "required_experience": [
                {{"requirement": "3년 이상 개발 경험", "found": true, "context": "5년 개발 경험", "match_score": 100}},
                {{"requirement": "팀 리더 경험", "found": true, "context": "2년간 팀장 역할", "match_score": 95}}
            ],
            "industry_experience": [
                {{"requirement": "핀테크 경험", "found": false, "context": "", "match_score": 0}},
                {{"requirement": "대규모 서비스 경험", "found": true, "context": "월 100만 사용자 서비스 개발", "match_score": 90}}
            ],
            "matching_percentage": 82,
            "gap_analysis": "경험 부족 영역 분석"
        }},
        "qualification_matching": {{
            "required_certifications": [
                {{"requirement": "정보처리기사", "found": true, "context": "2020년 취득", "relevance": "높음"}},
                {{"requirement": "관련 학위", "found": true, "context": "컴퓨터공학 학사", "relevance": "높음"}}
            ],
            "preferred_certifications": [
                {{"requirement": "AWS 자격증", "found": false, "context": "", "relevance": "중간"}},
                {{"requirement": "PMP", "found": false, "context": "", "relevance": "낮음"}}
            ],
            "matching_percentage": 60,
            "certification_gaps": ["AWS 자격증", "클라우드 관련 인증"]
        }},
        "soft_skills_matching": {{
            "required_soft_skills": [
                {{"skill": "의사소통", "found": true, "evidence": "다부서 협업 프로젝트 리드", "strength": "높음"}},
                {{"skill": "리더십", "found": true, "evidence": "팀장 경험", "strength": "높음"}},
                {{"skill": "문제해결", "found": true, "evidence": "성능 최적화 프로젝트", "strength": "중간"}}
            ],
            "matching_percentage": 90,
            "soft_skill_assessment": "소프트 스킬 종합 평가"
        }},
        "keyword_gaps": {{
            "critical_missing": ["Docker", "CI/CD", "마이크로서비스"],
            "nice_to_have_missing": ["GraphQL", "Redis", "Elasticsearch"],
            "impact_assessment": "누락 키워드의 중요도 평가",
            "learning_priority": ["Docker", "CI/CD", "AWS 자격증"]
        }},
        "unexpected_strengths": {{
            "bonus_skills": ["머신러닝", "데이터 분석", "UI/UX 디자인"],
            "unique_experiences": ["스타트업 창업 경험", "오픈소스 기여"],
            "added_value": "예상치 못한 강점들이 주는 부가가치",
            "differentiation": "차별화 포인트"
        }},
        "matching_summary": {{
            "overall_match_score": 78,
            "match_grade": "B+",
            "strengths": ["Java/Spring 전문성", "팀 리더십", "의사소통"],
            "weaknesses": ["클라우드 기술", "DevOps", "최신 프레임워크"],
            "recommendation": "추천/조건부 추천/검토 필요/비추천",
            "hiring_confidence": 85
        }},
        "improvement_roadmap": {{
            "immediate_actions": ["Docker 학습", "AWS 기초 과정"],
            "short_term_goals": ["CI/CD 파이프라인 구축 경험", "AWS 자격증 취득"],
            "long_term_development": ["클라우드 아키텍처 전문성", "마이크로서비스 설계"],
            "timeline": "3개월/6개월/1년 단위 계획"
        }}
    }}
    """
)

# LLM 체인 초기화
keyword_matching_chain = LLMChain(llm=llm, prompt=keyword_matching_prompt)

@redis_cache()
def generate_keyword_matching_analysis(resume_text: str, job_info: str = ""):
    """키워드 매칭 분석 생성"""
    try:
        result = keyword_matching_chain.invoke({
            "resume_text": resume_text,
            "job_info": job_info or "직무 정보가 없습니다."
        })
        
        # JSON 파싱
        text = result.get("text", "")
        print(f"키워드 매칭 AI 응답: {text[:200]}...")
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"키워드 매칭 JSON 파싱 오류: {je}")
        
        # 기본 응답 반환
        return {
            "technical_skills_matching": {
                "required_skills": [],
                "preferred_skills": [],
                "matching_percentage": 50,
                "overall_assessment": "분석 필요"
            },
            "experience_matching": {
                "required_experience": [],
                "industry_experience": [],
                "matching_percentage": 50,
                "gap_analysis": "분석 필요"
            },
            "qualification_matching": {
                "required_certifications": [],
                "preferred_certifications": [],
                "matching_percentage": 50,
                "certification_gaps": ["분석 필요"]
            },
            "soft_skills_matching": {
                "required_soft_skills": [],
                "matching_percentage": 50,
                "soft_skill_assessment": "분석 필요"
            },
            "keyword_gaps": {
                "critical_missing": ["분석 필요"],
                "nice_to_have_missing": ["분석 필요"],
                "impact_assessment": "분석 필요",
                "learning_priority": ["분석 필요"]
            },
            "unexpected_strengths": {
                "bonus_skills": ["분석 필요"],
                "unique_experiences": ["분석 필요"],
                "added_value": "분석 필요",
                "differentiation": "분석 필요"
            },
            "matching_summary": {
                "overall_match_score": 50,
                "match_grade": "분석 필요",
                "strengths": ["분석 필요"],
                "weaknesses": ["분석 필요"],
                "recommendation": "분석 필요",
                "hiring_confidence": 50
            },
            "improvement_roadmap": {
                "immediate_actions": ["분석 필요"],
                "short_term_goals": ["분석 필요"],
                "long_term_development": ["분석 필요"],
                "timeline": "분석 필요"
            }
        }
        
    except Exception as e:
        print(f"키워드 매칭 분석 오류: {str(e)}")
        return {
            "error": f"키워드 매칭 분석 중 오류가 발생했습니다: {str(e)}",
            "technical_skills_matching": {},
            "experience_matching": {},
            "qualification_matching": {},
            "soft_skills_matching": {},
            "keyword_gaps": {},
            "unexpected_strengths": {},
            "matching_summary": {},
            "improvement_roadmap": {}
        } 