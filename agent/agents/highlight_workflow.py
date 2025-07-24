from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List, Optional
import json
import re
from agent.utils.llm_cache import redis_cache

# LLM 초기화
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

def analyze_resume_content(state: Dict[str, Any]) -> Dict[str, Any]:
    """이력서 내용 분석 노드"""
    resume_content = state.get("resume_content", "")
    jobpost_id = state.get("jobpost_id")
    company_id = state.get("company_id")
    
    # 이력서 내용을 구조화된 형태로 분석
    analysis_result = {
        "content_length": len(resume_content),
        "has_education": "학력" in resume_content or "교육" in resume_content,
        "has_experience": "경력" in resume_content or "경험" in resume_content,
        "has_skills": "기술" in resume_content or "스킬" in resume_content,
        "has_projects": "프로젝트" in resume_content or "활동" in resume_content,
        "content_sections": []
    }
    
    # 섹션별로 분리
    sections = re.split(r'\n\s*\n', resume_content)
    for section in sections:
        if section.strip():
            analysis_result["content_sections"].append(section.strip())
    
    return {
        **state,
        "content_analysis": analysis_result,
        "next": "generate_highlight_criteria"
    }

def generate_highlight_criteria(state: Dict[str, Any]) -> Dict[str, Any]:
    """하이라이팅 기준 생성 노드"""
    content_analysis = state.get("content_analysis", {})
    resume_content = state.get("resume_content", "")
    jobpost_id = state.get("jobpost_id")
    company_id = state.get("company_id")
    
    # 기본 하이라이팅 기준 정의
    # 하이라이트 카테고리 및 기준 정의 (README_HIGHLIGHT_SYSTEM.md 기준)
    highlight_criteria = {
        "red": {
            "name": "위험 요소 (Risk)",
            "description": "직무 적합성 우려, 인재상 충돌, 부정적 태도 등 잠재적 위험 요소",
            "keywords": [
                "부족", "미흡", "제한", "어려움", "실패", "학습 중", "준비 중", "관련 없음",
                "개인주의", "협업 거부", "부정적", "자신감 부족", "회사 비판", "직무 부적합"
            ]
        },
        "gray": {
            "name": "추상표현/면접 추가 확인 필요 (Vague)",
            "description": "구체성 부족, 검증 필요, 추가 질문이 필요한 추상적 표현",
            "keywords": [
                "예정", "하려고", "계획", "노력", "최선", "열심히", "성실", "좋은", "나쁜", "훌륭한",
                "성과", "증가", "감소", "향상", "개선", "추진", "경험", "활용", "참여"
            ]
        },
        "purple": {
            "name": "경험/성과 (Experience)",
            "description": "구체적이고 의미 있는 경험, 성과, 문제 해결, 리더십 등",
            "keywords": [
                "프로젝트", "성과", "문제 해결", "리더십", "매출", "증가", "감소", "완료", "이끌다", "주도", "성장"
            ]
        },
        "yellow": {
            "name": "인재상 매칭 (Value Fit)",
            "description": "회사 인재상 가치가 실제 행동/사례로 구현된 구절",
            "keywords": [
                "공익", "책임", "혁신", "소통", "협업", "신뢰", "도전", "창의", "성실", "봉사", "공감", "협력"
            ]
        },
        "blue": {
            "name": "기술 매칭 (Skill Fit)",
            "description": "채용공고의 핵심 기술과 직접적으로 매칭되는 표현",
            "keywords": [
                "Python", "Java", "JavaScript", "React", "Node.js", "AWS", "Docker", "Git", "SQL", "API", "Spring", "Kubernetes"
            ]
        }
    }
    
    return {
        **state,
        "highlight_criteria": highlight_criteria,
        "next": "perform_advanced_highlighting"
    }

