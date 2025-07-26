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

# 상세 분석 프롬프트
detailed_analysis_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 이력서 정보입니다:
    ---
    {resume_text}
    ---
    
    직무 정보 (있는 경우):
    ---
    {job_info}
    ---
    
    위 정보를 바탕으로 지원자의 상세 분석을 수행해 주세요.
    다음 항목들을 심도있게 분석해 주세요:
    
    1. 핵심 역량 분석 (기술적/비기술적 역량을 구체적으로)
    2. 경험의 깊이와 폭 (각 경험의 수준과 범위)
    3. 성장 가능성 (학습 능력, 적응력, 발전 잠재력)
    4. 문제 해결 능력 (구체적 사례와 접근 방식)
    5. 리더십과 협업 능력 (팀워크, 의사소통, 영향력)
    6. 전문성 수준 (해당 분야에서의 전문 지식과 경험)
    7. 약점과 개선 영역 (부족한 부분과 발전 방향)
    8. 직무 적합성 점수 (0-100점)
    
    JSON 형식으로 응답해 주세요:
    {{
        "core_competencies": {{
            "technical_skills": ["기술1: 상세설명", "기술2: 상세설명"],
            "soft_skills": ["스킬1: 상세설명", "스킬2: 상세설명"],
            "expertise_level": "초급/중급/고급"
        }},
        "experience_analysis": {{
            "depth_score": 85,
            "breadth_score": 70,
            "quality_assessment": "경험의 질에 대한 평가",
            "standout_experiences": ["특별한 경험1", "특별한 경험2"]
        }},
        "growth_potential": {{
            "learning_ability": 90,
            "adaptability": 80,
            "innovation_capacity": 75,
            "assessment": "성장 가능성에 대한 종합 평가"
        }},
        "problem_solving": {{
            "analytical_thinking": 85,
            "creative_solutions": 70,
            "case_examples": ["문제해결 사례1", "문제해결 사례2"],
            "approach_style": "문제 해결 접근 방식"
        }},
        "leadership_collaboration": {{
            "leadership_score": 75,
            "teamwork_score": 85,
            "communication_score": 80,
            "examples": ["리더십/협업 사례1", "리더십/협업 사례2"]
        }},
        "specialization": {{
            "domain_expertise": 80,
            "industry_knowledge": 75,
            "unique_strengths": ["독특한 강점1", "독특한 강점2"],
            "competitive_advantages": ["경쟁 우위1", "경쟁 우위2"]
        }},
        "improvement_areas": {{
            "weaknesses": ["약점1", "약점2"],
            "development_needs": ["개발 필요 영역1", "개발 필요 영역2"],
            "recommendations": ["개선 제안1", "개선 제안2"]
        }},
        "overall_assessment": {{
            "job_fit_score": 82,
            "overall_rating": "A-",
            "hiring_recommendation": "추천/보류/비추천",
            "key_reasons": ["주요 이유1", "주요 이유2", "주요 이유3"]
        }}
    }}
    """
)

# LLM 체인 초기화
detailed_analysis_chain = LLMChain(llm=llm, prompt=detailed_analysis_prompt)

@redis_cache()
def generate_detailed_analysis(resume_text: str, job_info: str = ""):
    """상세 분석 리포트 생성"""
    try:
        result = detailed_analysis_chain.invoke({
            "resume_text": resume_text,
            "job_info": job_info or "직무 정보가 없습니다."
        })
        
        # JSON 파싱
        text = result.get("text", "")
        print(f"상세 분석 AI 응답: {text[:200]}...")
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"상세 분석 JSON 파싱 오류: {je}")
        
        # 기본 응답 반환
        return {
            "core_competencies": {
                "technical_skills": ["분석 필요"],
                "soft_skills": ["분석 필요"],
                "expertise_level": "분석 필요"
            },
            "experience_analysis": {
                "depth_score": 50,
                "breadth_score": 50,
                "quality_assessment": "분석 필요",
                "standout_experiences": ["분석 필요"]
            },
            "growth_potential": {
                "learning_ability": 50,
                "adaptability": 50,
                "innovation_capacity": 50,
                "assessment": "분석 필요"
            },
            "problem_solving": {
                "analytical_thinking": 50,
                "creative_solutions": 50,
                "case_examples": ["분석 필요"],
                "approach_style": "분석 필요"
            },
            "leadership_collaboration": {
                "leadership_score": 50,
                "teamwork_score": 50,
                "communication_score": 50,
                "examples": ["분석 필요"]
            },
            "specialization": {
                "domain_expertise": 50,
                "industry_knowledge": 50,
                "unique_strengths": ["분석 필요"],
                "competitive_advantages": ["분석 필요"]
            },
            "improvement_areas": {
                "weaknesses": ["분석 필요"],
                "development_needs": ["분석 필요"],
                "recommendations": ["분석 필요"]
            },
            "overall_assessment": {
                "job_fit_score": 50,
                "overall_rating": "분석 필요",
                "hiring_recommendation": "분석 필요",
                "key_reasons": ["분석 필요"]
            }
        }
        
    except Exception as e:
        print(f"상세 분석 오류: {str(e)}")
        return {
            "error": f"상세 분석 중 오류가 발생했습니다: {str(e)}",
            "core_competencies": {},
            "experience_analysis": {},
            "growth_potential": {},
            "problem_solving": {},
            "leadership_collaboration": {},
            "specialization": {},
            "improvement_areas": {},
            "overall_assessment": {}
        } 