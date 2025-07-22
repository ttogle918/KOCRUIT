import re
import json
import html
import sys
from typing import Dict, List, Any, Optional
from openai import OpenAI
import os
from agent.utils.llm_cache import redis_cache, async_redis_cache
import asyncio

# === Requests 패키지 체크 ===
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("[WARNING] requests 패키지가 설치되어 있지 않습니다. API 호출이 불가능합니다.")

# === 백엔드 API 설정 ===
BACKEND_API_BASE_URL = os.getenv("BACKEND_API_BASE_URL", "http://kocruit_fastapi:8000/api/v1")

# === 인증 토큰 설정 ===
BACKEND_API_TOKEN = os.getenv("BACKEND_API_TOKEN", "")

# === KcELECTRA 감정 분석 모델 ===
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    HAS_TRANSFORMERS = True
    
    # 싱글톤 모델 인스턴스
    _sentiment_model = None
    _sentiment_tokenizer = None
    
    def get_sentiment_model():
        """싱글톤 감정 분석 모델 반환"""
        global _sentiment_model, _sentiment_tokenizer
        if _sentiment_model is None:
            print("[INFO] KcELECTRA 모델 로딩 중...")
            model_name = "beomi/KcELECTRA-base-v2022"
            _sentiment_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _sentiment_model = AutoModelForSequenceClassification.from_pretrained(model_name)
            print("[INFO] KcELECTRA 모델 로딩 완료")
        return _sentiment_model, _sentiment_tokenizer
    
except ImportError:
    HAS_TRANSFORMERS = False

# === 공통 유틸리티 함수들 ===
def get_color_for_category(category: str) -> str:
    """카테고리별 색상 반환"""
    color_map = {
        "skill_fit": "#3B82F6",  # 파란색
        "value_fit": "#F59E0B",  # 노란색
        "risk": "#EF4444",       # 빨간색
        "vague": "#6B7280",      # 회색
        "experience": "#8B5CF6"  # 보라색
    }
    return color_map.get(category, "#000000")

def get_bg_color_for_category(category: str) -> str:
    """카테고리별 배경색 반환"""
    bg_color_map = {
        "skill_fit": "#DBEAFE",  # 연한 파란색
        "value_fit": "#FEF3C7",  # 연한 노란색
        "risk": "#FEE2E2",       # 연한 빨간색
        "vague": "#F3F4F6",      # 연한 회색
        "experience": "#EDE9FE"  # 연한 보라색
    }
    return bg_color_map.get(category, "#FFFFFF")

def get_priority_for_category(category: str) -> int:
    """카테고리별 우선순위 반환 (낮은 숫자가 높은 우선순위)"""
    priority_map = {
        "risk": 1,        # 빨간색 (가장 높은 우선순위)
        "vague": 2,       # 회색
        "experience": 3,  # 보라색
        "value_fit": 4,   # 노란색
        "skill_fit": 5    # 파란색 (가장 낮은 우선순위)
    }
    return priority_map.get(category, 999)

def apply_priority_to_highlights(all_highlights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """우선순위 기반으로 하이라이트 정렬 및 중복 처리"""
    if not all_highlights:
        return []
    
    # 1. 우선순위별로 정렬 (낮은 숫자가 높은 우선순위)
    sorted_highlights = sorted(all_highlights, key=lambda x: get_priority_for_category(x.get("category", "")))
    
    # 2. 중복 텍스트 처리 (높은 우선순위가 낮은 우선순위를 덮어씀)
    final_highlights = []
    covered_positions = set()  # 이미 처리된 텍스트 위치
    
    for highlight in sorted_highlights:
        start = highlight.get("start", 0)
        end = highlight.get("end", 0)
        text = highlight.get("text", "")
        
        # 현재 하이라이트의 위치 범위
        current_range = set(range(start, end))
        
        # 이미 처리된 위치와 겹치는지 확인
        overlapping = current_range.intersection(covered_positions)
        
        if not overlapping:
            # 겹치지 않으면 그대로 추가
            final_highlights.append(highlight)
            covered_positions.update(current_range)
        else:
            # 겹치는 부분이 있으면 겹치지 않는 부분만 추가
            non_overlapping_ranges = []
            current_start = start
            
            for pos in sorted(current_range):
                if pos not in covered_positions:
                    if current_start == -1:
                        current_start = pos
                else:
                    if current_start != -1:
                        non_overlapping_ranges.append((current_start, pos))
                        current_start = -1
            
            # 마지막 범위 처리
            if current_start != -1:
                non_overlapping_ranges.append((current_start, end))
            
            # 겹치지 않는 범위들을 별도 하이라이트로 추가
            for range_start, range_end in non_overlapping_ranges:
                if range_end > range_start:
                    new_highlight = highlight.copy()
                    new_highlight["start"] = range_start
                    new_highlight["end"] = range_end
                    new_highlight["text"] = text[range_start - start:range_end - start]
                    final_highlights.append(new_highlight)
                    covered_positions.update(range(range_start, range_end))
    
    return final_highlights

def extract_resume_text(resume_data: Any) -> str:
    """자소서 텍스트 추출 공통 함수: 모든 형광펜 색깔에서 사용"""
    if not resume_data:
        print("[WARNING] 자소서 데이터가 없습니다.")
        return ""
    
    # 문자열인 경우 그대로 반환
    if isinstance(resume_data, str):
        return resume_data.strip()
    
    # 딕셔너리인 경우 content 필드 추출
    if isinstance(resume_data, dict):
        # content 필드가 있는 경우
        if 'content' in resume_data and resume_data['content']:
            content = resume_data['content']
            
            # JSON 배열 형태인지 확인 (title과 content가 함께 있는 구조)
            try:
                if isinstance(content, str):
                    parsed_content = json.loads(content)
                else:
                    parsed_content = content
                
                # 배열인 경우 각 항목의 content만 추출
                if isinstance(parsed_content, list):
                    combined_text = ""
                    for item in parsed_content:
                        if isinstance(item, dict) and 'content' in item and item['content']:
                            combined_text += str(item['content']) + "\n\n"
                    result = combined_text.strip()
                    print(f"[INFO] 자소서 텍스트 추출 완료: {len(result)}자")
                    return result
                
                # 배열이 아닌 경우 그대로 반환
                result = str(content).strip()
                print(f"[INFO] 자소서 텍스트 추출 완료: {len(result)}자")
                return result
                
            except (json.JSONDecodeError, TypeError) as e:
                print(f"[WARNING] 자소서 JSON 파싱 실패: {e}")
                # JSON 파싱 실패 시 그대로 반환
                result = str(content).strip()
                print(f"[INFO] 자소서 텍스트 추출 완료 (파싱 실패): {len(result)}자")
                return result
        
        # content 필드가 없는 경우 다른 필드들 확인
        print("[WARNING] content 필드가 없습니다. 다른 필드들을 확인합니다.")
        for key in ['self_introduction', 'text', 'description']:
            if key in resume_data and resume_data[key]:
                result = str(resume_data[key]).strip()
                print(f"[INFO] {key} 필드에서 자소서 텍스트 추출 완료: {len(result)}자")
                return result
    
    print("[WARNING] 자소서 텍스트를 추출할 수 없습니다.")
    return ""

def split_sentences(text: str) -> List[str]:
    """간단히 문장 단위로 나누기 (정규식 사용) - 모든 색깔에서 공통 사용"""
    if not text:
        return []
    
    # 문장 끝 패턴: . ! ? \n
    sentence_pattern = r'[.!?]\s+|\n+'
    sentences = re.split(sentence_pattern, text)
    
    # 빈 문장 제거하고 정리
    cleaned_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and len(sentence) > 5:  # 너무 짧은 문장 제외
            cleaned_sentences.append(sentence)
    
    return cleaned_sentences

@redis_cache()
def prepare_resume_analysis_data(resume: str) -> Dict[str, Any]:
    """자소서 분석을 위한 공통 데이터 준비 - 모든 색깔에서 공통 사용 (Redis 캐싱)"""
    # 자소서 텍스트 추출
    resume_text = extract_resume_text(resume)
    if not resume_text:
        print("[WARNING] 자소서 텍스트가 없습니다.")
        return {"resume_text": "", "sentences": [], "has_content": False}
    
    # 문장 분할
    sentences = split_sentences(resume_text)
    
    return {
        "resume_text": resume_text,
        "sentences": sentences,
        "has_content": True,
        "sentence_count": len(sentences)
    }

def load_resume_from_api(application_id: int) -> str:
    """자소서 데이터 로드: 백엔드 API를 통해 application_id로 자소서 content 읽어오기"""
    if not HAS_REQUESTS:
        print("[WARNING] requests 패키지가 설치되어 있지 않아 API 호출이 불가능합니다.")
        return ""
    
    try:
        # 헤더 설정
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "HighlightResumeTool/1.0"
        }
        
        # Agent용 엔드포인트 사용 (인증 불필요)
        response = requests.get(
            f"{BACKEND_API_BASE_URL}/applications/{application_id}/content",
            headers=headers,
            timeout=120
        )
        
        print(f"[DEBUG] API 호출 결과: {response.status_code}")
        
        if response.status_code == 200:
            application_data = response.json()
            resume_content = application_data.get("content", "")
            
            if not resume_content:
                print(f"[INFO] 지원서 ID {application_id}의 자소서 내용이 없습니다.")
                return ""
            
            print(f"[INFO] 지원서 ID {application_id}에서 자소서를 API를 통해 가져왔습니다.")
            return resume_content
        elif response.status_code == 404:
            print(f"[ERROR] 지원서 ID {application_id}를 찾을 수 없습니다 (404).")
            return ""
        else:
            print(f"[WARNING] 자소서 API 호출 실패: {response.status_code}")
            print(f"[DEBUG] 응답 내용: {response.text[:200]}")
            return ""
        
    except requests.exceptions.ConnectionError as e:
        print(f"[ERROR] 백엔드 서버 연결 실패: {e}")
        print(f"[DEBUG] 시도한 URL: {BACKEND_API_BASE_URL}/applications/{application_id}/content")
        return ""
    except requests.exceptions.Timeout as e:
        print(f"[ERROR] API 호출 타임아웃: {e}")
        print(f"[DEBUG] 타임아웃된 URL: {url}")
        return ""
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 자소서 API 호출 중 네트워크 오류: {e}")
        return ""
    except Exception as e:
        print(f"[ERROR] 자소서 로드 중 오류: {e}")
        return ""

