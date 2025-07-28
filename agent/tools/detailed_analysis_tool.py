from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any, List
import json
import re
from agent.utils.llm_cache import redis_cache

load_dotenv()

llm = ChatOpenAI(model="gpt-4o")

def analyze_experience_depth_breadth(resume_text: str) -> Dict[str, Any]:
    """경험의 깊이와 폭을 객관적으로 분석"""
    
    # 경험 깊이 분석 기준
    depth_indicators = {
        "leadership_roles": ["팀장", "PM", "PL", "리더", "책임자", "매니저"],
        "project_scale": ["대규모", "엔터프라이즈", "시스템", "플랫폼"],
        "technical_complexity": ["아키텍처", "설계", "최적화", "성능", "보안"],
        "business_impact": ["매출", "고객", "시장", "비즈니스", "전략"],
        "duration": ["3년", "5년", "장기", "지속적"]
    }
    
    # 경험 폭 분석 기준
    breadth_indicators = {
        "diverse_roles": ["개발", "설계", "분석", "관리", "운영", "테스트"],
        "multiple_industries": ["IT", "금융", "제조", "서비스", "공공"],
        "various_technologies": ["프론트엔드", "백엔드", "데이터", "클라우드", "모바일"],
        "different_project_types": ["웹", "모바일", "시스템", "데이터", "AI"]
    }
    
    depth_score = 0
    breadth_score = 0
    
    # 깊이 점수 계산
    for category, keywords in depth_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        depth_score += min(matches * 20, 100)  # 각 카테고리당 최대 20점
    
    # 폭 점수 계산
    for category, keywords in breadth_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        breadth_score += min(matches * 25, 100)  # 각 카테고리당 최대 25점
    
    return {
        "depth_score": min(depth_score, 100),
        "breadth_score": min(breadth_score, 100),
        "depth_analysis": {
            "leadership_experience": any(kw in resume_text for kw in depth_indicators["leadership_roles"]),
            "large_scale_projects": any(kw in resume_text for kw in depth_indicators["project_scale"]),
            "technical_expertise": any(kw in resume_text for kw in depth_indicators["technical_complexity"])
        },
        "breadth_analysis": {
            "role_diversity": len([kw for kw in breadth_indicators["diverse_roles"] if kw in resume_text]),
            "industry_experience": len([kw for kw in breadth_indicators["multiple_industries"] if kw in resume_text]),
            "tech_diversity": len([kw for kw in breadth_indicators["various_technologies"] if kw in resume_text])
        }
    }

def analyze_growth_potential(resume_text: str) -> Dict[str, Any]:
    """성장 가능성을 객관적으로 분석"""
    
    # 학습 능력 지표
    learning_indicators = {
        "new_technologies": ["새로운", "도입", "학습", "습득", "마스터"],
        "certifications": ["자격증", "인증", "수료", "과정", "교육"],
        "continuous_learning": ["지속적", "계속", "발전", "향상", "개선"],
        "adaptation": ["적응", "변화", "새로운 환경", "도전"]
    }
    
    # 혁신 능력 지표
    innovation_indicators = {
        "creative_solutions": ["창의적", "혁신", "새로운 방법", "개선안"],
        "problem_solving": ["문제 해결", "해결책", "대안", "최적화"],
        "initiative": ["주도적", "자발적", "제안", "시도"]
    }
    
    learning_score = 0
    innovation_score = 0
    
    # 학습 능력 점수 계산
    for category, keywords in learning_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        learning_score += min(matches * 25, 100)
    
    # 혁신 능력 점수 계산
    for category, keywords in innovation_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        innovation_score += min(matches * 33, 100)
    
    return {
        "learning_ability": min(learning_score, 100),
        "innovation_capacity": min(innovation_score, 100),
        "adaptability": calculate_adaptability_score(resume_text),
        "growth_indicators": {
            "continuous_learning": any(kw in resume_text for kw in learning_indicators["continuous_learning"]),
            "new_skill_acquisition": any(kw in resume_text for kw in learning_indicators["new_technologies"]),
            "certification_effort": any(kw in resume_text for kw in learning_indicators["certifications"])
        }
    }

def calculate_adaptability_score(resume_text: str) -> int:
    """적응력 점수 계산"""
    adaptability_keywords = ["적응", "변화", "새로운 환경", "도전", "유연", "개방적"]
    matches = sum(1 for keyword in adaptability_keywords if keyword in resume_text)
    return min(matches * 20, 100)