def get_yellow_prompt(values_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
    """노란색 하이라이트용 프롬프트 (회사 인재상 매칭)"""
    value_keywords_comma = ', '.join(values_keywords)
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)

    return f"""
    ### 역할
    당신은 자기소개서 분석 전문가입니다. 자기소개서에서 회사 인재상 가치가 실제 행동/사례로 구현된 구절을 라벨링하세요.

    ### 분석 기준 키워드
    {value_keywords_comma}

    ### 분석할 문장들
    {sentences_json}

    ### 매칭 유형 및 기준
    **[1] 정확한 매칭 (exact)**
    - 키워드가 그대로 언급된 경우
    - 예: "공익","투명성","전문성"

    **[2] 문맥적 매칭 (semantic)**
    - 키워드와 같은 의미의 다른 표현
    - 유사어/동의어/관련 개념으로 표현된 경우
    - 실제 행동이나 사례로 가치가 드러나는 경우

    **[3] 문맥적 매칭 예시**
    - "공익" 관련: 사회 기여, 봉사, 나눔, 지역 발전, 환경 보호, 사회적 가치, 공공 이익
    - "책임" 관련: 주도적, 책임지고, 완수, 성과 달성, 신뢰, 의무감, 성실함, 꼼꼼함
    - "혁신" 관련: 개선, 최적화, 효율화, 새로운 방법, 창의적 해결, 변화, 도전, 혁신적 사고
    - "소통" 관련: 의견 교환, 대화, 설명, 전달, 이해, 공감, 명확한 전달, 피드백
    - "협업" 관련: 팀워크, 조율, 공동 작업, 다부서 협력, 상호 보완, 시너지, 협력적 문제 해결

    ### 라벨링 규칙
    - **문맥적 매칭을 우선적으로 고려하세요** (단순 키워드 매칭보다 의미적 연결이 중요)
    - 슬로건·다짐류(예: "혁신과 협업을 중시합니다", "최고가 되겠습니다") 및 근거 없는 나열 문장 제외 
    - 각 value당 최대 2개만 선택해 응답하세요. 유사하거나 약한 건 제외
    - 가능한 한 의미 있는 **최소 자연스러운 구절**만 추출 (문장 전체가 아닌 구절 단위)
    - **응답은 간결하게 유지하세요** (분석 시간 단축을 위해)

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "추출된 구절",
                "category": "value_fit",
                "reason": "성능 개선을 통한 혁신적 해결책 제시"
            }},
            …
        ]
    }}
    """

def get_blue_prompt(skill_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
    """파란색 하이라이트용 프롬프트 (기술 스택 분석)"""
    skills_comma = ', '.join(skill_keywords)
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)

    return f"""
    ### 역할
    당신은 자기소개서에서 실제 기술 사용 경험이 드러나는 부분을 찾아내는 도우미입니다.

    ### 분석 기준 기술 키워드
    {skills_comma}

    한글로 표기된 기술 키워드(예: 자바, 스프링 등)도 동일하게 기술로 인식하여 판단하세요.

    ### 분석할 문장들
    {sentences_json}

    ### 매칭 기준 (유사 키워드 매칭)
    **[1] 기술 키워드 매칭 (대/소문자, 한/영 구분 없음)**
    - 채용공고에 명시된 기술 키워드와 유사한 표현 모두 매칭
    - 대/소문자 구분 없음: "Java" = "java" = "JAVA" = "Java"
    - 한/영 구분 없음: "자바" = "Java" = "JAVA", "스프링" = "Spring" = "SPRING"
    - 예: 채용공고에 "Java"가 있으면 "Java", "java", "JAVA", "자바" 모두 매칭

    **[2] 유사 키워드 매칭 예시**
    - Java: "Java", "java", "JAVA", "자바"
    - Spring: "Spring", "spring", "SPRING", "스프링"
    - AWS: "AWS", "aws", "Aws", "아마존", "Amazon"
    - React: "React", "react", "REACT", "리액트"
    - Python: "Python", "python", "PYTHON", "파이썬"

    **[3] 선택 기준**
    1. 문장 안에 채용공고의 기술 키워드와 유사한 표현이 포함되어 있어야 합니다.
    2. 해당 키워드가 실제로 사용된 경험, 기여, 활동을 의미해야 합니다.
       - 예: 사용했다, 적용했다, 프로젝트에 활용했다, 개발했다, 설정했다 등
    3. 단순 언급, 학습 예정, 흥미 표현, 목표만 담긴 부분은 제외합니다.
       - 예: 배우고 싶다, 공부 중이다, 준비하고 있다, 흥미가 있다 등
    4. **중요**: 기술 키워드의 유사 표현만 매칭하세요. 문맥적 매칭은 하지 마세요.
       - 예: "백엔드 개발"이 채용공고에 없으면 매칭 안됨
       - 예: "웹 개발"이 채용공고에 없으면 매칭 안됨

    ### 라벨링 규칙
    - 가능한 한 의미 있는 **최소 자연스러운 구절**만 추출 (문장 전체가 아닌 구절 단위)
    - 기술 키워드가 실제 행동과 연결되어야 함
    - 중복되는 내용은 하나만 추출

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "기술 사용 경험이 드러나는 구절",
                "category": "skill_fit",
                "reason": "기술이 실제로 활용된 경험"
            }}
        ]
    }}
    """

