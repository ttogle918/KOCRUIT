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
    from app.models.company import Company
    from app.models.department import Department
    DB_AVAILABLE = True
except ImportError as e:
    print(f"Database import failed: {e}")
    DB_AVAILABLE = False

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def get_company_profile(company_id: int) -> Dict[str, Any]:
    """
    기업의 프로필 정보를 조회하여 맞춤형 가중치 조정에 활용합니다.
    
    Args:
        company_id: 기업 ID
    
    Returns:
        기업 프로필 정보
    """
    if not DB_AVAILABLE:
        return {}
    
    try:
        db = SessionLocal()
        
        # 기업 기본 정보 조회
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            db.close()
            return {}
        
        # 부서 정보 조회 (기업 규모 및 구조 파악)
        departments = db.query(Department).filter(Department.company_id == company_id).all()
        
        # 기업 규모 추정 (부서 수 기반)
        company_size = "중소기업" if len(departments) <= 5 else "중견기업" if len(departments) <= 10 else "대기업"
        
        # 산업 분야 추정 (기업명 기반)
        industry = analyze_industry_from_name(company.name)
        
        # 기업 문화 특성 추정 (부서 구성 기반)
        culture_traits = analyze_culture_from_departments(departments)
        
        company_profile = {
            "id": company.id,
            "name": company.name,
            "description": company.description,
            "values_text": company.values_text,
            "size": company_size,
            "industry": industry,
            "culture_traits": culture_traits,
            "department_count": len(departments),
            "departments": [dept.name for dept in departments]
        }
        
        db.close()
        return company_profile
        
    except Exception as e:
        print(f"기업 프로필 조회 중 오류: {e}")
        return {}

def analyze_industry_from_name(company_name: str) -> str:
    """기업명을 기반으로 산업 분야를 추정"""
    industry_keywords = {
        "전자": "전자/IT",
        "소프트웨어": "전자/IT", 
        "IT": "전자/IT",
        "테크": "전자/IT",
        "금융": "금융/보험",
        "은행": "금융/보험",
        "보험": "금융/보험",
        "건설": "건설/부동산",
        "부동산": "건설/부동산",
        "제조": "제조업",
        "자동차": "제조업",
        "화학": "제조업",
        "바이오": "바이오/헬스케어",
        "의료": "바이오/헬스케어",
        "제약": "바이오/헬스케어",
        "에너지": "에너지/환경",
        "환경": "에너지/환경",
        "물류": "물류/운송",
        "운송": "물류/운송",
        "마케팅": "서비스업",
        "광고": "서비스업",
        "엔터": "미디어/엔터테인먼트",
        "미디어": "미디어/엔터테인먼트",
        "보안": "보안/방산",
        "방산": "보안/방산",
        "공공": "공공기관",
        "정부": "공공기관"
    }
    
    for keyword, industry in industry_keywords.items():
        if keyword in company_name:
            return industry
    
    return "일반/기타"

def analyze_culture_from_departments(departments: List) -> List[str]:
    """부서 구성을 기반으로 기업 문화 특성을 추정"""
    culture_traits = []
    dept_names = [dept.name.lower() for dept in departments]
    
    # 혁신 지향적
    if any(keyword in dept_names for keyword in ["연구", "개발", "r&d", "ai", "데이터", "혁신", "연구개발"]):
        culture_traits.append("혁신 지향적")
    
    # 고객 중심적
    if any(keyword in dept_names for keyword in ["고객", "서비스", "cs", "마케팅", "영업", "고객서비스"]):
        culture_traits.append("고객 중심적")
    
    # 기술 중심적
    if any(keyword in dept_names for keyword in ["개발", "엔지니어", "기술", "qa", "품질", "품질관리"]):
        culture_traits.append("기술 중심적")
    
    # 안정 지향적
    if any(keyword in dept_names for keyword in ["경영", "기획", "재무", "인사", "총무", "경영기획"]):
        culture_traits.append("안정 지향적")
    
    # 글로벌 지향적
    if any(keyword in dept_names for keyword in ["해외", "글로벌", "수출", "국제"]):
        culture_traits.append("글로벌 지향적")
    
    return culture_traits if culture_traits else ["균형잡힌"]

