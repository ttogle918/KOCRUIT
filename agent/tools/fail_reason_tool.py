from langchain_openai import ChatOpenAI
import json

def fail_reason_tool(state):
    """
    점수와 평가 세부사항을 바탕으로 불합격 이유를 생성합니다.
    """
    ai_score = state.get("ai_score", 0)
    scoring_details = state.get("scoring_details", {})
    job_posting = state.get("job_posting", "")
    spec_data = state.get("spec_data", {})
    resume_data = state.get("resume_data", {})
    
    if ai_score == 0:
        return {**state, "fail_reason": ""}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    prompt = f"""
    아래의 정보를 바탕으로 지원자의 불합격 이유를 작성해주세요.
    
    채용공고 내용:
    {job_posting}
    
    지원자 스펙 정보:
    {json.dumps(spec_data, ensure_ascii=False, indent=2)}
    
    이력서 정보:
    {json.dumps(resume_data, ensure_ascii=False, indent=2)}
    
    평가 점수: {ai_score}점
    
    평가 세부사항:
    {json.dumps(scoring_details, ensure_ascii=False, indent=2)}
    
    불합격 이유 작성 가이드라인:
    1. 주요 부족한 점을 2-3개 정도 언급
    2. 채용공고 요구사항과의 차이점 강조
    3. 구체적인 개선점 제시
    4. 전문적이고 객관적인 톤으로 작성
    5. 200자 이내로 간결하게 작성
    6. 부정적이지 않고 건설적인 피드백 제공
    
    응답 형식 (JSON):
    {{
        "fail_reason": "요구 경력과 기술스택에 비해 부족한 실무 경험과 프로젝트 경험이 있습니다. 또한 관련 자격증이나 포트폴리오가 부족하여 채용공고의 요구사항을 충족하지 못합니다. 더 많은 실무 경험과 기술 역량 개발이 필요합니다."
    }}
    """
    
    try:
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        
        # JSON 부분만 추출
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        reason_result = json.loads(response_text)
        fail_reason = reason_result.get("fail_reason", "")
        
        return {
            **state, 
            "fail_reason": fail_reason
        }
        
    except Exception as e:
        print(f"불합격 이유 생성 중 오류 발생: {e}")
        return {
            **state, 
            "fail_reason": ""
        } 