def get_red_prompt(risk_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str, job_details: str = "") -> str:
    """빨간색 하이라이트용 프롬프트 (직무적합성 우려 + 인재상 충돌)"""
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)
    
    return f"""
    ### 역할
    당신은 자기소개서에서 직무 적합성 우려와 인재상 충돌 요소를 찾아내는 전문가입니다.

    ### 분석 기준 위험 키워드
    {', '.join(risk_keywords)}

    ### 분석할 문장들
    {sentences_json}

    ### 위험 요소 유형
    **[1] 직무 적합성 우려**
    - 지원 직무와 관련된 경험이 부족한 경우
    - 기술적 역량이 부족하다고 언급된 경우
    - 학습 중이거나 준비 중이라고 표현된 경우
    - 지원 직무와 관련 없는 경험만 있는 경우

    **[2] 인재상 충돌**
    - 회사 가치관과 충돌하는 표현
    - 회사 인재상과 맞지 않는 태도나 가치관
    - 회사 문화와 부합하지 않는 표현
    - 개인주의적이거나 협업에 부정적인 표현

    **[3] 부정적 태도나 표현**
    - 실패 경험을 부정적으로 표현한 경우
    - 어려움을 극복하지 못했다고 표현한 경우
    - 자신감이 부족한 표현
    - 회사나 직무에 대한 부정적 시각

    ### 라벨링 규칙
    - 직무 적합성과 인재상 충돌 요소를 우선적으로 찾으세요
    - 구체적이고 객관적인 위험 요소를 선택하세요
    - 단순한 부족함 표현보다는 근본적인 문제를 찾으세요

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "위험 요소가 드러나는 구절",
                "category": "risk",
                "reason": "위험 요소 설명"
            }}
        ]
    }}
    """

def get_gray_prompt(vague_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
    """회색 하이라이트용 프롬프트 (면접에서 추가 확인이 필요한 부분)"""
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)
    
    return f"""
    ### 역할
    당신은 자기소개서에서 면접에서 추가 확인이 필요한 부분을 찾아내는 전문가입니다.

    ### 분석할 문장들
    {sentences_json}

    ### 면접 추가 확인 필요 유형
    **[1] 구체성 부족**
    - "~할 예정이다", "~하려고 한다" 등 미래형 표현
    - 구체적 계획이나 실현 가능성이 불분명한 경우
    - 구체적 성과나 결과가 없는 추상적 표현

    **[2] 검증 필요 표현**
    - "열심히", "최선을 다해", "성실하게" 등 구체적 근거 없는 표현
    - 과도한 자신감 표현 ("최고", "최선", "완벽")
    - 주관적 평가 ("좋은", "나쁜", "훌륭한")

    **[3] 추가 질문 유발 표현**
    - 구체적 수치나 결과가 없는 성과 표현
    - 기술이나 경험의 실제 활용 정도가 불분명한 경우
    - 팀워크나 협업에서의 구체적 역할이 불분명한 경우

    ### 라벨링 규칙
    - 면접에서 추가 질문이 필요한 부분을 찾으세요
    - 구체적 성과나 경험이 있는 경우는 제외하세요
    - 검증 가능한 모호함을 우선하세요

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "면접 추가 확인이 필요한 구절",
                "category": "vague",
                "reason": "추가 확인이 필요한 이유"
            }}
        ]
    }}
    """

def get_purple_prompt(experience_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
    """보라색 하이라이트용 프롬프트 (경험 분석)"""
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)
    
    return f"""
    ### 역할
    당신은 자기소개서에서 구체적이고 의미 있는 경험을 찾아내는 전문가입니다.

    ### 분석할 문장들
    {sentences_json}

    ### 의미 있는 경험 유형
    **[1] 구체적 성과가 있는 경험**
    - 수치화된 성과 (예: "매출 20% 증가", "시간 30% 단축")
    - 구체적 결과가 있는 프로젝트나 활동

    **[2] 문제 해결 경험**
    - 실제 문제를 해결한 경험
    - 어려움을 극복한 구체적 사례

    **[3] 리더십 경험**
    - 팀을 이끈 경험
    - 주도적으로 진행한 프로젝트

    **[4] 학습 및 성장 경험**
    - 새로운 기술이나 지식을 습득한 경험
    - 실패를 통해 배운 구체적 교훈

    ### 라벨링 규칙
    - 구체적이고 의미 있는 경험만 선택하세요
    - 일반적이고 추상적인 경험은 제외하세요
    - 실제 성과나 결과가 드러나는 경험을 우선하세요

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "의미 있는 경험이 드러나는 구절",
                "category": "experience",
                "reason": "경험의 의미"
            }}
        ]
    }}
    """