def adjust_weights_for_company(weights: List[Dict[str, Any]], company_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    기업 프로필을 기반으로 가중치를 조정합니다.
    
    Args:
        weights: 기본 가중치 리스트
        company_profile: 기업 프로필 정보
    
    Returns:
        조정된 가중치 리스트
    """
    if not company_profile:
        return weights
    
    adjusted_weights = []
    
    # 기업 규모별 조정
    size_adjustments = {
        "중소기업": {
            "multipliers": {
                "기술적 역량": 1.1,  # 중소기업은 기술력 중시
                "다양한 경험": 1.2,  # 다방면 경험 중시
                "적응력": 1.3,       # 빠른 적응 필요
                "창의성": 1.2        # 혁신적 사고 중시
            }
        },
        "중견기업": {
            "multipliers": {
                "전문성": 1.1,       # 전문성 중시
                "팀워크": 1.2,       # 협업 능력 중시
                "성장 가능성": 1.1    # 성장 잠재력 중시
            }
        },
        "대기업": {
            "multipliers": {
                "학력": 1.2,         # 학력 중시
                "대기업 경험": 1.3,   # 대기업 경험 중시
                "전문 자격": 1.2,     # 전문 자격 중시
                "안정성": 1.1        # 안정성 중시
            }
        }
    }
    
    # 산업별 조정
    industry_adjustments = {
        "전자/IT": {
            "multipliers": {
                "최신 기술": 1.3,     # 최신 기술 중시
                "프로젝트 경험": 1.2,  # 프로젝트 경험 중시
                "문제해결 능력": 1.2   # 문제해결 능력 중시
            }
        },
        "금융/보험": {
            "multipliers": {
                "안정성": 1.3,        # 안정성 중시
                "규정 준수": 1.2,     # 규정 준수 중시
                "정확성": 1.2         # 정확성 중시
            }
        },
        "바이오/헬스케어": {
            "multipliers": {
                "전문 지식": 1.3,     # 전문 지식 중시
                "연구 경험": 1.2,     # 연구 경험 중시
                "윤리성": 1.2         # 윤리성 중시
            }
        },
        "제조업": {
            "multipliers": {
                "품질 관리": 1.2,     # 품질 관리 중시
                "안전 의식": 1.2,     # 안전 의식 중시
                "체계적 사고": 1.1    # 체계적 사고 중시
            }
        }
    }
    
    # 문화 특성별 조정
    culture_adjustments = {
        "혁신 지향적": {
            "multipliers": {
                "창의성": 1.3,        # 창의성 중시
                "도전 정신": 1.2,     # 도전 정신 중시
                "학습 능력": 1.2      # 학습 능력 중시
            }
        },
        "고객 중심적": {
            "multipliers": {
                "소통 능력": 1.3,     # 소통 능력 중시
                "서비스 마인드": 1.2,  # 서비스 마인드 중시
                "문제해결 능력": 1.2   # 문제해결 능력 중시
            }
        },
        "기술 중심적": {
            "multipliers": {
                "기술적 역량": 1.3,    # 기술적 역량 중시
                "전문성": 1.2,        # 전문성 중시
                "지속적 학습": 1.2    # 지속적 학습 중시
            }
        }
    }
    
    # 가중치 조정 적용
    for weight in weights:
        item = weight["item"]
        score = weight["score"]
        adjusted_score = score
        
        # 기업 규모별 조정
        size_profile = size_adjustments.get(company_profile.get("size", ""), {})
        if item in size_profile.get("multipliers", {}):
            adjusted_score *= size_profile["multipliers"][item]
        
        # 산업별 조정
        industry_profile = industry_adjustments.get(company_profile.get("industry", ""), {})
        if item in industry_profile.get("multipliers", {}):
            adjusted_score *= industry_profile["multipliers"][item]
        
        # 문화 특성별 조정
        for culture_trait in company_profile.get("culture_traits", []):
            culture_profile = culture_adjustments.get(culture_trait, {})
            if item in culture_profile.get("multipliers", {}):
                adjusted_score *= culture_profile["multipliers"][item]
        
        # 점수 범위 제한 (0.1 ~ 1.0)
        adjusted_score = max(0.1, min(1.0, adjusted_score))
        
        adjusted_weights.append({
            "item": item,
            "score": round(adjusted_score, 2),
            "original_score": score,
            "adjustment_applied": adjusted_score != score
        })
    
    return adjusted_weights

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
    DB의 유사한 jobpost 데이터를 참고하고, 기업 맞춤형 가중치를 제공합니다.
    """
    content = state.get("job_posting", "")
    job_title = state.get("job_title", "")
    company_id = state.get("company_id")
    
    if not content:
        return {**state, "weights": []}
    
    # 기업 프로필 조회 (기업 맞춤형 가중치용)
    company_profile = {}
    if company_id and DB_AVAILABLE:
        try:
            company_profile = get_company_profile(company_id)
            if company_profile:
                print(f"✅ 기업 프로필 조회 완료: {company_profile['name']} ({company_profile['size']}, {company_profile['industry']})")
            else:
                print(f"ℹ️ 기업 프로필을 찾을 수 없습니다. 기본 가중치로 진행합니다.")
        except Exception as e:
            print(f"⚠️ 기업 프로필 조회 중 오류 발생: {e}. 기본 가중치로 진행합니다.")
    
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
    
    # 기업 프로필 정보를 프롬프트에 포함
    company_context = ""
    if company_profile:
        company_context = f"""
    
    기업 맞춤형 가중치 조정을 위한 기업 정보:
    - 기업명: {company_profile['name']}
    - 기업 규모: {company_profile['size']}
    - 산업 분야: {company_profile['industry']}
    - 기업 문화: {', '.join(company_profile['culture_traits'])}
    - 부서 수: {company_profile['department_count']}개
    - 주요 부서: {', '.join(company_profile['departments'][:5])}
    
    위 기업 특성을 고려하여 가중치를 조정해주세요:
    - {company_profile['size']} 기업의 특성에 맞는 가중치 조정
    - {company_profile['industry']} 산업의 요구사항 반영
    - {', '.join(company_profile['culture_traits'])} 문화에 적합한 평가 기준 적용
    """
    
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
    {content}{company_context}{db_reference}

    분석 과정:
    1. 먼저 채용공고에서 요구하는 핵심 기술, 경험, 자격요건을 파악
    2. 직무 특성에 맞는 평가 항목들을 도출
    3. 각 항목의 중요도를 채용공고 내용을 기반으로 판단
    4. 기업 특성을 고려하여 맞춤형 가중치 조정
    5. 기존 가중치 데이터가 있다면 참고하여 일관성 있는 패턴 유지

    요구사항:
    - 최소 5개 이상의 가중치 항목 추출
    - 채용공고에서 언급된 구체적인 기술/경험을 반영
    - 각 항목은 한글로 작성
    - 중요도는 0.1~1.0 사이 (1.0이 가장 중요)
    - 채용공고에서 강조된 내용일수록 높은 점수
    - 기업 특성에 맞는 맞춤형 가중치 적용
    - 기존 가중치 데이터가 있다면 유사한 항목명과 점수 범위를 참고

    참고 카테고리 (채용공고 내용에 따라 선택적 적용):
    - 기술적 역량: 프로그래밍 언어, 프레임워크, 도구 등
    - 경험: 프로젝트, 업계 경력, 특정 도메인 경험
    - 자격/증명: 학위, 자격증, 인증서
    - 소프트 스킬: 협업, 소통, 문제해결 등
    - 특수 역량: 해당 직무만의 고유한 요구사항
    - 기업 맞춤 역량: 기업 문화와 규모에 맞는 특별한 요구사항

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
        
        # 기업 맞춤형 가중치 조정
        if company_profile:
            adjusted_weights = adjust_weights_for_company(weights, company_profile)
            print(f"✅ 기업 맞춤형 가중치 조정 완료: {len([w for w in adjusted_weights if w.get('adjustment_applied')])}개 항목 조정됨")
            weights = adjusted_weights
        
        # DB 참고 정보를 state에 추가
        result_state = {**state, "weights": weights}
        if similar_jobpost_id:
            result_state["similar_jobpost_id"] = similar_jobpost_id
            result_state["db_weight_reference"] = db_weight_data
        if company_profile:
            result_state["company_profile"] = company_profile
            result_state["company_customized"] = True
        
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
        
        # 기업 맞춤형 조정 적용
        if company_profile:
            default_weights = adjust_weights_for_company(default_weights, company_profile)
        
        return {**state, "weights": default_weights} 