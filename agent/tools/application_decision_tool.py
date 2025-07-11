from langchain_openai import ChatOpenAI
import json

def application_decision_tool(state):
    """
    점수를 기반으로 최종 서류 합격/불합격을 판별합니다.
    """
    ai_score = state.get("ai_score", 0)
    pass_reason = state.get("pass_reason", "")
    fail_reason = state.get("fail_reason", "")
    
    # 기본 합격 기준: 70점 이상
    PASS_THRESHOLD = 70
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
    
    prompt = f"""
    아래의 정보를 바탕으로 지원자의 최종 서류 합격/불합격을 판별해주세요.
    
    평가 점수: {ai_score}점
    합격 기준: {PASS_THRESHOLD}점 이상
    
    합격 이유: {pass_reason}
    불합격 이유: {fail_reason}
    
    판별 기준:
    1. {PASS_THRESHOLD}점 이상: PASSED
    2. {PASS_THRESHOLD}점 미만: REJECTED
    
    응답 형식 (JSON):
    {{
        "status": "PASSED",
        "decision_reason": "70점 이상의 높은 점수로 합격 기준을 충족합니다.",
        "confidence": 0.95
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
        
        decision_result = json.loads(response_text)
        status = decision_result.get("status", "REJECTED")
        decision_reason = decision_result.get("decision_reason", "")
        confidence = decision_result.get("confidence", 0.0)
        
        # 점수 기반으로 최종 검증
        if ai_score >= PASS_THRESHOLD:
            final_status = "PASSED"
        else:
            final_status = "REJECTED"
        
        return {
            **state, 
            "status": final_status,
            "decision_reason": decision_reason,
            "confidence": confidence
        }
        
    except Exception as e:
        print(f"합격 판별 중 오류 발생: {e}")
        # 기본 판별 로직
        if ai_score >= PASS_THRESHOLD:
            final_status = "PASSED"
        else:
            final_status = "REJECTED"
        
        return {
            **state, 
            "status": final_status,
            "decision_reason": f"점수 {ai_score}점으로 합격 기준 {PASS_THRESHOLD}점 {'충족' if ai_score >= PASS_THRESHOLD else '미충족'}",
            "confidence": 0.8
        } 