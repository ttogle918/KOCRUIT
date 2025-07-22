from langchain_openai import ChatOpenAI
import json
from agent.utils.llm_cache import redis_cache

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

@redis_cache()
def resume_scoring_tool(state):
    """
    spec 테이블과 resume 테이블 데이터를 기반으로 지원자의 서류 점수를 평가합니다.
    Redis 캐싱이 적용되어 같은 입력에 대해 캐시된 결과를 반환합니다.
    """
    spec_data = state.get("spec_data", {})
    resume_data = state.get("resume_data", {})
    job_posting = state.get("job_posting", "")
    weight_data = state.get("weight_data", {})
    
    # 디버깅을 위한 로그 출력
    print(f"[RESUME-SCORING] Spec Data Keys: {list(spec_data.keys())}")
    print(f"[RESUME-SCORING] Certifications: {spec_data.get('certifications', [])}")
    print(f"[RESUME-SCORING] Weight Data: {weight_data}")
    
    if not spec_data or not resume_data:
        return {**state, "ai_score": 0.0, "scoring_details": {}}
    
    prompt = f"""
    아래의 정보를 바탕으로 지원자의 서류 점수를 0-100점 사이로 평가해주세요.

    채용공고 내용:
    {job_posting}
    
    지원자 스펙 정보:
    {json.dumps(spec_data, ensure_ascii=False, indent=2)}
    
    이력서 정보:
    {json.dumps(resume_data, ensure_ascii=False, indent=2)}

    평가 기준 가중치 (중요도 순):
    {json.dumps(weight_data, ensure_ascii=False, indent=2)}

    평가 가이드라인:
    1. 가중치가 높은 항목(1.0에 가까운)을 우선적으로 고려하여 평가
    2. 가중치가 0.8 이상인 항목은 해당 지원자가 보유하고 있으면 높은 점수 부여
    3. 가중치가 0.7 이상인 항목도 중요한 평가 요소로 고려
    4. 지원자의 스펙과 이력서 내용을 종합적으로 분석하여 점수 결정
    5. 자격증(certifications) 정보를 반드시 확인하고, 채용공고에서 요구하는 자격증이 있으면 높은 점수 부여
    6. spec_data의 certifications 배열에 있는 자격증들을 모두 고려하여 평가
    7. 수상경력(awards), 활동경험(activities), 프로젝트경험(projects)도 종합적으로 평가
    8. 모든 spec 데이터를 종합하여 지원자의 전체적인 역량을 평가
    
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
            "certifications": {{
                "score": 15,
                "max_score": 15,
                "reason": "정보처리기사 등 요구 자격증 보유"
            }},
            "awards": {{
                "score": 8,
                "max_score": 10,
                "reason": "수상경력 및 활동경험 우수"
            }},
            "projects": {{
                "score": 12,
                "max_score": 15,
                "reason": "프로젝트 경험 및 포트폴리오 품질 우수"
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