async def analyze_category_with_llm(
    resume_content: str, 
    category: str, 
    keywords: List[str], 
    job_details: str = ""
) -> List[Dict[str, Any]]:
    """LLM을 사용한 카테고리별 분석"""
    try:
        # 문장 분리
        sentences = re.split(r'[.!?]\s+', resume_content)
        candidates = [{"sentence": s.strip()} for s in sentences if s.strip()]
        
        if not candidates:
            return []
        
        # 카테고리별 프롬프트 선택
        if category == "yellow" or category == "value_fit":
            prompt = get_yellow_prompt(keywords, candidates, resume_content)
        elif category == "blue" or category == "skill_fit":
            prompt = get_blue_prompt(keywords, candidates, resume_content)
        elif category == "red" or category == "risk":
            prompt = get_red_prompt(keywords, candidates, resume_content, job_details)
        elif category == "gray" or category == "vague":
            prompt = get_gray_prompt(keywords, candidates, resume_content)
        elif category == "purple" or category == "experience":
            prompt = get_purple_prompt(keywords, candidates, resume_content)
        else:
            # 기본 프롬프트
            prompt = f"""
            다음 자기소개서에서 {category}와 관련된 문장들을 분석해주세요.
            
            분석할 문장들:
            {json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)}
            
            JSON 응답 포맷:
            {{
                "highlights": [
                    {{
                        "sentence": "관련 구절",
                        "category": "{category}",
                        "reason": "선택 이유"
                    }}
                ]
            }}
            """
        
        # LLM 호출
        response = await llm.ainvoke(prompt)
        
        # 응답 파싱
        try:
            result = json.loads(response.content)
            return result.get("highlights", [])
        except json.JSONDecodeError:
            print(f"JSON 파싱 오류: {response.content}")
            return []
            
    except Exception as e:
        print(f"LLM 분석 오류 ({category}): {str(e)}")
        return []

def perform_advanced_highlighting(state: Dict[str, Any]) -> Dict[str, Any]:
    """고급 하이라이팅 수행 노드 (LLM 기반)"""
    resume_content = state.get("resume_content", "")
    highlight_criteria = state.get("highlight_criteria", {})
    jobpost_id = state.get("jobpost_id")
    company_id = state.get("company_id")
    
    # 각 색상별로 하이라이팅 수행
    highlights = {
        "yellow": [],
        "red": [],
        "gray": [],
        "purple": [],
        "blue": []
    }
    
    # 비동기 분석을 위한 준비
    import asyncio
    
    async def run_all_analyses():
        tasks = []
        
        # 각 카테고리별 분석 태스크 생성
        for color, criteria in highlight_criteria.items():
            keywords = criteria.get("keywords", [])
            task = analyze_category_with_llm(resume_content, color, keywords)
            tasks.append((color, task))
        
        # 모든 분석 실행
        results = {}
        for color, task in tasks:
            try:
                results[color] = await task
            except Exception as e:
                print(f"분석 오류 ({color}): {str(e)}")
                results[color] = []
        
        return results
    
    # 비동기 실행
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # 이미 실행 중인 루프가 있으면 새 스레드에서 실행
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, run_all_analyses())
                highlights = future.result()
        else:
            highlights = loop.run_until_complete(run_all_analyses())
    except Exception as e:
        print(f"하이라이팅 실행 오류: {str(e)}")
        # 오류 시 기본 키워드 매칭으로 fallback
        highlights = perform_basic_highlighting(resume_content, highlight_criteria)
    
    # 전체 하이라이트 통합
    all_highlights = []
    for color, color_highlights in highlights.items():
        for highlight in color_highlights:
            all_highlights.append({
                **highlight,
                "color": color
            })
    
    return {
        **state,
        "highlights": highlights,
        "all_highlights": all_highlights,
        "next": "validate_highlights"
    }

def perform_basic_highlighting(resume_content: str, highlight_criteria: Dict[str, Any]) -> Dict[str, Any]:
    """기본 키워드 매칭 (fallback용)"""
    highlights = {
        "yellow": [],
        "red": [],
        "gray": [],
        "purple": [],
        "blue": []
    }
    
    # 문장 단위로 분리
    sentences = re.split(r'[.!?]\s+', resume_content)
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # 각 색상별 키워드 매칭
        for color, criteria in highlight_criteria.items():
            keywords = criteria.get("keywords", [])
            for keyword in keywords:
                if keyword.lower() in sentence.lower():
                    highlights[color].append({
                        "sentence": sentence,
                        "category": color,
                        "reason": f"키워드 '{keyword}' 매칭"
                    })
                    break
    
    return highlights

