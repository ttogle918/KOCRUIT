from langchain_openai import ChatOpenAI
import json

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def weight_extraction_tool(state):
    """
    채용공고 내용을 분석하여 이력서 평가에 필요한 가중치를 추출합니다.
    """
    content = state.get("job_posting", "")
    
    if not content:
        return {**state, "weights": []}
    
    prompt = f"""
    다음 채용공고를 정확히 분석하여, 해당 직무에 특화된 이력서 평가 가중치를 추출해주세요.

    채용공고 내용:
    {content}

    분석 과정:
    1. 먼저 채용공고에서 요구하는 핵심 기술, 경험, 자격요건을 파악
    2. 직무 특성에 맞는 평가 항목들을 도출
    3. 각 항목의 중요도를 채용공고 내용을 기반으로 판단

    요구사항:
    - 최소 5개 이상의 가중치 항목 추출
    - 채용공고에서 언급된 구체적인 기술/경험을 반영
    - 각 항목은 한글로 작성
    - 중요도는 0.1~1.0 사이 (1.0이 가장 중요)
    - 채용공고에서 강조된 내용일수록 높은 점수

    참고 카테고리 (채용공고 내용에 따라 선택적 적용):
    - 기술적 역량: 프로그래밍 언어, 프레임워크, 도구 등
    - 경험: 프로젝트, 업계 경력, 특정 도메인 경험
    - 자격/증명: 학위, 자격증, 인증서
    - 소프트 스킬: 협업, 소통, 문제해결 등
    - 특수 역량: 해당 직무만의 고유한 요구사항

    응답 형식 (JSON만):
    {{
        "weights": [
            {{"item": "구체적인_항목명", "score": 0.9}},
            {{"item": "다른_항목명", "score": 0.7}}
        ]
    }}
    """
    
    try:
        response = llm.invoke(prompt)
        # JSON 응답 파싱
        response_text = response.content.strip()
        
        # JSON 부분만 추출 (```json ... ``` 형태일 수 있음)
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        weights_data = json.loads(response_text)
        weights = weights_data.get("weights", [])
        
        # 점수를 float로 변환
        for weight in weights:
            if isinstance(weight.get("score"), str):
                weight["score"] = float(weight["score"])
        
        return {**state, "weights": weights}
        
    except Exception as e:
        print(f"가중치 추출 중 오류 발생: {e}")
        # 기본 가중치 반환 (범용적인 항목들)
        default_weights = [
            {"item": "관련 경험", "score": 0.8},
            {"item": "핵심 기술", "score": 0.9},
            {"item": "프로젝트 경험", "score": 0.7},
            {"item": "문제해결 능력", "score": 0.6},
            {"item": "전문 지식", "score": 0.8},
            {"item": "학습능력", "score": 0.5}
        ]
        return {**state, "weights": default_weights} 