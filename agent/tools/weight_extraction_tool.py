from langchain_openai import ChatOpenAI
import json
import sys
import os
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional

# Backend 경로를 Python path에 추가
backend_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend')
sys.path.append(backend_path)

try:
    from app.core.database import SessionLocal
    from app.models.job import JobPost
    from app.models.weight import Weight
    DB_AVAILABLE = True
except ImportError as e:
    print(f"Database import failed: {e}")
    DB_AVAILABLE = False

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def find_similar_jobpost(title: str, threshold: float = 0.6) -> Optional[int]:
    """
    DB에서 유사한 제목의 jobpost를 찾아서 ID를 반환합니다.
    
    Args:
        title: 검색할 제목
        threshold: 유사도 임계값 (0.0 ~ 1.0)
    
    Returns:
        유사한 jobpost의 ID 또는 None
    """
    if not DB_AVAILABLE:
        return None
    
    try:
        db = SessionLocal()
        
        # 모든 jobpost 제목 조회
        jobposts = db.query(JobPost.id, JobPost.title).all()
        
        best_match = None
        best_score = 0
        
        for jobpost_id, jobpost_title in jobposts:
            # SequenceMatcher를 사용한 유사도 계산
            similarity = SequenceMatcher(None, title.lower(), jobpost_title.lower()).ratio()
            
            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = jobpost_id
        
        db.close()
        return best_match
        
    except Exception as e:
        print(f"유사한 jobpost 검색 중 오류: {e}")
        return None

def get_weight_data_from_db(jobpost_id: int) -> List[Dict[str, Any]]:
    """
    DB에서 특정 jobpost의 weight 데이터를 조회합니다.
    
    Args:
        jobpost_id: jobpost ID
    
    Returns:
        weight 데이터 리스트
    """
    if not DB_AVAILABLE:
        return []
    
    try:
        db = SessionLocal()
        
        # weight 테이블에서 해당 jobpost의 field_name과 weight_value 조회
        weights = db.query(Weight.field_name, Weight.weight_value).filter(
            Weight.jobpost_id == jobpost_id
        ).all()
        
        weight_data = [
            {"item": weight.field_name, "score": weight.weight_value}
            for weight in weights
        ]
        
        db.close()
        return weight_data
        
    except Exception as e:
        print(f"DB에서 weight 데이터 조회 중 오류: {e}")
        return []

def weight_extraction_tool(state):
    """
    채용공고 내용을 분석하여 이력서 평가에 필요한 가중치를 추출합니다.
    DB의 유사한 jobpost 데이터를 참고하여 더 정확한 가중치를 생성합니다.
    """
    content = state.get("job_posting", "")
    job_title = state.get("job_title", "")
    
    if not content:
        return {**state, "weights": []}
    
    # DB에서 유사한 jobpost 찾기
    similar_jobpost_id = None
    db_weight_data = []
    
    if job_title and DB_AVAILABLE:
        try:
            similar_jobpost_id = find_similar_jobpost(job_title)
            if similar_jobpost_id:
                db_weight_data = get_weight_data_from_db(similar_jobpost_id)
                print(f"✅ 유사한 jobpost 발견: ID {similar_jobpost_id}, weight 데이터 {len(db_weight_data)}개")
            else:
                print(f"ℹ️ 유사한 jobpost를 찾지 못했습니다. LLM 기반 가중치 생성으로 진행합니다.")
        except Exception as e:
            print(f"⚠️ DB 조회 중 오류 발생: {e}. LLM 기반 가중치 생성으로 진행합니다.")
    elif not DB_AVAILABLE:
        print("ℹ️ DB 연결이 불가능합니다. LLM 기반 가중치 생성으로 진행합니다.")
    
    # DB 데이터를 참고하여 프롬프트 구성
    db_reference = ""
    if db_weight_data:
        db_reference = f"""
        
    참고할 기존 가중치 데이터 (유사한 공고에서 추출):
    {json.dumps(db_weight_data, ensure_ascii=False, indent=2)}
    
    위 데이터를 참고하여 유사한 패턴의 가중치를 생성하되, 현재 채용공고의 특성에 맞게 조정해주세요.
    """
    
    prompt = f"""
    다음 채용공고를 정확히 분석하여, 해당 직무에 특화된 이력서 평가 가중치를 추출해주세요.

    채용공고 내용:
    {content}{db_reference}

    분석 과정:
    1. 먼저 채용공고에서 요구하는 핵심 기술, 경험, 자격요건을 파악
    2. 직무 특성에 맞는 평가 항목들을 도출
    3. 각 항목의 중요도를 채용공고 내용을 기반으로 판단
    4. 기존 가중치 데이터가 있다면 참고하여 일관성 있는 패턴 유지

    요구사항:
    - 최소 5개 이상의 가중치 항목 추출
    - 채용공고에서 언급된 구체적인 기술/경험을 반영
    - 각 항목은 한글로 작성
    - 중요도는 0.1~1.0 사이 (1.0이 가장 중요)
    - 채용공고에서 강조된 내용일수록 높은 점수
    - 기존 가중치 데이터가 있다면 유사한 항목명과 점수 범위를 참고

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
        
        # DB 참고 정보를 state에 추가
        result_state = {**state, "weights": weights}
        if similar_jobpost_id:
            result_state["similar_jobpost_id"] = similar_jobpost_id
            result_state["db_weight_reference"] = db_weight_data
        
        return result_state
        
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