def analyze_problem_solving_ability(resume_text: str) -> Dict[str, Any]:
    """문제 해결 능력을 객관적으로 분석"""
    
    # 분석적 사고 지표
    analytical_indicators = {
        "data_analysis": ["분석", "데이터", "통계", "리서치", "조사"],
        "systematic_approach": ["체계적", "단계별", "방법론", "프로세스"],
        "root_cause": ["근본 원인", "원인 분석", "문제 파악", "진단"]
    }
    
    # 창의적 해결 지표
    creative_indicators = {
        "creative_solutions": ["창의적", "혁신적", "새로운 방법", "대안"],
        "optimization": ["최적화", "개선", "효율화", "향상"],
        "out_of_box": ["틀을 벗어난", "다른 관점", "새로운 접근"]
    }
    
    # 구체적 사례 추출
    case_examples = extract_case_examples(resume_text)
    
    analytical_score = 0
    creative_score = 0
    
    # 분석적 사고 점수
    for category, keywords in analytical_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        analytical_score += min(matches * 33, 100)
    
    # 창의적 해결 점수
    for category, keywords in creative_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        creative_score += min(matches * 33, 100)
    
    return {
        "analytical_thinking": min(analytical_score, 100),
        "creative_solutions": min(creative_score, 100),
        "case_examples": case_examples,
        "problem_solving_style": determine_solving_style(resume_text)
    }

def extract_case_examples(resume_text: str) -> List[str]:
    """이력서에서 문제 해결 사례 추출"""
    case_patterns = [
        r"문제[를]*\s*해결[하여]*\s*([^.]*)",
        r"개선[하여]*\s*([^.]*)",
        r"최적화[하여]*\s*([^.]*)",
        r"효율[을]*\s*향상[시켜]*\s*([^.]*)"
    ]
    
    examples = []
    for pattern in case_patterns:
        matches = re.findall(pattern, resume_text)
        examples.extend(matches)
    
    return examples[:3]  # 최대 3개 사례

def determine_solving_style(resume_text: str) -> str:
    """문제 해결 스타일 판단"""
    if "문제 해결" in resume_text or "해결책" in resume_text or "대안" in resume_text:
        return "문제 해결 중심"
    elif "창의적" in resume_text or "혁신" in resume_text or "새로운 방법" in resume_text:
        return "창의적 해결 중심"
    elif "최적화" in resume_text or "개선" in resume_text or "효율화" in resume_text:
        return "효율적 해결 중심"
    else:
        return "일반적 해결 중심"

def analyze_expertise_level(resume_text: str) -> Dict[str, Any]:
    """전문성 수준을 객관적으로 분석"""
    
    # 도메인 전문성 지표
    domain_indicators = {
        "years_of_experience": extract_years_of_experience(resume_text),
        "specialized_skills": ["전문", "특화", "전문가", "마스터", "고급"],
        "industry_recognition": ["수상", "인정", "평가", "인증", "자격"],
        "complex_projects": ["복잡한", "고도화", "고급", "엔터프라이즈", "대규모"]
    }
    
    # 업계 지식 지표
    industry_indicators = {
        "industry_terms": ["업계", "시장", "트렌드", "표준", "베스트 프랙티스"],
        "business_understanding": ["비즈니스", "고객", "요구사항", "시장"],
        "regulatory_knowledge": ["규정", "정책", "가이드라인", "컴플라이언스"]
    }
    
    domain_score = 0
    industry_score = 0
    
    # 도메인 전문성 점수
    years_exp = domain_indicators["years_of_experience"]
    domain_score += min(years_exp * 10, 50)  # 경력 1년당 10점, 최대 50점
    
    for category, keywords in domain_indicators.items():
        if category != "years_of_experience":
            matches = sum(1 for keyword in keywords if keyword in resume_text)
            domain_score += min(matches * 10, 50)
    
    # 업계 지식 점수
    for category, keywords in industry_indicators.items():
        matches = sum(1 for keyword in keywords if keyword in resume_text)
        industry_score += min(matches * 25, 100)
    
    return {
        "domain_expertise": min(domain_score, 100),
        "industry_knowledge": min(industry_score, 100),
        "expertise_level": determine_expertise_level(domain_score),
        "unique_strengths": extract_unique_strengths(resume_text),
        "competitive_advantages": extract_competitive_advantages(resume_text)
    }

def extract_years_of_experience(resume_text: str) -> int:
    """경력 연수 추출"""
    year_patterns = [
        r"(\d+)년\s*경력",
        r"(\d+)년간",
        r"(\d+)년\s*동안"
    ]
    
    for pattern in year_patterns:
        match = re.search(pattern, resume_text)
        if match:
            return int(match.group(1))
    
    return 0

def determine_expertise_level(score: int) -> str:
    """점수 기반 전문성 수준 판정"""
    if score >= 80:
        return "고급"
    elif score >= 60:
        return "중급"
    else:
        return "초급"