def load_api_data(endpoint: str, data_id: int, field_name: str, data_type: str = "string", agent_endpoint: str = "") -> Any:
    """통합 API 데이터 로드 함수"""
    if not HAS_REQUESTS:
        print("[WARNING] requests 패키지가 설치되어 있지 않아 API 호출이 불가능합니다.")
        return "" if data_type == "string" else []
    
    try:
        # 헤더 설정
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "HighlightResumeTool/1.0"
        }
        
        # URL 구성 (agent 엔드포인트가 있으면 사용)
        if agent_endpoint:
            url = f"{BACKEND_API_BASE_URL}/{endpoint}/{data_id}/{agent_endpoint}"
        else:
            url = f"{BACKEND_API_BASE_URL}/{endpoint}/{data_id}"
        
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"[DEBUG] {endpoint} API 호출 결과: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            field_value = data.get(field_name, "")
            
            if not field_value:
                print(f"[INFO] {endpoint} ID {data_id}의 {field_name} 정보가 없습니다.")
                return "" if data_type == "string" else []
            
            # 문자열인 경우 그대로 반환
            if data_type == "string":
                print(f"[INFO] {endpoint} ID {data_id}에서 {field_name}을 API를 통해 가져왔습니다.")
                return field_value
            
            # 리스트인 경우 (회사 인재상 키워드)
            if data_type == "list":
                values = []
                for line in field_value.split('\n'):
                    item = line.strip()
                    if item:
                        values.append(item)
                print(f"[INFO] {endpoint} ID {data_id}에서 {len(values)}개의 {field_name}을 API를 통해 가져왔습니다.")
                return values
        elif response.status_code == 404:
            print(f"[ERROR] {endpoint} ID {data_id}를 찾을 수 없습니다 (404).")
            return "" if data_type == "string" else []
        else:
            print(f"[WARNING] {endpoint} API 호출 실패: {response.status_code}")
            print(f"[DEBUG] 응답 내용: {response.text[:200]}")
            return "" if data_type == "string" else []
        
    except requests.exceptions.ConnectionError as e:
        print(f"[ERROR] {endpoint} 서버 연결 실패: {e}")
        print(f"[DEBUG] 시도한 URL: {url}")
        return "" if data_type == "string" else []
    except requests.exceptions.Timeout as e:
        print(f"[ERROR] {endpoint} API 호출 타임아웃: {e}")
        return "" if data_type == "string" else []
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] {endpoint} API 호출 중 네트워크 오류: {e}")
        return "" if data_type == "string" else []
    except Exception as e:
        print(f"[ERROR] {endpoint} {field_name} 로드 중 오류: {e}")
        return "" if data_type == "string" else []

def load_company_values(company_id: int) -> List[str]:
    """회사 인재상 키워드 로드"""
    return load_api_data("companies", company_id, "values_text", "list")

def load_jobpost_qualifications(jobpost_id: int) -> str:
    """채용공고 자격요건 로드"""
    return load_api_data("company-jobs", jobpost_id, "qualifications", "string", "agent")

def load_jobpost_details(jobpost_id: int) -> str:
    """채용공고 직무 상세 로드"""
    return load_api_data("company-jobs", jobpost_id, "job_details", "string", "agent")

def analyze_sentiment(sentences: List[str]) -> List[Dict[str, Any]]:
    """감정 분석: KcELECTRA 모델을 사용하여 문장의 감정을 분석 (최적화됨)"""
    if not HAS_TRANSFORMERS:
        print("[WARNING] transformers 패키지가 설치되어 있지 않아 감정 분석이 불가능합니다.")
        return []
    
    try:
        # 싱글톤 모델 사용
        model, tokenizer = get_sentiment_model()
        
        results = []
        
        # 배치 처리로 성능 향상
        batch_size = 8
        for i in range(0, len(sentences), batch_size):
            batch_sentences = sentences[i:i+batch_size]
            
            try:
                # 배치 토큰화
                inputs = tokenizer(batch_sentences, return_tensors="pt", truncation=True, max_length=512, padding=True)
                
                # 배치 예측
                with torch.no_grad():
                    outputs = model(**inputs)
                    probabilities = torch.softmax(outputs.logits, dim=1)
                    predicted_classes = torch.argmax(probabilities, dim=1)
                    confidences = torch.max(probabilities, dim=1)[0]
                
                # 결과 처리
                for j, (sentence, pred_class, confidence) in enumerate(zip(batch_sentences, predicted_classes, confidences)):
                    sentence_index = i + j
                    pred_class = pred_class.item()
                    confidence = confidence.item()
                    
                    # 감정 레이블 (0: 부정, 1: 중립, 2: 긍정)
                    emotion_labels = ["부정", "중립", "긍정"]
                    emotion = emotion_labels[pred_class]
                    
                    results.append({
                        "sentence": sentence,
                        "sentence_index": sentence_index,
                        "emotion": emotion,
                        "confidence": confidence,
                        "is_negative": pred_class == 0  # 부정적 감정 여부
                    })
                
            except Exception as e:
                print(f"[WARNING] 배치 {i//batch_size + 1} 감정 분석 실패: {e}")
                # 실패한 배치는 중립으로 처리
                for j, sentence in enumerate(batch_sentences):
                    sentence_index = i + j
                    results.append({
                        "sentence": sentence,
                        "sentence_index": sentence_index,
                        "emotion": "중립",
                        "confidence": 0.5,
                        "is_negative": False
                    })
        
        print(f"[INFO] {len(sentences)}개 문장의 감정 분석 완료 (배치 처리)")
        return results
        
    except Exception as e:
        print(f"[ERROR] 감정 분석 실패: {e}")
        return []

