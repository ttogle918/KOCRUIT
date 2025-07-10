from langchain_openai import ChatOpenAI
import json

def weight_extraction_tool(state):
    """
    채용공고 내용을 분석하여 이력서 평가에 필요한 가중치를 추출합니다.
    """
    content = state.get("job_posting", "")
    
    if not content:
        return {**state, "weights": []}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    prompt = f"""
    아래의 채용공고 내용을 분석하여, 이력서 평가 시 고려해야 할 가중치 항목들을 추출해주세요.
    
    요구사항:
    1. 최소 5개 이상의 가중치 항목을 추출
    2. 각 항목은 한글로 작성
    3. 각 항목의 중요도를 0.0~1.0 사이의 점수로 평가 (1.0이 가장 중요)
    4. JSON 형식으로 응답
    
    추출할 가중치 예시:
    - 학력 (0.8)
    - 경력 (0.9)
    - 자격증 (0.6)
    - 기술스택 (0.7)
    - 프로젝트 경험 (0.8)
    - 언어 능력 (0.5)
    - 포트폴리오 (0.6)
    - 인성/소프트스킬 (0.4)
    
    채용공고 내용:
    {content}
    
    응답 형식 (JSON):
    {{
        "weights": [
            {{"item": "항목명", "score": 0.8}},
            {{"item": "항목명", "score": 0.9}}
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
        # 기본 가중치 반환 (더 일반적인 항목들)
        default_weights = [
            {"item": "기술스택", "score": 0.8},
            {"item": "프로젝트 경험", "score": 0.7},
            {"item": "문제해결 능력", "score": 0.6},
            {"item": "팀워크", "score": 0.5},
            {"item": "학습 의지", "score": 0.6}
        ]
        return {**state, "weights": default_weights} 