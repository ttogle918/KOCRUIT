from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List, Optional
import json
import re
from agent.utils.llm_cache import redis_cache

# LLM 초기화
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

# 임베딩 시스템 관련 코드 완전 제거

def is_transition_word(text: str) -> bool:
    """전환어 감지 함수"""
    transition_patterns = [
        # 대조/반전 전환어
        r'하지만|그럼에도\s*불구하고|그러나|다만|단|오히려|반면|반대로|대신|대신에|그런데|그렇지만',
        # 시간/순서 전환어
        r'그러다가|그\s*후|이후|그\s*다음|다음에는|그\s*때부터|그\s*때|그\s*이후|그\s*다음에',
        # 조건/결과 전환어
        r'만약|만약에|결과적으로|결국|마침내|드디어|그\s*결과|그\s*끝에',
        # 추가/강조 전환어
        r'또한|게다가|더욱이|무엇보다|특히|특별히|더구나|거기에|또\s*한편',
        # 인과 전환어
        r'그\s*이유로|그\s*때문에|그\s*래서|그\s*때문|그\s*결과로|그\s*덕분에',
        # 예시 전환어
        r'예를\s*들면|예시로|구체적으로|실제로|사실|실제로는'
    ]
    
    for pattern in transition_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def filter_negative_highlights_with_transitions(highlights: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
    """전환어를 고려하여 부정 하이라이팅을 필터링"""
    if not highlights:
        return highlights
    
    filtered_highlights = []
    
    for highlight in highlights:
        sentence = highlight.get('sentence', '')
        category = highlight.get('category', '')
        
        # 부정 관련 카테고리만 필터링
        if category in ['negative_tone', 'mismatch']:
            # 전환어가 포함된 문장인지 확인
            if is_transition_word(sentence):
                # 전환어 중심 문맥 분석
                context_analysis = analyze_transition_context(sentence)
                
                if context_analysis['has_context_change']:
                    if context_analysis['positive_after_negative']:
                        print(f"전환어 문맥 변화 감지 (부정→긍정) - 부정 하이라이팅 제외: {sentence[:50]}...")
                        continue  # 이 하이라이팅은 제외
                    elif context_analysis['negative_after_positive']:
                        print(f"전환어 문맥 변화 감지 (긍정→부정) - 부정 하이라이팅 유지: {sentence[:50]}...")
                        # 부정 하이라이팅 유지 (기본 동작)
        
        filtered_highlights.append(highlight)
    
    return filtered_highlights

def analyze_transition_context(sentence: str) -> Dict[str, Any]:
    """전환어를 중심으로 앞뒤 문맥을 분석"""
    result = {
        'has_context_change': False,
        'positive_after_negative': False,
        'negative_after_positive': False,
        'transition_word': '',
        'before_transition': '',
        'after_transition': '',
        'before_sentiment': 'neutral',
        'after_sentiment': 'neutral'
    }
    
    # 전환어 위치 찾기
    transition_patterns = [
        r'하지만|그러나|그런데|그렇지만|다만|단|오히려|반면|반대로|대신|대신에',
        r'그러다가|그\s*후|이후|그\s*다음|다음에는|그\s*때부터',
        r'만약|만약에|결과적으로|결국|마침내|드디어',
        r'또한|게다가|더욱이|무엇보다|특히|특별히'
    ]
    
    for pattern in transition_patterns:
        match = re.search(pattern, sentence, re.IGNORECASE)
        if match:
            transition_word = match.group()
            before_text = sentence[:match.start()].strip()
            after_text = sentence[match.end():].strip()
            
            # 전환어 앞뒤 텍스트가 모두 있는 경우만 분석
            if before_text and after_text:
                before_sentiment = analyze_sentiment(before_text)
                after_sentiment = analyze_sentiment(after_text)
                
                result.update({
                    'has_context_change': True,
                    'transition_word': transition_word,
                    'before_transition': before_text,
                    'after_transition': after_text,
                    'before_sentiment': before_sentiment,
                    'after_sentiment': after_sentiment
                })
                
                # 문맥 변화 감지
                if before_sentiment == 'negative' and after_sentiment == 'positive':
                    result['positive_after_negative'] = True
                elif before_sentiment == 'positive' and after_sentiment == 'negative':
                    result['negative_after_positive'] = True
                
                break
    
    return result

def analyze_sentiment(text: str) -> str:
    """텍스트의 감정을 분석 (긍정/부정/중립)"""
    if not text or len(text.strip()) < 2:
        return 'neutral'
    
    # 긍정적 키워드 패턴
    positive_patterns = [
        r'성공|성과|개선|향상|증가|달성|완료|해결|극복|발전|성장|도약|혁신|창의|효율|최적화',
        r'좋은|훌륭한|우수한|뛰어난|탁월한|최고의|최상의|완벽한|완전한|완성된',
        r'만족|기쁨|희망|자신감|긍정|낙관|열정|의지|노력|성실|책임감|주도성',
        r'배웠다|성장했다|개선했다|해결했다|달성했다|완료했다|극복했다|발전했다',
        r'잘\s*했다|성공했다|완료했다|해결했다|개선했다|향상했다|증가했다|달성했다',
        r'좋았다|훌륭했다|우수했다|뛰어났다|탁월했다|완벽했다|완전했다|완성했다'
    ]
    
    # 부정적 키워드 패턴
    negative_patterns = [
        r'실패|실패했다|실패했고|실패했으며|실패했지만|실패했고|실패했으니|실패했으므로',
        r'어려움|어려웠다|어려웠고|어려웠으며|어려웠지만|어려웠고|어려웠으니|어려웠으므로',
        r'문제|문제가|문제를|문제에|문제로|문제와|문제는|문제도|문제만|문제까지',
        r'실수|실수했다|실수했고|실수했으며|실수했지만|실수했고|실수했으니|실수했으므로',
        r'부족|부족했다|부족했고|부족했으며|부족했지만|부족했고|부족했으니|부족했으므로',
        r'미흡|미흡했다|미흡했고|미흡했으며|미흡했지만|미흡했고|미흡했으니|미흡했으므로',
        r'부족함|부족함을|부족함에|부족함으로|부족함과|부족함은|부족함도|부족함만|부족함까지',
        r'실망|실망했다|실망했고|실망했으며|실망했지만|실망했고|실망했으니|실망했으므로',
        r'좌절|좌절했다|좌절했고|좌절했으며|좌절했지만|좌절했고|좌절했으니|좌절했으므로',
        r'힘들었다|어려웠다|막막했다|당황했다|혼란스러웠다|불안했다|걱정했다',
        r'나쁜|안좋은|부족한|미흡한|실패한|실패했다|실패했고|실패했으며|실패했지만',
        r'어려웠다|힘들었다|막막했다|당황했다|혼란스러웠다|불안했다|걱정했다|실망했다|좌절했다'
    ]
    
    # 긍정/부정 키워드 카운트
    positive_count = 0
    negative_count = 0
    
    for pattern in positive_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            positive_count += 1
    
    for pattern in negative_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            negative_count += 1
    
    # 감정 판단 (키워드 개수와 가중치 고려)
    if positive_count > negative_count and positive_count > 0:
        return 'positive'
    elif negative_count > positive_count and negative_count > 0:
        return 'negative'
    else:
        return 'neutral'

def has_positive_content_after_transition(sentence: str) -> bool:
    """전환어 뒤에 긍정적 내용이 있는지 확인 (기존 함수 - 호환성 유지)"""
    context_analysis = analyze_transition_context(sentence)
    return context_analysis.get('positive_after_negative', False)

def has_negative_content_after_transition(sentence: str) -> bool:
    """전환어 뒤에 부정적 내용이 있는지 확인 (기존 함수 - 호환성 유지)"""
    context_analysis = analyze_transition_context(sentence)
    return context_analysis.get('negative_after_positive', False)

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
    
    # 기본 하이라이팅 기준 정의 (보라에 추상 포함)
    highlight_criteria = {
        "red": {
            "name": "직무 불일치 (Mismatch)",
            "description": "직무 도메인/역할 불일치하는 구절, 자격요건 스택 '학습/예정' 수준인 구절"
        },
        "orange": {
            "name": "부정 태도 (Negative Tone)",
            "description": "책임회피·공격/비난·비윤리·허위/과장 의심·소통결여 등의 부정적태도 리스크"
        },
        "yellow": {
            "name": "인재상 가치 (Value Fit)",
            "description": "회사 인재상과  맞는 행동·사례로 추정되는 구절(점수화 X)"
        },
        "blue": {
            "name": "기술 사용 경험 (Tech Evidence)",
            "description": "도구/언어/프레임워크를 실제로 사용한 근거가 드러나는 구절"
        },
        "purple": {
            "name": "경험·성과·이력·경력 (Experience/Impact)",
            "description": "프로젝트·교육·경력·수상 등 결과·임팩트 **및** 추상표현(면접 확인용)을 함께 포함"
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

def get_red_prompt(mismatch_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str, job_details: str = "") -> str:
    """빨간색 하이라이트용 프롬프트 (직무 불일치)"""
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)
    
    return f"""
    ### 역할
    당신은 자기소개서에서 직무 도메인/역할 불일치 요소를 찾아내는 전문가입니다.

    ### 분석 기준 불일치 키워드
    {', '.join(mismatch_keywords)}

    ### 분석할 문장들
    {sentences_json}

    ### 직무 불일치 유형
    **[1] 직무 도메인 불일치**
    - 지원 직무와 완전히 다른 분야의 경험
    - 지원 직무와 관련 없는 업무 경험
    - 지원 직무와 다른 산업 분야의 경험

    **[2] 역할 불일치**
    - 지원 직무와 다른 역할의 경험
    - 지원 직무보다 낮은 수준의 역할 경험
    - 지원 직무와 맞지 않는 리더십 경험

    **[3] 자격요건 스택 '학습/예정' 수준**
    - "배우고 있다", "학습 중이다", "준비 중이다" 등
    - "~할 예정이다", "~하려고 한다" 등 미래형 표현
    - 실제 사용 경험이 아닌 학습 의도만 표현

    ### 라벨링 규칙
    - 직무와 직접적으로 불일치하는 요소를 찾으세요
    - 자격요건에 미달하는 기술 수준을 찾으세요
    - 구체적이고 객관적인 불일치 요소를 선택하세요

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "직무 불일치가 드러나는 구절",
                "category": "mismatch",
                "reason": "불일치 요소 설명"
            }}
        ]
    }}
    """

def get_orange_prompt(negative_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
    """오렌지색 하이라이트용 프롬프트 (부정 태도)"""
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)
    
    return f"""
    ### 역할
    당신은 자기소개서에서 부정적 태도나 윤리적 문제를 찾아내는 전문가입니다.

    ### 분석 기준 부정 키워드
    {', '.join(negative_keywords)}

    ### 분석할 문장들
    {sentences_json}

    ### 부정 태도 유형
    **[1] 책임회피**
    - 실패나 문제에 대한 책임을 회피하는 표현
    - "~때문에", "~탓에" 등 외부 요인 탓으로 돌리는 표현
    - 개인적 책임을 인정하지 않는 태도

    **[2] 공격/비난**
    - 다른 사람이나 조직을 비난하는 표현
    - 과도하게 부정적인 시각으로 바라보는 태도
    - 건설적이지 않은 비판적 표현

    **[3] 비윤리적 표현**
    - 윤리적으로 문제가 될 수 있는 표현
    - 부정직하거나 속임수를 암시하는 표현
    - 도덕적으로 의심스러운 행동이나 태도

    **[4] 허위/과장 의심**
    - 사실과 다를 가능성이 높은 과장된 표현
    - 검증하기 어려운 과도한 성과나 경험
    - 신뢰성이 의심되는 구체적 수치나 결과
    - "최고의", "완벽한", "탁월한" 등 과도한 수식어 사용
    - "매우", "정말", "너무", "엄청" 등 과장된 부사 사용
    - "100%", "완벽", "절대" 등 극단적 표현
    - 구체적 근거 없이 "압도적", "최고" 등 주장

    **[5] 소통결여**
    - 협업이나 소통에 부정적인 태도
    - 개인주의적이거나 팀워크를 무시하는 표현
    - 의사소통 능력 부족을 보여주는 표현

    ### 라벨링 규칙
    - 부정적 태도나 윤리적 문제를 우선적으로 찾으세요
    - 구체적이고 객관적인 부정 요소를 선택하세요
    - 단순한 부족함보다는 태도나 윤리적 문제를 찾으세요
    - **중요**: 부정적 키워드가 포함된 문장이라도 문맥상 긍정적이면 제외하세요
    - **중요**: 전환어(하지만, 그러나, 그런데 등) 앞 또는 뒤에 긍정적 내용이 있으면 제외하세요
    - **중요**: 실제로 부정적 태도나 윤리적 문제가 드러나는 문장만 선택하세요

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "부정 태도가 드러나는 구절",
                "category": "negative_tone",
                "reason": "부정 태도 설명"
            }}
        ]
    }}
    """

def get_purple_prompt(experience_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
    """보라색 하이라이트용 프롬프트 (경험·성과·이력·경력 + 추상표현)"""
    sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)
    
    return f"""
    ### 역할
    당신은 자기소개서에서 경험·성과·이력·경력과 추상표현을 함께 찾아내는 전문가입니다.

    ### 분석할 문장들
    {sentences_json}

    ### 경험·성과·이력·경력 유형
    **[1] 구체적 성과가 있는 경험**
    - 수치화된 성과 (예: "매출 20% 증가", "시간 30% 단축")
    - 구체적 결과가 있는 프로젝트나 활동
    - 실제 임팩트가 드러나는 경험

    **[2] 문제 해결 경험**
    - 실제 문제를 해결한 경험
    - 어려움을 극복한 구체적 사례
    - 도전적 상황에서의 성과

    **[3] 리더십 경험**
    - 팀을 이끈 경험
    - 주도적으로 진행한 프로젝트
    - 관리·조율 경험

    **[4] 학습 및 성장 경험**
    - 새로운 기술이나 지식을 습득한 경험
    - 실패를 통해 배운 구체적 교훈
    - 전문성 향상 경험

    **[5] 교육·수상·자격 경험**
    - 관련 교육 이수 경험
    - 수상 경력
    - 자격증 취득

    ### 추상표현 (면접 확인용)
    **[6] 구체성 부족한 표현**
    - "~할 예정이다", "~하려고 한다" 등 미래형 표현
    - 구체적 계획이나 실현 가능성이 불분명한 경우
    - 구체적 성과나 결과가 없는 추상적 표현

    **[7] 검증 필요 표현**
    - "열심히", "최선을 다해", "성실하게" 등 구체적 근거 없는 표현
    - 과도한 자신감 표현 ("최고", "최선", "완벽")
    - 주관적 평가 ("좋은", "나쁜", "훌륭한")

    **[8] 추가 질문 유발 표현**
    - 구체적 수치나 결과가 없는 성과 표현
    - 기술이나 경험의 실제 활용 정도가 불분명한 경우
    - 팀워크나 협업에서의 구체적 역할이 불분명한 경우

    ### 라벨링 규칙
    - 구체적이고 의미 있는 경험을 우선적으로 찾으세요
    - 추상표현은 면접에서 추가 확인이 필요한 부분으로 분류하세요
    - 경험과 추상표현을 모두 포함하여 종합적으로 분석하세요

    ### JSON 응답 포맷
    {{
        "highlights": [
            {{
                "sentence": "경험이나 추상표현이 드러나는 구절",
                "category": "experience",
                "reason": "경험의 의미 또는 추상표현 확인 필요"
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
        elif category == "red" or category == "mismatch":
            prompt = get_red_prompt(keywords, candidates, resume_content, job_details)
        elif category == "orange" or category == "negative_tone":
            # 오렌지색은 감정 모델과 프롬프트를 함께 사용
            return await analyze_orange_with_sentiment(candidates, resume_content)
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

async def analyze_orange_with_sentiment(candidates: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
    """오렌지색 하이라이팅 - 감정 모델과 프롬프트 결합"""
    try:
        # 감정 모델 로드 시도
        sentiment_model = None
        sentiment_tokenizer = None
        
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            import torch
            
            model_name = "nlp04/korean_sentiment_analysis_kcelectra"
            sentiment_tokenizer = AutoTokenizer.from_pretrained(model_name)
            sentiment_model = AutoModelForSequenceClassification.from_pretrained(model_name)
            print("✅ 감정 모델 로드 성공")
        except Exception as e:
            print(f"⚠️ 감정 모델 로드 실패: {e}")
        
        # 감정 분석 수행
        negative_sentences = []
        for candidate in candidates:
            sentence = candidate['sentence']
            
            if sentiment_model and sentiment_tokenizer:
                # 감정 모델로 분석
                inputs = sentiment_tokenizer(sentence, return_tensors="pt", truncation=True, max_length=512)
                with torch.no_grad():
                    outputs = sentiment_model(**inputs)
                    probabilities = torch.softmax(outputs.logits, dim=1)
                    sentiment_score = probabilities[0][1].item()  # 부정 확률
                
                # 부정 확률이 높은 문장 선택 (임계값 더 낮춤)
                if sentiment_score > 0.15:  # 15% 이상 부정 (더 낮은 임계값)
                    negative_sentences.append({
                        "sentence": sentence,
                        "sentiment_score": sentiment_score
                    })
                    print(f"🟠 감정 분석 결과: {sentence[:30]}... (부정 확률: {sentiment_score:.3f})")
                else:
                    print(f"🟠 감정 분석 제외: {sentence[:30]}... (부정 확률: {sentiment_score:.3f})")
            else:
                # 감정 모델이 없으면 프롬프트 기반 분석
                # 모든 문장을 후보로 추가 (LLM이 판단하도록)
                negative_sentences.append({
                    "sentence": sentence,
                    "sentiment_score": 0.3  # 기본값 (더 낮게 설정)
                })
                print(f"🟠 기본 분석: {sentence[:30]}... (기본 점수: 0.3)")
        
        # 만약 감정 분석으로 후보가 없으면 모든 문장을 후보로 추가
        if not negative_sentences:
            print("🟠 감정 분석 후보가 없어서 모든 문장을 후보로 추가")
            for candidate in candidates:
                negative_sentences.append({
                    "sentence": candidate['sentence'],
                    "sentiment_score": 0.2  # 기본값
                })
        
        print(f"🟠 감정 분석 후보 문장 수: {len(negative_sentences)}")
        
        # 부정 확률 순으로 정렬
        negative_sentences.sort(key=lambda x: x["sentiment_score"], reverse=True)
        
        # 상위 5개 문장만 선택
        top_negative = negative_sentences[:5]
        print(f"🟠 상위 5개 후보 문장 선택: {len(top_negative)}개")
        
        # 프롬프트 기반 세부 분석
        if top_negative:
            sentences_json = json.dumps([c['sentence'] for c in top_negative], ensure_ascii=False, indent=2)
            # 부정 키워드 추가 (과장 표현 포함)
            negative_keywords = [
                # 일반 부정 키워드
                "실패", "어려움", "문제", "실수", "부족", "미흡", "실망", "좌절", "힘들었다", 
                "막막했다", "당황했다", "혼란스러웠다", "불안했다", "걱정했다", "나쁜", 
                "안좋은", "부족한", "미흡한", "실패한", "어려웠다", "힘들었다", "막막했다", 
                "당황했다", "혼란스러웠다", "불안했다", "걱정했다", "실망했다", "좌절했다",
                # 과장 표현 키워드
                "최고의", "최상의", "완벽한", "완전한", "완성된", "탁월한", "뛰어난", "훌륭한",
                "매우", "정말", "너무", "엄청", "대단히", "극도로", "극한", "최대한", "최선을",
                "완벽하게", "완전히", "완성도", "탁월하게", "뛰어나게", "훌륭하게",
                "100%", "완벽", "완전", "최고", "최상", "탁월", "뛰어남", "훌륭함",
                "압도적", "압도적으로", "압도하다", "압도했다", "압도적인",
                "무조건", "반드시", "절대", "절대적으로", "절대적"
            ]
            prompt = get_orange_prompt(negative_keywords, top_negative, full_text)
            print(f"🟠 프롬프트 생성 완료, LLM 호출 중...")
            
            # LLM 호출
            response = await llm.ainvoke(prompt)
            print(f"🟠 LLM 응답 받음: {len(response.content)} 문자")
            
            try:
                result = json.loads(response.content)
                highlights = result.get("highlights", [])
                print(f"🟠 파싱된 하이라이트 수: {len(highlights)}")
                
                # 감정 점수 추가
                for highlight in highlights:
                    for neg_sent in top_negative:
                        if highlight["sentence"] == neg_sent["sentence"]:
                            highlight["sentiment_score"] = neg_sent["sentiment_score"]
                            break
                
                print(f"🟠 최종 주황색 하이라이트 수: {len(highlights)}")
                return highlights
            except json.JSONDecodeError:
                print(f"JSON 파싱 오류: {response.content}")
                return []
        
        return []
        
    except Exception as e:
        print(f"오렌지색 감정 분석 오류: {str(e)}")
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
        "orange": [],
        "purple": [],
        "blue": []
    }
    
    # 비동기 분석을 위한 준비
    import asyncio
    
    async def run_all_analyses():
        tasks = []
        
        # 각 카테고리별 분석 태스크 생성
        for color, criteria in highlight_criteria.items():
            # 키워드 대신 빈 배열 전달 (LLM이 문맥으로 판단)
            task = analyze_category_with_llm(resume_content, color, [])
            tasks.append((color, task))
        
        # 모든 분석 실행
        results = {}
        for color, task in tasks:
            try:
                result = await task
                results[color] = result
                print(f"✅ {color} 분석 완료: {len(result)}개 결과")
            except Exception as e:
                print(f"❌ 분석 오류 ({color}): {str(e)}")
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
    
    # 전체 하이라이트 통합 (색상별 카테고리 매핑)
    all_highlights = []
    color_to_category = {
        "yellow": "value_fit",
        "red": "mismatch", 
        "orange": "negative_tone",
        "purple": "experience",
        "blue": "skill_fit"
    }
    
    for color, color_highlights in highlights.items():
        print(f"🔄 {color} 하이라이트 처리 중: {len(color_highlights)}개")
        for highlight in color_highlights:
            # 색상별로 적절한 카테고리명 설정
            category = color_to_category.get(color, color)
            all_highlights.append({
                **highlight,
                "category": category,  # 의미적 카테고리명으로 설정
                "color": color  # 색상 정보도 유지
            })
    
    # 🆕 전환어를 고려한 부정 하이라이팅 필터링
    filtered_highlights = filter_negative_highlights_with_transitions(all_highlights, resume_content)
    
    # 필터링된 결과를 색상별로 다시 분류
    filtered_by_color = {
        "yellow": [],
        "red": [],
        "orange": [],
        "purple": [],
        "blue": []
    }
    
    for highlight in filtered_highlights:
        color = highlight.get("color", "")
        if color in filtered_by_color:
            # color 키 제거하고 원본 형태로 복원 (category는 유지)
            highlight_copy = {k: v for k, v in highlight.items() if k != "color"}
            filtered_by_color[color].append(highlight_copy)
    
    return {
        **state,
        "highlights": filtered_by_color,
        "all_highlights": filtered_highlights,
        "next": "validate_highlights"
    }

def perform_basic_highlighting(resume_content: str, highlight_criteria: Dict[str, Any]) -> Dict[str, Any]:
    """기본 키워드 매칭 (fallback용) - 키워드 없이 빈 결과 반환"""
    highlights = {
        "yellow": [],
        "red": [],
        "orange": [],
        "purple": [],
        "blue": []
    }
    
    # 키워드가 없으므로 빈 결과 반환
    print("키워드 매칭 비활성화됨 - LLM 기반 분석만 사용")
    
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
    """최종 결과 정리"""
    try:
        highlights = state.get("highlights", {})
        
        # 결과 정리 로직
        result = {
            "yellow": highlights.get("yellow", []),
            "red": highlights.get("red", []),
            "orange": highlights.get("orange", []),
            "purple": highlights.get("purple", []),
            "blue": highlights.get("blue", []),
            "highlights": highlights.get("highlights", []),
            "metadata": state.get("metadata", {})
        }
        
        # 색상별 카테고리 매핑
        color_mapping = {
            "yellow": "value_fit",
            "red": "risk",
            "orange": "negative_tone",
            "purple": "experience",
            "blue": "skill_fit"
        }
        
        # 통합 하이라이트 배열 생성
        all_highlights = []
        for color, category in color_mapping.items():
            color_highlights = highlights.get(color, [])
            for highlight in color_highlights:
                all_highlights.append({
                    **highlight,
                    "category": category,
                    "color": color
                })
        
        result["all_highlights"] = all_highlights
        
        # 메타데이터 업데이트
        metadata = state.get("metadata", {})
        metadata.update({
            "total_highlights": len(all_highlights),
            "color_distribution": {
                color: len(highlights.get(color, [])) 
                for color in ["yellow", "red", "orange", "purple", "blue"]
            }
        })
        
        result["metadata"] = metadata
        
        print(f"✅ 최종 결과 정리 완료: 총 {len(all_highlights)}개 하이라이트")
        return result
        
    except Exception as e:
        print(f"❌ 최종 결과 정리 실패: {e}")
        return {
            "yellow": [],
            "red": [],
            "orange": [],
            "purple": [],
            "blue": [],
            "highlights": [],
            "all_highlights": [],
            "metadata": {"error": str(e)}
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
            "orange": [],
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