def validate_highlights(state: Dict[str, Any]) -> Dict[str, Any]:
    """하이라이팅 결과 검증 노드"""
    highlights = state.get("highlights", {})
    all_highlights = state.get("all_highlights", [])
    
    # 검증 결과
    validation_result = {
        "total_highlights": len(all_highlights),
        "color_distribution": {},
        "quality_score": 0.0,
        "issues": []
    }
    
    # 색상별 분포 계산
    for color, color_highlights in highlights.items():
        validation_result["color_distribution"][color] = len(color_highlights)
    
    # 품질 점수 계산 (하이라이트 개수와 분포 기반)
    total_sentences = len(re.split(r'[.!?]\s+', state.get("resume_content", "")))
    if total_sentences > 0:
        highlight_ratio = len(all_highlights) / total_sentences
        if 0.1 <= highlight_ratio <= 0.4:  # 적절한 비율
            validation_result["quality_score"] = 0.9
        elif 0.05 <= highlight_ratio <= 0.5:  # 허용 가능한 비율
            validation_result["quality_score"] = 0.7
        else:
            validation_result["quality_score"] = 0.5
            validation_result["issues"].append("하이라이트 비율이 적절하지 않습니다")
    
    # 색상별 균형 확인
    color_counts = list(validation_result["color_distribution"].values())
    if max(color_counts) > 0:
        balance_ratio = min(color_counts) / max(color_counts)
        if balance_ratio < 0.2:
            validation_result["issues"].append("하이라이트 색상 분포가 불균형합니다")
    
    return {
        **state,
        "validation_result": validation_result,
        "next": "finalize_results"
    }

def finalize_results(state: Dict[str, Any]) -> Dict[str, Any]:
    """최종 결과 정리 노드"""
    highlights = state.get("highlights", {})
    all_highlights = state.get("all_highlights", [])
    validation_result = state.get("validation_result", {})
    
    # 최종 결과 구성
    final_result = {
        "yellow": highlights.get("yellow", []),
        "red": highlights.get("red", []),
        "gray": highlights.get("gray", []),
        "purple": highlights.get("purple", []),
        "blue": highlights.get("blue", []),
        "highlights": all_highlights,
        "metadata": {
            "total_highlights": validation_result.get("total_highlights", 0),
            "quality_score": validation_result.get("quality_score", 0.0),
            "color_distribution": validation_result.get("color_distribution", {}),
            "issues": validation_result.get("issues", [])
        }
    }
    
    return {
        **state,
        "final_result": final_result,
        "next": END
    }

def build_highlight_workflow() -> StateGraph:
    """형광펜 하이라이팅 워크플로우 그래프 생성"""
    workflow = StateGraph(Dict[str, Any])
    
    # 노드 추가
    workflow.add_node("analyze_content", analyze_resume_content)
    workflow.add_node("generate_criteria", generate_highlight_criteria)
    workflow.add_node("perform_highlighting", perform_advanced_highlighting)
    workflow.add_node("validate_highlights", validate_highlights)
    workflow.add_node("finalize_results", finalize_results)
    
    # 시작점 설정
    workflow.set_entry_point("analyze_content")
    
    # 엣지 연결
    workflow.add_edge("analyze_content", "generate_criteria")
    workflow.add_edge("generate_criteria", "perform_highlighting")
    workflow.add_edge("perform_highlighting", "validate_highlights")
    workflow.add_edge("validate_highlights", "finalize_results")
    workflow.add_edge("finalize_results", END)
    
    return workflow.compile()

# 워크플로우 인스턴스 생성
highlight_workflow = build_highlight_workflow()

def process_highlight_workflow(
    resume_content: str,
    jobpost_id: int = None,
    company_id: int = None
) -> Dict[str, Any]:
    """형광펜 하이라이팅 워크플로우 실행"""
    
    # 초기 상태 설정
    initial_state = {
        "resume_content": resume_content,
        "jobpost_id": jobpost_id,
        "company_id": company_id
    }
    
    try:
        # 워크플로우 실행
        result = highlight_workflow.invoke(initial_state)
        return result.get("final_result", {})
    except Exception as e:
        print(f"하이라이팅 워크플로우 오류: {str(e)}")
        return {
            "yellow": [],
            "red": [],
            "gray": [],
            "purple": [],
            "blue": [],
            "highlights": [],
            "metadata": {
                "total_highlights": 0,
                "quality_score": 0.0,
                "color_distribution": {},
                "issues": [f"워크플로우 오류: {str(e)}"]
            }
        } 