def filter_negative_sentences(sentiment_results: List[Dict[str, Any]], confidence_threshold: float = 0.6) -> List[Dict[str, Any]]:
    """부정적 문장 필터링: 신뢰도가 높은 부정적 문장만 반환"""
    negative_sentences = []
    
    for result in sentiment_results:
        if result.get("is_negative", False) and result.get("confidence", 0) >= confidence_threshold:
            negative_sentences.append({
                "sentence": result["sentence"],
                "sentence_index": result["sentence_index"],
                "emotion": result["emotion"],
                "confidence": result["confidence"]
            })
    
    print(f"[INFO] 부정적 문장 필터링 완료: {len(negative_sentences)}개 (신뢰도 임계값: {confidence_threshold})")
    return negative_sentences

class HighlightResumeTool:
    """형광펜 하이라이팅 도구 - application_id 기반 분석"""
    
    def __init__(self):
        """HighlightResumeTool 초기화"""
        self._initialized = False
        self._initialize_models()
    
    def _initialize_models(self):
        """모델 초기화"""
        try:
            # OpenAI 클라이언트 초기화
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self._initialized = True
            print("[INFO] HighlightResumeTool 초기화 완료")
        except Exception as e:
            print(f"[ERROR] HighlightResumeTool 초기화 실패: {e}")
            self._initialized = False
    
    def _get_yellow_prompt(self, values_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
        """노란색 하이라이트용 프롬프트 (회사 인재상 매칭)"""
        # 콤마로 구분된 키워드 문자열 생성
        value_keywords_comma = ', '.join(values_keywords)
        # 분석할 문장들을 JSON 형태로 직렬화
        sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)

        return f"""
        ### 역할
        당신은 자기소개서 분석 전문가입니다. 자기소개서에서 회사 인재상 가치가 실제 행동/사례로 구현된 구절을 라벨링하세요.

        ### 분석 기준 키워드
        {value_keywords_comma}

        ### 분석할 문장들
        {sentences_json}

        ### 매칭 유형 및 기준
        **[1] 정확한 매칭 (exact)**
        - 키워드가 그대로 언급된 경우
        - 예: "공익","투명성","전문성"

        **[2] 문맥적 매칭 (semantic)**
        - 키워드와 같은 의미의 다른 표현
        - 유사어/동의어/관련 개념으로 표현된 경우
        - 실제 행동이나 사례로 가치가 드러나는 경우

        **[3] 문맥적 매칭 예시**
        - "공익" 관련: 사회 기여, 봉사, 나눔, 지역 발전, 환경 보호, 사회적 가치, 공공 이익
        - "책임" 관련: 주도적, 책임지고, 완수, 성과 달성, 신뢰, 의무감, 성실함, 꼼꼼함
        - "혁신" 관련: 개선, 최적화, 효율화, 새로운 방법, 창의적 해결, 변화, 도전, 혁신적 사고
        - "소통" 관련: 의견 교환, 대화, 설명, 전달, 이해, 공감, 명확한 전달, 피드백
        - "협업" 관련: 팀워크, 조율, 공동 작업, 다부서 협력, 상호 보완, 시너지, 협력적 문제 해결

        ### 라벨링 규칙
        - **문맥적 매칭을 우선적으로 고려하세요** (단순 키워드 매칭보다 의미적 연결이 중요)
        - 슬로건·다짐류(예: "혁신과 협업을 중시합니다", "최고가 되겠습니다") 및 근거 없는 나열 문장 제외 
        - 각 value당 최대 3개만 선택해 응답하세요. 유사하거나 약한 건 제외
        - 가능한 한 의미 있는 **최소 자연스러운 구절**만 추출 (문장 전체가 아닌 구절 단위)

        ### JSON 응답 포맷
        {{
            "highlights": [
                {{
                    "sentence": "추출된 구절",
                    "category": "value_fit",
                    "reason": "성능 개선을 통한 혁신적 해결책 제시"
                }},
                …
            ]
        }}

        ### 구체적 매칭 예시
        **[공익 가치]**
        - 문장: "지역 환경 보호 캠페인을 주도하여 100명 참여 유도"
          → 공익 | semantic | reason: 사회적 가치 실현 | context: "환경 보호" + "지역" = 공공 이익
        - 구절: "봉사활동을 통해 사회에 기여하는 경험"
          → 공익 | semantic | reason: 사회 기여 활동 | context: "봉사활동" + "사회 기여" = 공익 가치

        **[책임 가치]**
        - 문장: "프로젝트 완수까지 주도적으로 책임지고 진행"
          → 책임 | semantic | reason: 주도적 책임 수행 | context: "주도적" + "책임지고" = 책임감
        - 구절: "신뢰받는 팀원으로서 성과를 달성"
          → 책임 | semantic | reason: 신뢰와 성과 달성 | context: "신뢰받는" + "성과 달성" = 책임감

        **[혁신 가치]**
        - 문장: "배치 시간을 30% 단축하는 데이터 파이프라인 설계"
          → 혁신 | semantic | reason: 성능 개선을 통한 혁신 | context: "단축" = 효율화/개선
        - 구절: "새로운 기술 스택 도입으로 개발 효율성 향상"
          → 혁신 | semantic | reason: 새로운 방법으로 개선 | context: "새로운" + "효율성 향상" = 혁신

        **[소통 가치]**
        - 문장: "복잡한 기술 내용을 비개발자도 이해할 수 있도록 설명"
          → 소통 | semantic | reason: 명확한 전달과 이해 | context: "이해할 수 있도록 설명" = 소통
        - 구절: "팀원들과 의견을 교환하며 최적의 방안 도출"
          → 소통 | semantic | reason: 의견 교환을 통한 협의 | context: "의견 교환" = 소통

        **[협업 가치]**
        - 문장: "크로스팀 주간 이슈 회의를 주도하여 협력적 문제 해결"
          → 협업 | semantic | reason: 다부서 협력을 통한 문제 해결 | context: "크로스팀" + "협력적" = 협업
        - 구절: "개발팀과 디자인팀의 시너지를 통한 성과 달성"
          → 협업 | semantic | reason: 팀 간 협력을 통한 시너지 | context: "시너지" + "협력" = 협업
        """
    
    def _get_red_prompt(self, risk_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str, job_details: str = "") -> str:
        """빨간색 하이라이트용 프롬프트 (위험 요소 분석: 가치/직무 충돌 + 부정 태도)"""
        
        # 감정분석 결과를 포함한 문장 정보 생성
        sentences_with_sentiment = []
        for c in candidates:
            sentences_with_sentiment.append({
                "sentence": c['sentence'],
                "sentiment": c.get('sentiment_info', '감정 정보 없음'),
                "confidence": c.get('confidence', 0.0)
            })
        
        sentences_json = json.dumps(sentences_with_sentiment, ensure_ascii=False, indent=2)
        
        # 인재상 키워드 리스트 생성
        value_keywords_comma = ', '.join(risk_keywords) if risk_keywords else ""

        return f"""
        ### 역할
        당신은 자기소개서 분석 전문가입니다. **감정 분석 모델에 의해 이미 부정적으로 분류된 문장들**에서 **위험 요소(인재상 충돌 또는 직무 충돌)**가 드러나는 문장을 찾아주세요.

        ### 분석할 문장 목록 (감정분석 결과 포함)
        {sentences_json}

        ### 분석 기준 인재상 키워드
        {value_keywords_comma}

        ### 직무 상세
        {job_details}

        ### 분석 목표
        **감정분석 결과를 참고하여**, 회사 인재상이나 직무 설명과 **실제로 충돌할 수 있는 위험 요소**만 추려주세요.

        ### 매칭 기준 (문맥적 판단만)
        **[1] 회사 가치 충돌**
        - 회사 인재상과 명확히 충돌하는 태도/표현
        - 예: "개인주의적 성향", "협업보다는 혼자 일하는 것을 선호", "변화를 싫어함"

        **[2] 직무 수행 위험**
        - 직무 수행에 부정적인 영향을 줄 수 있는 경험이나 태도
        - 예: "책임 회피", "문제 회피", "소극적 태도", "의사소통 부족"

        **[3] 문맥적 위험 요소**
        - 특정 키워드가 없어도 문맥상 위험한 의미로 해석되는 경우
        - 예: "적당히 처리했다" → 책임감 부족, "혼자 해결했다" → 협업 부족
        - 예: "어려워서 포기했다" → 도전 정신 부족, "다른 사람 탓을 했다" → 책임 회피

        **중요**: 
        - 키워드 기반 매칭이 아닌 **문맥적 판단**만 사용하세요
        - 단순히 부정적 표현이 아니라, 회사나 직무와의 구체적 충돌이 있어야 함
        - 감정분석 결과를 참고하되, 문맥적 의미를 우선적으로 고려하세요

        ### 응답 형식 (JSON)
        {{
            "highlights": [
                {{
                    "sentence": "위험 요소가 있는 문장",
                    "category": "risk",
                    "reason": "위험 요소로 판단한 이유"
                }}
            ]
        }}

        ### 구체적 위험 요소 예시 (문맥적 판단)
        **[회사 가치 충돌]**
        - "혼자 일하는 것을 선호하여 팀 프로젝트가 어려웠다"
          → risk | reason: 협업 가치와 충돌 | context: 문맥상 협업 부족으로 해석
        - "변화를 싫어하여 새로운 기술 도입에 소극적이었다"
          → risk | reason: 혁신 가치와 충돌 | context: 문맥상 혁신 부족으로 해석

        **[직무 수행 위험]**
        - "문제가 생기면 다른 사람에게 미루는 경향이 있다"
          → risk | reason: 책임 회피로 직무 수행 위험 | context: 문맥상 책임 회피로 해석
        - "의사소통이 부족하여 팀원들과 갈등이 있었다"
          → risk | reason: 소통 부족으로 협업 위험 | context: 문맥상 소통 문제로 해석

        **[문맥적 위험 요소]**
        - "적당히 처리해서 넘어갔다"
          → risk | reason: 책임감 부족 | context: 문맥상 성실하지 않은 태도로 해석
        - "어려워서 포기하고 다른 방법을 찾았다"
          → risk | reason: 도전 정신 부족 | context: 문맥상 쉽게 포기하는 태도로 해석

        ### 주의사항
        - **감정분석 결과를 참고하되, 단순히 부정적 표현이라는 이유만으로 분류하지 마세요.**
        - 반드시 **회사 가치나 직무와의 구체적 충돌**이 함께 드러나야 합니다.
        - 신뢰도가 높은 감정분석 결과를 우선적으로 고려하세요.
        - 위험도가 낮거나 충돌이 명확하지 않은 경우는 제외하세요.
        """
    
    def _get_gray_prompt(self, vague_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
        """회색 하이라이트용 프롬프트 (모호한 표현 + 약점 표현 포함)"""
        vague_keywords_comma = ', '.join(vague_keywords)
        sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)

        return f"""
        ### 역할
        당신은 자기소개서를 분석하여, **면접에서 검토할 가치가 있는 모호하거나 과장된 표현, 또는 명확하지 않은 약점 표현**을 식별합니다.

        ### 주요 기준 키워드
        {vague_keywords_comma}

        ### 분석할 문장들
        {sentences_json}

        ### 식별 기준
        아래 중 하나라도 해당하면 회색 하이라이트 대상으로 판단하세요:

        **[1] 모호하거나 과장된 표현**
        - 구체적인 행동/성과 없이 다짐, 의지, 태도만 언급한 경우 (예: "최선을 다하겠습니다", "책임감 있게 임하겠습니다")
        - 과장되었거나 근거 없이 긍정적인 표현 (예: "누구보다 열정적입니다", "항상 완벽하게 처리합니다")
        - 정량적 근거 없이 추상적 표현 (예: "많은 경험", "다양한 활동", "높은 평가")
        - 모호한 단어 사용 (예: "적당히", "약간", "가끔씩", "대략")

        **[2] 약점 표현 (회색 표시 기준)**
        - 약점을 언급했지만 구체적 설명이나 보완 노력이 부족한 경우
        - 해결 노력은 언급했으나 실질적인 개선 내용은 부족한 경우
        - 자기비하 수준은 아니지만, 면접에서 추가 확인이 필요한 경우
        - 스스로 인식한 단점이 직무나 조직에 영향을 줄 수 있어 우려되는 경우

        ### 라벨링 규칙
        - 위 기준 중 하나라도 해당하면 하이라이트 대상으로 판단
        - 가능한 한 의미 있는 **최소 자연스러운 구절**만 추출 (문장 전체가 아닌 구절 단위)
        - 중복되는 표현은 한 번만 추출
        - 너무 명확하고 근거가 충분한 약점은 하이라이트하지 않음

        ### JSON 응답 포맷
        {{
            "highlights": [
                {{
                    "sentence": "모호하거나 과장된 표현 또는 약점 표현",
                    "category": "vague",
                    "reason": "면접에서 확인이 필요한 내용"
                }}
            ]
        }}

        ### 예시
        - "항상 최선을 다해왔습니다."  
          → vague | reason: 구체적인 행동이나 결과 없이 다짐만 있음

        - "많은 사람들과 다양한 프로젝트를 해왔습니다."  
          → vague | reason: 숫자나 활동 내용 없이 추상적

        - "초반에는 소극적인 성향이 있어 팀 활동이 힘들었습니다."  
          → vague | reason: 약점 언급은 있으나 개선 과정 설명 부족

        - "실수는 자주 있었지만 나름대로 노력했습니다."  
          → vague | reason: 실수 내용, 해결 과정이 구체적으로 드러나지 않음
        """
    
    def _get_purple_prompt(self, experience_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
        """보라색 하이라이트용 프롬프트 (경험 분석)"""
        keywords_comma = ', '.join(experience_keywords)
        sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)

        return f"""
        ### 역할
        당신은 자기소개서 분석 전문가입니다. 주어진 문장에서 **성과/경험**이 드러나는 구절을 찾아 라벨링합니다.

        ### 경험 관련 키워드
        {keywords_comma}

        ### 분석할 문장들
        {sentences_json}

        ### 매칭 기준
        - 숫자 + 단위 + 성과: 예) "매출 20% 증가", "100명 관리", "3개월 완료"
        - 수상/대회: 예) "우수상 수상", "해커톤 1등", "공모전 입상"
        - 프로젝트 성과: 예) "시스템 구축 완료", "서비스 런칭", "플랫폼 개발"
        - 구체적 성과: 예) "효율성 향상", "품질 개선", "만족도 증가"
        - 경험/경력: 예) "3년간 담당", "5개 프로젝트 참여", "팀장 역할"

        ### 라벨링 규칙
        - 위 기준 중 하나라도 만족하면 해당 구절을 추출
        - 유사 표현도 포함
        - 가능한 한 의미 있는 **최소 자연스러운 구절**만 추출 (문장 전체가 아닌 구절 단위)
        - 같은 의미 반복된 구절은 하나만 추출
        - 너무 추상적이거나 결과 없는 언급은 제외

        ### JSON 응답 포맷
        {{
            "highlights": [
                {{
                    "sentence": "추출된 구절",
                    "category": "experience",
                    "reason": "성과 또는 경험이 뚜렷하게 드러남"
                }}
            ]
        }}

        ### 예시
        - "매출 20% 증가를 달성한 CRM 도입 프로젝트 주도"  
          → experience | reason: 수치 기반 성과
        - "해커톤에서 1등을 차지하며 MVP 개발"  
          → experience | reason: 수상 및 구체적 활동
        """
    
    def _get_blue_prompt(self, skill_keywords: List[str], candidates: List[Dict[str, Any]], full_text: str) -> str:
        """파란색 하이라이트용 프롬프트 (기술 스택 분석)"""
        skills_comma = ', '.join(skill_keywords)
        sentences_json = json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)

        return f"""
        ### 역할
        당신은 자기소개서에서 실제 기술 사용 경험이 드러나는 부분을 찾아내는 도우미입니다.

        ### 분석 기준 기술 키워드
        {skills_comma}

        한글로 표기된 기술 키워드(예: 자바, 스프링 등)도 동일하게 기술로 인식하여 판단하세요.

        ### 분석할 문장들
        {sentences_json}

        ### 매칭 기준 (유사 키워드 매칭)
        **[1] 기술 키워드 매칭 (대/소문자, 한/영 구분 없음)**
        - 채용공고에 명시된 기술 키워드와 유사한 표현 모두 매칭
        - 대/소문자 구분 없음: "Java" = "java" = "JAVA" = "Java"
        - 한/영 구분 없음: "자바" = "Java" = "JAVA", "스프링" = "Spring" = "SPRING"
        - 예: 채용공고에 "Java"가 있으면 "Java", "java", "JAVA", "자바" 모두 매칭

        **[2] 유사 키워드 매칭 예시**
        - Java: "Java", "java", "JAVA", "자바"
        - Spring: "Spring", "spring", "SPRING", "스프링"
        - AWS: "AWS", "aws", "Aws", "아마존", "Amazon"
        - React: "React", "react", "REACT", "리액트"
        - Python: "Python", "python", "PYTHON", "파이썬"

        **[3] 선택 기준**
        1. 문장 안에 채용공고의 기술 키워드와 유사한 표현이 포함되어 있어야 합니다.
        2. 해당 키워드가 실제로 사용된 경험, 기여, 활동을 의미해야 합니다.
           - 예: 사용했다, 적용했다, 프로젝트에 활용했다, 개발했다, 설정했다 등
        3. 단순 언급, 학습 예정, 흥미 표현, 목표만 담긴 부분은 제외합니다.
           - 예: 배우고 싶다, 공부 중이다, 준비하고 있다, 흥미가 있다 등
        4. **중요**: 기술 키워드의 유사 표현만 매칭하세요. 문맥적 매칭은 하지 마세요.
           - 예: "백엔드 개발"이 채용공고에 없으면 매칭 안됨
           - 예: "웹 개발"이 채용공고에 없으면 매칭 안됨

        ### 라벨링 규칙
        - 가능한 한 의미 있는 **최소 자연스러운 구절**만 추출 (문장 전체가 아닌 구절 단위)
        - 기술 키워드가 실제 행동과 연결되어야 함
        - 중복되는 내용은 하나만 추출

        ### JSON 응답 포맷
        {{
            "highlights": [
                {{
                    "sentence": "기술 사용 경험이 드러나는 구절",
                    "category": "skill_fit",
                    "reason": "기술이 실제로 활용된 경험"
                }}
            ]
        }}

        ### 구체적 매칭 예시
        **[유사 키워드 매칭]**
        - "자바와 스프링을 이용해 백엔드 API를 개발했습니다."  
          → skill_fit | exact | reason: "자바" = Java, "스프링" = Spring 매칭
        - "Java와 Spring을 이용해 백엔드 API를 개발했습니다."  
          → skill_fit | exact | reason: "Java" = Java, "Spring" = Spring 매칭
        - "JAVA와 SPRING을 이용해 백엔드 API를 개발했습니다."  
          → skill_fit | exact | reason: "JAVA" = Java, "SPRING" = Spring 매칭
        - "AWS 환경에 서비스를 배포하고 운영 자동화를 설정"  
          → skill_fit | exact | reason: "AWS" = AWS 매칭
        - "aws 환경에 서비스를 배포하고 운영 자동화를 설정"  
          → skill_fit | exact | reason: "aws" = AWS 매칭

        **[매칭되지 않는 예시]**
        - "백엔드 서버 개발을 통해 REST API 구축"  
          → 매칭 안됨 | reason: "백엔드 서버"는 채용공고에 명시된 기술 키워드가 아님
        - "웹 프론트엔드 개발로 사용자 인터페이스 구현"  
          → 매칭 안됨 | reason: "웹 프론트엔드"는 채용공고에 명시된 기술 키워드가 아님
        """
    
    def first_stage_llm_analysis(self, keywords: List[str], candidates: List[Dict[str, Any]], full_text: str, category: str = "value_fit", job_details: str = "") -> List[Dict[str, Any]]:
        """1단계 LLM 분석 (색깔별 특화 프롬프트 사용)"""
        if not self._initialized or not self.client:
            print("[ERROR] HighlightResumeTool이 초기화되지 않았습니다.")
            return []
        
        try:
            # 색깔별 특화 프롬프트 선택
            if category == "value_fit":
                prompt = self._get_yellow_prompt(keywords, candidates, full_text)
            elif category == "risk":
                prompt = self._get_red_prompt(keywords, candidates, full_text, job_details)
            elif category == "vague":
                prompt = self._get_gray_prompt(keywords, candidates, full_text)
            elif category == "experience":
                prompt = self._get_purple_prompt(keywords, candidates, full_text)
            elif category == "skill_fit":
                prompt = self._get_blue_prompt(keywords, candidates, full_text)
            else:
                # 기본 프롬프트 (fallback)
                prompt = f"""
                다음 자소서에서 {category}와 관련된 문장들을 분석해주세요.
                
                키워드: {', '.join(keywords)}
                
                분석할 문장들:
                {json.dumps([c['sentence'] for c in candidates], ensure_ascii=False, indent=2)}
                
                각 문장에 대해 다음 JSON 형식으로 응답해주세요:
                {{
                    "highlights": [
                        {{
                            "sentence": "분석된 문장",
                            "category": "{category}",
                            "reason": "매칭 이유"
                        }}
                    ]
                }}
                """
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 자소서 분석 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
                timeout=60  # 타임아웃 60초로 단축
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # JSON 파싱
            try:
                # ```json으로 감싸진 경우 제거
                cleaned_response = response_text.strip()
                if cleaned_response.startswith('```json'):
                    cleaned_response = cleaned_response[7:]  # ```json 제거
                if cleaned_response.endswith('```'):
                    cleaned_response = cleaned_response[:-3]  # ``` 제거
                
                result = json.loads(cleaned_response.strip())
                return result.get("highlights", [])
            except json.JSONDecodeError as e:
                print(f"[WARNING] LLM 응답을 JSON으로 파싱할 수 없습니다.")
                print(f"[DEBUG] 응답 텍스트: {response_text[:200]}...")
                print(f"[DEBUG] JSON 오류: {e}")
                return []
                
        except Exception as e:
            print(f"[ERROR] 1단계 LLM 분석 중 오류: {e}")
            return []
    
    def second_stage_self_check(self, first_stage_results: List[Dict[str, Any]], keywords: List[str], category: str = "value_fit") -> List[Dict[str, Any]]:
        """2단계 자기 검증 (색깔별 특화)"""
        if not first_stage_results:
            return []
        
        if not self._initialized or not self.client:
            print("[ERROR] HighlightResumeTool이 초기화되지 않았습니다.")
            return first_stage_results
        
        try:
            # 색깔별 검증 기준 (자연스러운 LLM 문체로)
            if category == "value_fit":
                verification_criteria = """
                1. 문장이 회사 인재상 키워드와 직접적으로 연결되는지 판단해보세요.
                2. 지원자의 행동이나 사고방식이 회사 가치관과 잘 맞는지 평가해보세요.
                3. 단순한 미사여구가 아니라 실제 사례나 구체적인 맥락이 드러나는지 확인해보세요.
                """

            elif category == "risk":
                verification_criteria = """
                1. 문장이 회사 인재상이나 직무와 충돌할 가능성이 있는지 판단해보세요.
                2. 회피적이거나 소극적인 태도가 드러나는 표현인지 살펴보세요.
                3. 문제 상황만 제시하고 해결 의지는 부족한지 여부를 평가해보세요.
                """

            elif category == "vague":
                verification_criteria = """
                1. 문장이 구체적인 수치나 사례 없이 추상적인 표현인지 판단해보세요.
                2. 다짐, 의지, 태도만 언급되고 실제 경험이 부족한지 확인해보세요.
                3. 독자가 문장의 의미를 명확히 이해하기 어려운 표현인지 살펴보세요.
                """

            elif category == "experience":
                verification_criteria = """
                1. 문장이 실제 경험이나 프로젝트를 구체적으로 설명하고 있는지 확인해보세요.
                2. 기술 구현 과정이나 사용한 도구/방법이 드러나는지 평가해보세요.
                3. 리더십, 협업, 팀 관리 경험 등이 잘 표현되어 있는지 살펴보세요.
                """

            elif category == "skill_fit":
                verification_criteria = """
                1. 언급된 기술이 채용공고 자격요건과 관련이 있는지 확인해보세요.
                2. 기술 스택이나 도구 사용 경험이 실제로 나타나는지 평가해보세요.
                3. 단순 나열이 아니라, 구체적인 활용 맥락이 드러나는지 살펴보세요.
                """

            else:
                verification_criteria = """
                1. 문장이 해당 카테고리와 관련이 있는 내용인지 확인해보세요.
                2. 매칭 이유가 논리적이고 타당한지 판단해보세요.
                3. 전체적으로 신뢰할 만한 근거가 있는 표현인지 평가해보세요.
                """
            
            # 프롬프트 구성
            prompt = f"""
            다음 분석 결과를 검증해주세요.
            
            키워드: {', '.join(keywords)}
            카테고리: {category}
            
            분석 결과:
            {json.dumps(first_stage_results, ensure_ascii=False, indent=2)}
            
            각 결과에 대해 다음을 확인해주세요:
            {verification_criteria}
            
            검증된 결과를 JSON 형식으로 응답해주세요:
            {{
                "highlights": [
                    {{
                        "sentence": "문장",
                        "category": "{category}",
                        "reason": "검증된 이유",
                        "confidence": 0.9
                    }}
                ]
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 자소서 분석 검증 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=1500
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # JSON 파싱
            try:
                # ```json으로 감싸진 경우 제거
                cleaned_response = response_text.strip()
                if cleaned_response.startswith('```json'):
                    cleaned_response = cleaned_response[7:]  # ```json 제거
                if cleaned_response.endswith('```'):
                    cleaned_response = cleaned_response[:-3]  # ``` 제거
                
                result = json.loads(cleaned_response.strip())
                return result.get("highlights", [])
            except json.JSONDecodeError as e:
                print(f"[WARNING] 2단계 검증 응답을 JSON으로 파싱할 수 없습니다.")
                print(f"[DEBUG] 응답 텍스트: {response_text[:200]}...")
                print(f"[DEBUG] JSON 오류: {e}")
                return first_stage_results
                
        except Exception as e:
            print(f"[ERROR] 2단계 자기 검증 중 오류: {e}")
            return first_stage_results
    
    def post_process_results(self, results: List[Dict[str, Any]], values_keywords: List[str], full_text: str) -> List[Dict[str, Any]]:
        """후처리"""
        processed_results = []
        
        for result in results:
            if not isinstance(result, dict):
                continue
                
            # text 또는 sentence 필드에서 텍스트 추출
            sentence_text = result.get("text", "") or result.get("sentence", "")
            if not sentence_text:
                # reason에서 문장 추출 시도
                reason = result.get("reason", "")
                if reason and len(reason) > 10:
                    # reason이 충분히 길면 그것을 텍스트로 사용
                    sentence_text = reason[:100] + "..." if len(reason) > 100 else reason
                else:
                    # 기본값으로 전체 텍스트의 일부 사용
                    sentence_text = full_text[:100] + "..." if len(full_text) > 100 else full_text
            
            # 기본 필드 설정
            processed_result = {
                "text": sentence_text,
                "category": result.get("category", "value_fit"),
                "reason": result.get("reason", ""),
                "confidence": result.get("confidence", 0.7),  # 기본값으로 0.7 설정
                "color": get_color_for_category(result.get("category", "value_fit")),
                "bg_color": get_bg_color_for_category(result.get("category", "value_fit"))
            }
            
            processed_results.append(processed_result)
        
        return processed_results
    
    def calculate_coordinates(self, results: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
        """좌표 계산"""
        for result in results:
            # text 또는 sentence 필드에서 텍스트 추출
            text = result.get("text", "") or result.get("sentence", "")
            if text and full_text:
                start_pos = full_text.find(text)
                if start_pos != -1:
                    result["start"] = start_pos
                    result["end"] = start_pos + len(text)
                else:
                    # 텍스트를 찾을 수 없으면 전체 텍스트의 시작 부분에 배치
                    result["start"] = 0
                    result["end"] = min(len(text), len(full_text))
            else:
                # 텍스트가 없으면 기본값 설정
                result["start"] = 0
                result["end"] = 0
            
            # text 필드가 비어있으면 sentence 필드로 채움
            if not result.get("text") and result.get("sentence"):
                result["text"] = result["sentence"]
        
        return results
    
    @async_redis_cache()
    async def highlight_yellow(self, application_id: int, company_id: Optional[int] = None) -> list[dict]:
        """노란색 하이라이트: 회사 인재상과의 매칭도 분석"""
        print(f"[YELLOW] 지원서 ID {application_id} 노란색 하이라이트 시작")
        
        # 자소서 데이터 로드
        resume_content = load_resume_from_api(application_id)
        if not resume_content:
            print("[YELLOW] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        return await self._highlight_yellow_with_content(resume_content, company_id)
    
    async def _highlight_yellow_with_content(self, resume_content: str, company_id: Optional[int] = None) -> list[dict]:
        """이력서 내용을 직접 받아서 노란색 하이라이트 분석"""
        print(f"[YELLOW] 노란색 하이라이트 시작 (직접 내용 전달)")
        
        # 회사 인재상 키워드 로드
        keywords = []
        if company_id:
            keywords = load_company_values(company_id)
            print(f"[YELLOW] 회사 ID {company_id}에서 {len(keywords)}개의 인재상 키워드를 로드했습니다.")
        
        # 노란색은 중요하므로 검증 실행
        return await self._analyze_category(resume_content, "value_fit", keywords, use_verification=True)
    
    @async_redis_cache()
    async def highlight_red(self, application_id: int, company_id: Optional[int] = None, jobpost_id: Optional[int] = None) -> list[dict]:
        """빨간색 하이라이트: 위험 요소 분석 (감정 분석 → LLM 분석)"""
        print(f"[RED] 지원서 ID {application_id} 빨간색 하이라이트 시작")
        
        # 자소서 데이터 로드
        resume_content = load_resume_from_api(application_id)
        if not resume_content:
            print("[RED] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        return await self._highlight_red_with_content(resume_content, company_id, jobpost_id)
    
    async def _highlight_red_with_content(self, resume_content: str, company_id: Optional[int] = None, jobpost_id: Optional[int] = None) -> list[dict]:
        """이력서 내용을 직접 받아서 빨간색 하이라이트 분석"""
        print(f"[RED] 빨간색 하이라이트 시작 (직접 내용 전달)")
        
        # 회사 인재상 키워드 로드 (인재상 충돌 분석용)
        keywords = []
        if company_id:
            keywords = load_company_values(company_id)
        
        # 직무 상세 로드 (직무 충돌 분석용)
        job_details = ""
        if jobpost_id:
            job_details = load_jobpost_details(jobpost_id)
        
        return await self._analyze_risk_category(resume_content, keywords, job_details)
    
    @async_redis_cache()
    async def highlight_gray(self, application_id: int) -> list[dict]:
        """회색 하이라이트: 모호한 표현 분석"""
        print(f"[GRAY] 지원서 ID {application_id} 회색 하이라이트 시작")
        
        # 자소서 데이터 로드
        resume_content = load_resume_from_api(application_id)
        if not resume_content:
            print("[GRAY] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        return await self._highlight_gray_with_content(resume_content)
    
    async def _highlight_gray_with_content(self, resume_content: str) -> list[dict]:
        """이력서 내용을 직접 받아서 회색 하이라이트 분석"""
        print(f"[GRAY] 회색 하이라이트 시작 (직접 내용 전달)")
        
        # 빈 키워드 리스트 (프롬프트에서 모호한 표현을 직접 식별)
        keywords = []
        
        # 회색은 덜 중요하므로 검증 생략 (성능 우선)
        return await self._analyze_category(resume_content, "vague", keywords, use_verification=False)
    
    @async_redis_cache()
    async def highlight_purple(self, application_id: int) -> list[dict]:
        """보라색 하이라이트: 경험 분석"""
        print(f"[PURPLE] 지원서 ID {application_id} 보라색 하이라이트 시작")
        
        # 자소서 데이터 로드
        resume_content = load_resume_from_api(application_id)
        if not resume_content:
            print("[PURPLE] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        return await self._highlight_purple_with_content(resume_content)
    
    async def _highlight_purple_with_content(self, resume_content: str) -> list[dict]:
        """이력서 내용을 직접 받아서 보라색 하이라이트 분석"""
        print(f"[PURPLE] 보라색 하이라이트 시작 (직접 내용 전달)")
        
        # 빈 키워드 리스트 (프롬프트에서 경험을 직접 식별)
        keywords = []
        
        # 보라색은 덜 중요하므로 검증 생략 (성능 우선)
        return await self._analyze_category(resume_content, "experience", keywords, use_verification=False)
    
    @async_redis_cache()
    async def highlight_blue(self, application_id: int, jobpost_id: Optional[int] = None) -> list[dict]:
        """파란색 하이라이트: 기술 스택 분석"""
        print(f"[BLUE] 지원서 ID {application_id} 파란색 하이라이트 시작")
        
        # 자소서 데이터 로드
        resume_content = load_resume_from_api(application_id)
        if not resume_content:
            print("[BLUE] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        return await self._highlight_blue_with_content(resume_content, jobpost_id)
    
    async def _highlight_blue_with_content(self, resume_content: str, jobpost_id: Optional[int] = None) -> list[dict]:
        """이력서 내용을 직접 받아서 파란색 하이라이트 분석"""
        print(f"[BLUE] 파란색 하이라이트 시작 (직접 내용 전달)")
        
        # 채용공고 자격요건 로드
        keywords = []
        if jobpost_id:
            qualifications = load_jobpost_qualifications(jobpost_id)
            
            # qualifications에서 키워드 추출
            if qualifications:
                # 실제 DB 구조에 맞게 파싱
                qualifications_text = qualifications.strip()
                for line in qualifications_text.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    
                    # [필수], [우대], [필수기술] 등의 헤더 제거
                    if line.startswith('[') and line.endswith(']'):
                        continue
                    
                    # "- " 제거하고 콤마로 분할
                    if line.startswith('- '):
                        line = line[2:]  # "- " 제거
                    
                    # 콤마로 분할하여 키워드 추출
                    for item in line.split(','):
                        item = item.strip()
                        if item:
                            keywords.append(item)
                
                print(f"[BLUE] 자격요건에서 {len(keywords)}개의 키워드를 추출했습니다.")
        
        # 파란색은 덜 중요하므로 검증 생략 (성능 우선)
        return await self._analyze_category(resume_content, "skill_fit", keywords, use_verification=False)
    
    async def run_all_with_content(self, resume_content: str, application_id: int, jobpost_id: Optional[int] = None, company_id: Optional[int] = None) -> dict:
        """이력서 내용을 직접 받아서 모든 색깔의 하이라이트 분석을 병렬로 실행"""
        print(f"[ALL] 지원서 ID {application_id} 전체 하이라이트 분석 시작 (병렬 처리)")
        
        if not self._initialized:
            print("[ERROR] HighlightResumeTool이 초기화되지 않았습니다.")
            return {"error": "Tool not initialized"}
        
        if not resume_content:
            print("[ERROR] 이력서 내용이 없습니다.")
            return {"error": "Resume content is empty"}
        
        try:
            # 각 색깔별 하이라이트 분석을 병렬로 실행
            tasks = [
                self._highlight_yellow_with_content(resume_content, company_id),
                self._highlight_red_with_content(resume_content, company_id, jobpost_id),
                self._highlight_gray_with_content(resume_content),
                self._highlight_purple_with_content(resume_content),
                self._highlight_blue_with_content(resume_content, jobpost_id)
            ]
            
            # 병렬 실행 (타임아웃 120초로 단축)
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=120
            )
            
            # 결과 추출 (에러 처리 포함)
            yellow_results = results[0] if not isinstance(results[0], Exception) else []
            red_results = results[1] if not isinstance(results[1], Exception) else []
            gray_results = results[2] if not isinstance(results[2], Exception) else []
            purple_results = results[3] if not isinstance(results[3], Exception) else []
            blue_results = results[4] if not isinstance(results[4], Exception) else []
            
            # 에러 로깅
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    print(f"[ERROR] 카테고리 {i} 분석 중 오류: {result}")
            
            # 결과 통합
            all_results = {
                "yellow": yellow_results,
                "red": red_results,
                "gray": gray_results,
                "purple": purple_results,
                "blue": blue_results,
                "highlights": yellow_results + red_results + gray_results + purple_results + blue_results
            }
            
            # 🆕 우선순위 기반 하이라이트 정렬 및 중복 처리
            all_highlights = all_results["highlights"]
            if all_highlights:
                print(f"[PRIORITY] 우선순위 정렬 전: {len(all_highlights)}개 하이라이트")
                all_results["highlights"] = apply_priority_to_highlights(all_highlights)
                print(f"[PRIORITY] 우선순위 정렬 후: {len(all_results['highlights'])}개 하이라이트")
                
                # 우선순위별 통계 출력
                priority_stats = {}
                for highlight in all_results["highlights"]:
                    category = highlight.get("category", "")
                    priority = get_priority_for_category(category)
                    if priority not in priority_stats:
                        priority_stats[priority] = 0
                    priority_stats[priority] += 1
                
                print(f"[PRIORITY] 우선순위별 통계: {priority_stats}")
            
            print(f"[ALL] 지원서 ID {application_id} 전체 하이라이트 분석 완료 (병렬 처리)")
            return all_results
            
        except asyncio.TimeoutError:
            print(f"[ERROR] 지원서 ID {application_id} 분석 타임아웃 (300초 초과)")
            return {"error": "Analysis timeout"}
        except Exception as e:
            print(f"[ERROR] 전체 하이라이트 분석 중 오류: {e}")
            return {"error": str(e)}
    
    async def _analyze_category(self, resume_content: str, category: str, keywords: List[str], 
                         job_details: str = "", use_verification: bool = True) -> List[Dict[str, Any]]:
        """공통 분석 파이프라인: 문장 분할 → 1단계 LLM → (선택적) 2단계 검증 → 후처리 → 좌표 계산"""
        if not self._initialized:
            print(f"[ERROR] HighlightResumeTool이 초기화되지 않았습니다.")
            return []
        
        # 자소서 분석 데이터 준비
        analysis_data = prepare_resume_analysis_data(resume_content)
        if not analysis_data["has_content"]:
            print(f"[{category.upper()}] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        # 모든 문장을 후보로 설정
        candidates = [{"sentence": sentence, "sentence_index": i} for i, sentence in enumerate(analysis_data["sentences"])]
        
        # 1단계: LLM 분석
        first_stage_results = self.first_stage_llm_analysis(
            keywords, candidates, analysis_data["resume_text"], category=category, job_details=job_details
        )
        
        # 2단계: 선택적 검증 (중요한 색깔만)
        if use_verification and category in ["value_fit", "risk"]:
            print(f"[{category.upper()}] 2단계 검증 실행 (중요 색깔)")
            second_stage_results = self.second_stage_self_check(first_stage_results, keywords, category=category)
        else:
            print(f"[{category.upper()}] 2단계 검증 생략 (성능 우선)")
            second_stage_results = first_stage_results
        
        # 3단계: 후처리 및 좌표 계산
        final_results = self.post_process_results(second_stage_results, keywords, analysis_data["resume_text"])
        final_results = self.calculate_coordinates(final_results, analysis_data["resume_text"])
        
        print(f"[{category.upper()}] 분석 완료: {len(final_results)}개")
        return final_results

    async def _analyze_risk_category(self, resume_content: str, keywords: List[str], 
                              job_details: str = "") -> List[Dict[str, Any]]:
        """위험 요소 분석 파이프라인: 감정 분석 → 부정적 문장 필터링 → LLM 분석"""
        if not self._initialized:
            print("[ERROR] HighlightResumeTool이 초기화되지 않았습니다.")
            return []
        
        # 자소서 분석 데이터 준비
        analysis_data = prepare_resume_analysis_data(resume_content)
        if not analysis_data["has_content"]:
            print("[RISK] 자소서 내용이 없어서 분석을 중단합니다.")
            return []
        
        # 1단계: 감정 분석으로 부정적 문장 필터링
        print("[RISK] 1단계: 감정 분석 시작")
        sentiment_results = analyze_sentiment(analysis_data["sentences"])
        
        if not sentiment_results:
            print("[RISK] 감정 분석 실패로 분석을 중단합니다.")
            return []
        
        # 부정적 문장만 필터링 (신뢰도 0.6 이상)
        negative_sentences = filter_negative_sentences(sentiment_results, confidence_threshold=0.6)
        
        if not negative_sentences:
            print("[RISK] 부정적 문장이 없어서 분석을 중단합니다.")
            return []
        
        print(f"[RISK] 감정 분석 완료: {len(negative_sentences)}개 부정적 문장 발견")
        
        # 2단계: 부정적 문장을 후보로 설정 (감정분석 결과 포함)
        candidates = []
        for item in negative_sentences:
            candidates.append({
                "sentence": item["sentence"], 
                "sentence_index": item["sentence_index"],
                "emotion": item["emotion"],
                "confidence": item["confidence"],
                "sentiment_info": f"감정: {item['emotion']} (신뢰도: {item['confidence']:.2f})"
            })
        
        # 3단계: LLM 분석 (빨간색 특화 프롬프트 사용)
        first_stage_results = self.first_stage_llm_analysis(
            keywords, candidates, analysis_data["resume_text"], category="risk", job_details=job_details
        )
        
        # 4단계: 2단계 검증 (위험 요소는 중요하므로 검증 실행)
        print("[RISK] 2단계 검증 실행 (위험 요소는 중요)")
        second_stage_results = self.second_stage_self_check(first_stage_results, keywords, category="risk")
        
        # 5단계: 후처리 및 좌표 계산
        final_results = self.post_process_results(second_stage_results, keywords, analysis_data["resume_text"])
        final_results = self.calculate_coordinates(final_results, analysis_data["resume_text"])
        
        print(f"[RISK] 분석 완료: {len(final_results)}개")
        return final_results

    @async_redis_cache()
    async def run_all(self, application_id: int, jobpost_id: Optional[int] = None, company_id: Optional[int] = None) -> dict:
        """모든 색깔의 하이라이트 분석을 병렬로 실행"""
        print(f"[ALL] 지원서 ID {application_id} 전체 하이라이트 분석 시작 (병렬 처리)")
        
        if not self._initialized:
            print("[ERROR] HighlightResumeTool이 초기화되지 않았습니다.")
            return {"error": "Tool not initialized"}
        
        try:
            # 이력서 내용 로드
            resume_content = load_resume_from_api(application_id)
            if not resume_content:
                print("[ERROR] 이력서 내용을 가져올 수 없습니다.")
                return {"error": "Failed to load resume content"}
            
            # 병렬 처리로 실행
            return await self.run_all_with_content(resume_content, application_id, jobpost_id, company_id)
            
        except Exception as e:
            print(f"[ERROR] 전체 하이라이트 분석 중 오류: {e}")
            return {"error": str(e)}

# 싱글턴 인스턴스
_highlight_tool = None

def get_highlight_tool():
    """싱글턴 HighlightResumeTool 인스턴스 반환"""
    global _highlight_tool
    if _highlight_tool is None:
        _highlight_tool = HighlightResumeTool()
    return _highlight_tool
