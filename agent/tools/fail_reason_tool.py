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
    아래의 정보를 바탕으로 지원자의 불합격 이유를 더욱 구체적이고 자세하게 작성해주세요.

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
    1. 채용공고 요구사항과 비교하여 부족한 점을 항목별로 2~3개 구체적으로 설명
    2. 실무 경험, 프로젝트, 자격증, 기술스택 등에서 미달된 부분을 구체적으로 언급
    3. 각 부족한 점에 대해 개선 방향이나 추천 조치도 함께 제시
    4. 전문적이고 객관적인 톤, 300자 이내로 자세하게 작성
    5. 단순 나열이 아니라, 지원자가 성장할 수 있도록 건설적인 피드백 포함
    6. 지원자가 보유한 자격증(certifications)을 정확히 확인하고, 실제로 없는 자격증에 대해서만 언급
    7. spec_data의 certifications 배열에 있는 자격증들은 이미 보유하고 있는 것으로 간주
    8. 수상경력(awards), 활동경험(activities), 프로젝트경험(projects)도 종합적으로 고려하여 평가
    9. 모든 spec 데이터를 정확히 파악하고, 실제로 부족한 부분만 언급

    응답 형식 (JSON):
    {{
        "fail_reason": "..."
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