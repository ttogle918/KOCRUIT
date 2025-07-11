from langchain_openai import ChatOpenAI
import json

def pass_reason_tool(state):
    """
    점수와 평가 세부사항을 바탕으로 합격 이유를 생성합니다.
    """
    ai_score = state.get("ai_score", 0)
    scoring_details = state.get("scoring_details", {})
    job_posting = state.get("job_posting", "")
    spec_data = state.get("spec_data", {})
    resume_data = state.get("resume_data", {})
    
    if ai_score == 0:
        return {**state, "pass_reason": ""}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    prompt = f"""
    아래의 정보를 바탕으로 지원자의 합격 이유를 작성해주세요.
    
    채용공고 내용:
    {job_posting}
    
    지원자 스펙 정보:
    {json.dumps(spec_data, ensure_ascii=False, indent=2)}
    
    이력서 정보:
    {json.dumps(resume_data, ensure_ascii=False, indent=2)}
    
    평가 점수: {ai_score}점
    
    평가 세부사항:
    {json.dumps(scoring_details, ensure_ascii=False, indent=2)}
    
    합격 이유 작성 가이드라인:
    1. 지원자의 주요 강점을 2-3개 정도 언급
    2. 채용공고 요구사항과의 일치도 강조
    3. 구체적인 경험이나 성과 포함
    4. 전문적이고 객관적인 톤으로 작성
    5. 200자 이내로 간결하게 작성
    
    응답 형식 (JSON):
    {{
        "pass_reason": "서울대학교 컴퓨터공학과 졸업으로 우수한 학력과 3년간의 관련 업계 경험을 보유하고 있습니다. 특히 요구 기술스택과 높은 일치도를 보이며, 다양한 프로젝트 경험과 수상경력이 있어 채용공고의 요구사항에 적합합니다."
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
        pass_reason = reason_result.get("pass_reason", "")
        
        return {
            **state, 
            "pass_reason": pass_reason
        }
        
    except Exception as e:
        print(f"합격 이유 생성 중 오류 발생: {e}")
        return {
            **state, 
            "pass_reason": ""
        } 