def extract_unique_strengths(resume_text: str) -> List[str]:
    """이력서에서 독특한 장점 추출"""
    strength_keywords = [
        "독특한", "특별한", "차별화된", "예외적인", "독창적인", "창의적인",
        "뛰어난", "우수한", "탁월한", "최고의", "최상위", "최고",
        "최고 수준", "최상급", "최상위", "최고 수준", "최상급", "최상위"
    ]
    
    strengths = []
    for keyword in strength_keywords:
        if keyword in resume_text:
            strengths.append(keyword)
    
    return list(set(strengths)) # 중복 제거

def extract_competitive_advantages(resume_text: str) -> List[str]:
    """이력서에서 경쟁력 있는 장점 추출"""
    competitive_keywords = [
        "경쟁력", "경쟁 우위", "경쟁 우월", "경쟁 우위", "경쟁 우월",
        "경쟁력 있는", "경쟁 우위 있는", "경쟁 우월 있는", "경쟁력 있는",
        "경쟁 우위 있는", "경쟁 우월 있는"
    ]
    
    advantages = []
    for keyword in competitive_keywords:
        if keyword in resume_text:
            advantages.append(keyword)
    
    return list(set(advantages)) # 중복 제거

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
    
    객관적 분석 결과:
    ---
    {objective_analysis}
    ---
    
    위 정보를 바탕으로 지원자의 상세 분석을 수행해 주세요.
    객관적 분석 결과를 참고하여 다음 항목들을 심도있게 분석해 주세요:
    
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

# LLM 체인 초기화 (최신 LangChain 방식)
detailed_analysis_chain = detailed_analysis_prompt | llm | StrOutputParser()

@redis_cache()
def generate_detailed_analysis(resume_text: str, job_info: str = ""):
    """개선된 상세 분석 리포트 생성"""
    print(f"generate_detailed_analysis 호출됨 - resume_text 길이: {len(resume_text)}, job_info 길이: {len(job_info)}")
    try:
        # 객관적 분석 수행
        experience_analysis = analyze_experience_depth_breadth(resume_text)
        growth_analysis = analyze_growth_potential(resume_text)
        problem_solving_analysis = analyze_problem_solving_ability(resume_text)
        expertise_analysis = analyze_expertise_level(resume_text)
        
        # 객관적 분석 결과 통합
        objective_analysis = {
            "experience_analysis": experience_analysis,
            "growth_analysis": growth_analysis,
            "problem_solving_analysis": problem_solving_analysis,
            "expertise_analysis": expertise_analysis
        }
        
        # LLM을 통한 정성적 보완 (최신 LangChain 방식)
        result = detailed_analysis_chain.invoke({
            "resume_text": resume_text,
            "job_info": job_info or "직무 정보가 없습니다.",
            "objective_analysis": json.dumps(objective_analysis, ensure_ascii=False, indent=2)
        })
        
        # JSON 파싱 (최신 LangChain에서는 직접 문자열 반환)
        text = result if isinstance(result, str) else str(result)
        print(f"상세 분석 AI 응답: {text[:200]}...")
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                # 객관적 분석 결과와 통합
                analysis_data["objective_analysis"] = objective_analysis
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"상세 분석 JSON 파싱 오류: {je}")
        
        # 기본 응답 반환 (객관적 분석 포함)
        return {
            "objective_analysis": objective_analysis,
            "core_competencies": {
                "technical_skills": ["분석 필요"],
                "soft_skills": ["분석 필요"],
                "expertise_level": "분석 필요"
            },
            "experience_analysis": {
                "depth_score": experience_analysis["depth_score"],
                "breadth_score": experience_analysis["breadth_score"],
                "quality_assessment": "분석 필요",
                "standout_experiences": ["분석 필요"]
            },
            "growth_potential": {
                "learning_ability": growth_analysis["learning_ability"],
                "adaptability": growth_analysis["adaptability"],
                "innovation_capacity": growth_analysis["innovation_capacity"],
                "assessment": "분석 필요"
            },
            "problem_solving": {
                "analytical_thinking": problem_solving_analysis["analytical_thinking"],
                "creative_solutions": problem_solving_analysis["creative_solutions"],
                "case_examples": problem_solving_analysis["case_examples"],
                "approach_style": problem_solving_analysis["problem_solving_style"]
            },
            "leadership_collaboration": {
                "leadership_score": 50,
                "teamwork_score": 50,
                "communication_score": 50,
                "examples": ["분석 필요"]
            },
            "specialization": {
                "domain_expertise": expertise_analysis["domain_expertise"],
                "industry_knowledge": expertise_analysis["industry_knowledge"],
                "unique_strengths": expertise_analysis["unique_strengths"],
                "competitive_advantages": expertise_analysis["competitive_advantages"]
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
            "objective_analysis": {},
            "core_competencies": {},
            "experience_analysis": {},
            "growth_potential": {},
            "problem_solving": {},
            "leadership_collaboration": {},
            "specialization": {},
            "improvement_areas": {},
            "overall_assessment": {}
        } 