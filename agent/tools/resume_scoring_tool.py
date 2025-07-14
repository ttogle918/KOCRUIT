from langchain_openai import ChatOpenAI
import json

def resume_scoring_tool(state):
    """
    spec 테이블과 resume 테이블 데이터를 기반으로 지원자의 서류 점수를 평가합니다.
    """
    spec_data = state.get("spec_data", {})
    resume_data = state.get("resume_data", {})
    job_posting = state.get("job_posting", "")
    weight_data = state.get("weight_data", {})
    
    if not spec_data or not resume_data:
        return {**state, "ai_score": 0.0, "scoring_details": {}}
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    
    prompt = f"""
    아래의 정보를 바탕으로 지원자의 서류 점수를 0-100점 사이로 평가해주세요.

    평가 기준(가중치):
    {json.dumps(weight_data, ensure_ascii=False, indent=2)}

    채용공고 내용:
    {job_posting}
    
    지원자 스펙 정보:
    {json.dumps(spec_data, ensure_ascii=False, indent=2)}
    
    이력서 정보:
    {json.dumps(resume_data, ensure_ascii=False, indent=2)}
    
    응답 형식 (JSON):
    {{
        "total_score": 85,
        "scoring_details": {{
            "education": {{
                "score": 18,
                "max_score": 20,
                "reason": "서울대학교 컴퓨터공학과 졸업으로 우수한 학력"
            }},
            "experience": {{
                "score": 25,
                "max_score": 30,
                "reason": "3년간의 관련 업계 경험과 다양한 프로젝트 수행"
            }},
            "skills": {{
                "score": 22,
                "max_score": 25,
                "reason": "요구 기술스택과 높은 일치도, 관련 자격증 보유"
            }},
            "portfolio": {{
                "score": 12,
                "max_score": 15,
                "reason": "포트폴리오 품질 우수, 수상경력 있음"
            }},
            "others": {{
                "score": 8,
                "max_score": 10,
                "reason": "추가적인 강점들"
            }}
        }}
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
        
        scoring_result = json.loads(response_text)
        total_score = scoring_result.get("total_score", 0)
        scoring_details = scoring_result.get("scoring_details", {})
        
        return {
            **state, 
            "ai_score": total_score,
            "scoring_details": scoring_details
        }
        
    except Exception as e:
        print(f"점수 평가 중 오류 발생: {e}")
        return {
            **state, 
            "ai_score": 0.0,
            "scoring_details": {}
        } 