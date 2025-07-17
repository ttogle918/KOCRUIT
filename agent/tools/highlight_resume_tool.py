import json
from typing import Dict, List, Any, Optional
from openai import OpenAI
import os
from sentence_transformers import SentenceTransformer
import numpy as np

# SKILL_SYNONYMS는 클래스 밖(모듈 레벨)에 정의
SKILL_SYNONYMS = {
    "spring": [
        "spring", "spring framework", "spring boot",
        "spring mvc", "spring cloud",
        "스프링"
    ],
    "java": [
        "java", "jdk", "jre",
        "java se", "java ee", "jakarta ee",
        "자바"
    ],
    "linux": [
        "linux", "linux os",
        "ubuntu", "centos", "debian",
        "red hat", "redhat", "rhel",
        "알마리눅스", "리눅스"
    ]
}
# value_fit 동의어/띄어쓰기/유사어 사전
VALUE_SYNONYMS = {
    "공익": ["공익", "공공의 이익", "사회 전체의 이익", "공공복리"],
    "투명": ["투명", "투명성", "투명하게"],
    "책임": ["책임", "책임감", "책임 의식"],
    "공정": ["공정", "공정성", "공정하게"],
    "청렴": ["청렴", "청렴성", "청렴하게"],
    "안전": ["안전", "안전성", "안전하게"],
    "혁신": ["혁신", "혁신성", "새로운 시도", "변화 추구"],
    "고객중심": ["고객중심", "고객 중심", "고객을 생각", "고객 최우선"],
    "상생협력": ["상생협력", "상생 협력", "협력", "파트너십"],
    "전문성": ["전문성", "전문가", "전문적인"],
    "지속가능": ["지속가능", "지속 가능", "지속가능성", "지속 가능성"],
    "도전": ["도전", "도전정신", "도전 의식"]
}

try:
    import Levenshtein
except ImportError:
    Levenshtein = None
    print("[경고] Levenshtein 패키지가 설치되어 있지 않습니다. value_fit 오타/유사어 매칭 기능을 사용하려면 'pip install python-Levenshtein'을 실행하세요.")

class HighlightResumeTool:
    """자기소개서 텍스트를 분석하여 형광펜 하이라이팅을 적용하는 도구"""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # 형광펜 카테고리 정의
        self.categories = {
            'impact': {
                'name': 'impact',
                'description': '숫자·퍼센트 등 정량 성과',
                'color': '#a78bfa',  # 보라색 (연보라)
                'bg_color': '#ede9fe'  # 연한 보라
            },
            'skill_fit': {
                'name': 'skill_fit', 
                'description': 'JD 핵심 기술과 직접 매칭',
                'color': '#60a5fa',  # 연한 파랑
                'bg_color': '#e0f2fe'  # 더 연한 파랑
            },
            'value_fit': {
                'name': 'value_fit',
                'description': '회사 인재상 키워드와 직접 매칭', 
                'color': '#fde68a',  # 연한 노랑
                'bg_color': '#fef9c3'  # 더 연한 노랑
            },
            'vague': {
                'name': 'vague',
                'description': '근거 없는 추상 표현',
                'color': '#9ca3af',  # 회색
                'bg_color': '#f3f4f6'  # 연한 회색
            },
            'risk': {
                'name': 'risk',
                'description': '가치·직무와 충돌 or 부정적 태도',
                'color': '#fca5a5',  # 연한 빨강
                'bg_color': '#fee2e2'  # 더 연한 빨강
            }
        }
        self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

    def _extract_jd_keywords(self, job_details: str = "", qualifications: str = "") -> tuple:
        """job_details + qualifications에서 태그 제거, 키워드 추출, dedup, 동의어 변형 세트도 반환"""
        import re
        def clean_tags(text):
            return re.sub(r"\[(필수|우대|필수기술|우대기술|기타)\]", "", text)
        def extract_keywords(text):
            items = re.split(r"[\n,·•/|\\]+", text)
            return [item.strip() for item in items if item.strip()]
        job_details_clean = clean_tags(job_details or "")
        qualifications_clean = clean_tags(qualifications or "")
        keywords = extract_keywords(job_details_clean) + extract_keywords(qualifications_clean)
        # dedup
        keywords = list(dict.fromkeys(keywords))
        # 동의어 변형 세트
        synonym_set = set()
        for syns in SKILL_SYNONYMS.values():
            for s in syns:
                synonym_set.add(s.lower())
        return keywords, synonym_set

    def _split_sentences(self, text: str) -> list:
        import re
        # Split by . ? ! (and keep delimiters)
        sentence_end = re.compile(r'([.!?])')
        parts = sentence_end.split(text)
        sentences = []
        buf = ''
        for part in parts:
            buf += part
            if part in '.!?':
                sentences.append(buf)
                buf = ''
        if buf:
            sentences.append(buf)
        return sentences

    def _dedup_highlights_by_sentence(self, text: str, highlights: list) -> list:
        """문장별로 각 카테고리/키워드별로 한 번만 하이라이트(첫 등장만)"""
        import re
        # 문장별로 분리
        sentences = self._split_sentences(text)
        # 각 하이라이트가 어느 문장에 속하는지 계산
        sent_spans = []
        idx = 0
        for sent in sentences:
            start = idx
            end = idx + len(sent)
            sent_spans.append((start, end, sent))
            idx = end
        # 문장별로 카테고리+텍스트별로 한 번만
        deduped = []
        for s_start, s_end, sent in sent_spans:
            seen = set()
            for h in highlights:
                if h['start'] >= s_start and h['end'] <= s_end:
                    key = (h['category'], h['text'].strip().lower())
                    if key not in seen:
                        deduped.append(h)
                        seen.add(key)
        # 정렬
        deduped = sorted(deduped, key=lambda x: x['start'])
        return deduped

    def _is_valid_highlight_text(self, text):
        import re
        # 공백/구두점만, 조사만(은/는/이/가/을/를/도/만/의/에/에서/으로/와/과/랑/까지/부터 등)만 매칭된 경우 False
        if re.fullmatch(r"[\s.,!?~·…()\[\]{}\"'“”‘’:;|/\\-]+", text):
            return False
        # 조사만으로 이루어진 경우
        josa_list = ["은", "는", "이", "가", "을", "를", "도", "만", "의", "에", "에서", "으로", "와", "과", "랑", "까지", "부터", "께서", "보다", "처럼", "조차", "마저", "밖에", "마다", "씩", "께", "한테", "더러", "에게", "든지", "라도", "이나", "나", "이며", "이며", "든가", "거나", "이며", "이며"]
        if text in josa_list:
            return False
        # 한글 한 글자 + 조사만(예: '도', '만' 등)도 제외
        if len(text) == 1 and text in josa_list:
            return False
        return True

    def _find_skill_fit_spans(self, text: str, jd_keywords: list, skill_synonym_set: set) -> list:
        """텍스트에서 skill_fit(동의어 포함) 키워드 등장 위치를 모두 찾아 span 리스트 반환"""
        import re
        spans = []
        text_lower = text.lower()
        # 모든 JD 키워드 + 동의어 변형을 소문자로
        all_keywords = set([k.lower() for k in jd_keywords]) | set(skill_synonym_set)
        for keyword in sorted(all_keywords, key=lambda x: -len(x)):
            if not keyword: continue
            # 단어 경계 무시, 부분일치 허용 (띄어쓰기, 구두점 등 포함)
            for match in re.finditer(re.escape(keyword), text_lower):
                start, end = match.start(), match.end()
                # 실제 원본 텍스트에서 해당 구간 추출
                original = text[start:end]
                if not self._is_valid_highlight_text(original):
                    continue
                spans.append({
                    "text": original,
                    "category": "skill_fit",
                    "start": start,
                    "end": end,
                    "reason": f"JD 기술스택({keyword}) 직접 매칭"
                })
        # 겹치는 span 제거 (가장 긴 것 우선)
        spans = sorted(spans, key=lambda x: (x['start'], -x['end']+x['start']))
        non_overlap = []
        last_end = -1
        for s in spans:
            if s['start'] >= last_end:
                non_overlap.append(s)
                last_end = s['end']
        return non_overlap

    def _skill_fit_count(self, highlights):
        # SKILL_SYNONYMS 역매핑
        synonym_to_main = {}
        for main, syns in SKILL_SYNONYMS.items():
            for s in syns:
                synonym_to_main[s.lower()] = main
        found = set()
        for h in highlights:
            if h.get('category') == 'skill_fit':
                text = h['text'].strip().lower()
                main = synonym_to_main.get(text, text)
                found.add(main)
        return len(found)

    def _find_award_spans(self, text):
        import re
        award_keywords = ["우수상", "수상", "장려상", "대상", "입상"]
        spans = []
        for kw in award_keywords:
            for match in re.finditer(re.escape(kw), text):
                start, end = match.start(), match.end()
                spans.append({
                    "text": text[start:end],
                    "category": "impact",
                    "start": start,
                    "end": end,
                    "reason": f"수상 이력({kw})"
                })
        return spans

    def _find_impact_spans(self, text):
        import re
        spans = []
        # 1. 정량 성과(성과)
        achievement_patterns = [
            r"(\d+[,.]?\d*\s*%?\s*(증가|감소|향상|달성|성장|개선|신장|확대|감소|상승|하락|달성|달성함|달성하였음|달성했습니다|달성하였습니다|달성함|달성함)?)"
        ]
        for pat in achievement_patterns:
            for match in re.finditer(pat, text):
                start, end = match.start(), match.end()
                if not self._is_valid_highlight_text(text[start:end]):
                    continue
                spans.append({
                    "text": text[start:end],
                    "category": "impact",
                    "sub_label": "성과",
                    "start": start,
                    "end": end,
                    "reason": "성과"
                })
        # 2. 경력 규모(경력)
        career_patterns = [
            r"(\d+년|\d+개월|\d+년차|\d+년간|\d+년 동안|\d+년 이상|\d+년 이하|\d+년 미만|\d+년 초과)"
        ]
        for pat in career_patterns:
            for match in re.finditer(pat, text):
                start, end = match.start(), match.end()
                if not self._is_valid_highlight_text(text[start:end]):
                    continue
                spans.append({
                    "text": text[start:end],
                    "category": "impact",
                    "sub_label": "경력",
                    "start": start,
                    "end": end,
                    "reason": "경력"
                })
        # 3. 프로젝트 규모(프로젝트 경험)
        project_patterns = [
            r"(\d+명|\d+건|\d+회|\d+개 프로젝트|\d+개 Task|\d+개 과제|\d+억|\d+만원|\d+천원)"
        ]
        for pat in project_patterns:
            for match in re.finditer(pat, text):
                start, end = match.start(), match.end()
                if not self._is_valid_highlight_text(text[start:end]):
                    continue
                spans.append({
                    "text": text[start:end],
                    "category": "impact",
                    "sub_label": "프로젝트 경험",
                    "start": start,
                    "end": end,
                    "reason": "프로젝트 경험"
                })
        # 4. 수상(수상)
        award_keywords = ["우수상", "수상", "장려상", "대상", "입상"]
        for kw in award_keywords:
            for match in re.finditer(re.escape(kw), text):
                start, end = match.start(), match.end()
                if not self._is_valid_highlight_text(text[start:end]):
                    continue
                spans.append({
                    "text": text[start:end],
                    "category": "impact",
                    "sub_label": "수상",
                    "start": start,
                    "end": end,
                    "reason": "수상"
                })
        return spans

    def _find_value_fit_spans(self, text: str, value_synonyms: dict) -> list:
        import re
        spans = []
        text_lower = text.lower()
        used = set()
        for main, syns in value_synonyms.items():
            for syn in syns:
                syn = syn.strip()
                if not syn:
                    continue
                # 띄어쓰기 무시, 소문자 비교
                syn_norm = syn.replace(" ", "").lower()
                # 정규식으로 단어 경계 포함하여 매칭 (조사, 단어 일부만 매칭 방지)
                pattern = re.compile(rf"\\b{re.escape(syn)}\\b", re.IGNORECASE)
                for match in pattern.finditer(text):
                    start, end = match.start(), match.end()
                    key = (start, end)
                    if key not in used:
                        if not self._is_valid_highlight_text(text[start:end]):
                            continue
                        spans.append({
                            "text": text[start:end],
                            "category": "value_fit",
                            "start": start,
                            "end": end,
                            "reason": f"value_fit 동의어({main}) 매칭"
                        })
                        used.add(key)
                # 오타 허용(Levenshtein 거리 1)
                if Levenshtein:
                    for i in range(len(text) - len(syn) + 1):
                        window = text[i:i+len(syn)]
                        if Levenshtein.distance(window.lower(), syn_norm) == 1:
                            # 단어 경계 체크
                            left_ok = (i == 0) or not text[i-1].isalnum()
                            right_ok = (i+len(syn) == len(text)) or not text[i+len(syn)].isalnum()
                            if left_ok and right_ok:
                                key = (i, i+len(syn))
                                if key not in used:
                                    if not self._is_valid_highlight_text(text[i:i+len(syn)]):
                                        continue
                                    spans.append({
                                        "text": text[i:i+len(syn)],
                                        "category": "value_fit",
                                        "start": i,
                                        "end": i+len(syn),
                                        "reason": f"value_fit 오타/유사어({main}) 매칭"
                                    })
                                    used.add(key)
        return spans

    def _find_value_fit_spans_embedding(self, text: str, value_keywords: list, threshold: float = 0.8) -> list:
        import re
        spans = []
        sentences = self._split_sentences(text)
        value_embeds = self.embedding_model.encode(value_keywords)
        sent_embeds = self.embedding_model.encode(sentences)
        for i, sent in enumerate(sentences):
            for j, value in enumerate(value_keywords):
                sim = self._cosine_similarity(sent_embeds[i], value_embeds[j])
                if sim >= threshold:
                    for match in re.finditer(re.escape(value), sent, re.IGNORECASE):
                        start = text.find(sent) + match.start()
                        end = text.find(sent) + match.end()
                        spans.append({
                            "text": text[start:end],
                            "category": "value_fit",
                            "start": start,
                            "end": end,
                            "reason": f"value_fit 임베딩 유사({value}, {sim:.2f})"
                        })
                    if not re.search(re.escape(value), sent, re.IGNORECASE):
                        start = text.find(sent)
                        end = start + len(sent)
                        spans.append({
                            "text": text[start:end],
                            "category": "value_fit",
                            "start": start,
                            "end": end,
                            "reason": f"value_fit 임베딩 유사({value}, {sim:.2f})"
                        })
        return spans

    def _cosine_similarity(self, a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def analyze_text(self, text: str, job_description: str = "", company_values: str = "", qualifications: str = "") -> Dict[str, Any]:
        """
        자기소개서 텍스트를 분석하여 형광펜 하이라이팅 정보를 반환
        Args:
            text: 분석할 자기소개서 텍스트
            job_description: 직무 설명 (선택사항)
            company_values: 회사 가치관 (선택사항)
            qualifications: 자격요건 (선택사항)
        Returns:
            하이라이팅 정보가 포함된 딕셔너리
        """
        try:
            # JD 키워드, 동의어 변형 세트 추출
            jd_keywords, skill_synonym_set = self._extract_jd_keywords(job_description, qualifications)
            # LLM에게 분석 요청
            prompt = self._create_analysis_prompt(text, job_description, company_values, jd_keywords=jd_keywords, skill_synonym_set=skill_synonym_set, value_synonyms=VALUE_SYNONYMS)
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 자기소개서 텍스트를 분석하여 5가지 카테고리로 분류하는 전문가입니다."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.1
            )
            result = json.loads(response.choices[0].message.content)
            llm_highlights = result.get('highlights', [])
            skill_spans = self._find_skill_fit_spans(text, jd_keywords, skill_synonym_set)
            impact_spans = self._find_impact_spans(text)
            # value_fit: 동의어 사전 기반 + 임베딩 기반 병행
            value_spans_dict = {}
            value_spans = self._find_value_fit_spans(text, VALUE_SYNONYMS)
            value_keywords = list(VALUE_SYNONYMS.keys())
            value_spans_embed = self._find_value_fit_spans_embedding(text, value_keywords, threshold=0.8)
            # 중복(겹치는 위치) 제거: start, end 기준
            for h in value_spans + value_spans_embed:
                key = (h['start'], h['end'])
                if key not in value_spans_dict:
                    value_spans_dict[key] = h
            value_spans_merged = list(value_spans_dict.values())
            # LLM value_fit 제거, 병합 결과로 대체
            other_highlights = [h for h in llm_highlights if h.get('category') not in ('skill_fit', 'value_fit')]
            all_spans = sorted(other_highlights + skill_spans + impact_spans + value_spans_merged, key=lambda x: x['start'])
            deduped_spans = self._dedup_highlights_by_sentence(text, all_spans)
            summary = result.get('summary', {})
            # skill_fit_count는 반드시 중복제거(set)된 개수만 카운트
            summary['skill_fit_count'] = self._skill_fit_count(deduped_spans)
            # value_fit_count 등 다른 카테고리는 기존대로 유지
            summary['value_fit_count'] = len([h for h in deduped_spans if h.get('category') == 'value_fit'])
            highlighted_text = self._apply_highlights(text, deduped_spans)
            return {
                'original_text': text,
                'highlighted_text': highlighted_text,
                'highlights': deduped_spans,
                'summary': summary,
                'categories': self.categories
            }
        except Exception as e:
            print(f"텍스트 분석 중 오류 발생: {e}")
            return {
                'original_text': text,
                'highlighted_text': text,
                'highlights': [],
                'summary': {},
                'categories': self.categories,
                'error': str(e)
            }

    def _create_analysis_prompt(self, text: str, job_description: str, company_values: str, value_synonyms: Optional[Dict[str, List[str]]] = None, jd_keywords: Optional[list] = None, skill_synonym_set: Optional[set] = None) -> str:
        """
        LLM 분석용 프롬프트 생성 (카테고리별 분류 정확도 향상, 동의어/예시/예외 규칙 강화)
        """
        # 1) 회사 가치 & 동의어 목록 문자열화
        values_block = ""
        if company_values:
            values_block += f"\n- 기본 키워드: {company_values}"
        if value_synonyms:
            syn_lines = [f"  • {k}: {', '.join(v)}" for k, v in value_synonyms.items()]
            values_block += "\n- 동의어/유사어/띄어쓰기/오타 허용:\n" + "\n".join(syn_lines)
        # 2) JD 키워드 블록
        jd_keywords_block = ""
        if jd_keywords:
            jd_keywords_block = f"\n\nJD 주요 기술 키워드:\n{', '.join(jd_keywords)}"
        # 3) skill 동의어사전 블록
        skill_synonyms_block = ""
        if skill_synonym_set:
            skill_synonyms_block = f"\n\n[skill_fit 동의어사전] (아래 모든 변형을 소문자로 변환 후 비교)\n{', '.join(sorted(skill_synonym_set))}"
        # 4) 직무 설명 블록
        jd_block = f"\n\n직무 설명:\n{job_description}" if job_description else ""
        # 5) 최종 프롬프트
        return f"""
다음 자기소개서(cover letter) 텍스트를 **겹치지 않는 토큰 단위**로 잘라
아래 5개 카테고리 중 하나로 분류하고 결과를 JSON으로 돌려줘.

### 카테고리 정의
1. **impact**   : 숫자·퍼센트·기간 등 ***정량 성과*** (예: \"매출 20 % 증가\", \"6개월 만에 1만 명 확보\", \"우수상 수상\", \"장려상 입상\" 등 수상 이력)
2. **skill_fit**: JD의 핵심 기술·도구와 ***직접 매칭*** (예: \"Java\", \"Spring Framework\", \"Kubernetes\")\n- skill_fit은 JD 주요 기술 키워드 또는 아래 동의어사전의 모든 변형(소문자 변환 후)과 정확히 일치할 때만 해당
3. **value_fit**: 회사 인재상 ***키워드 또는 그 동의어***가 등장하는 부분  
   - 키워드 & 동의어 목록
{values_block if values_block else '  (없음)'}
   - **위 목록에 있는 단어가 나타나면 무조건 value_fit 으로 분류**. 다른 카테고리와 중복❌
4. **vague**    : 근거 없는 추상 표현이나 공허한 다짐 (예: \"열심히 하겠습니다\", \"최선을 다하겠습니다\")
5. **risk**     : 조직 가치·직무와 충돌하거나 부정적 뉘앙스 (예: \"야근 선호 안 함\", \"업무 강요는 싫습니다\")

### JD 주요 기술 키워드
{', '.join(jd_keywords) if jd_keywords else '(없음)'}
{skill_synonyms_block}

### 출력 형식(JSON)
{{
  "highlights": [
    {{
      "text": "...",          // 원문 그대로
      "category": "impact|skill_fit|value_fit|vague|risk",
      "start": 0,             // 0‑based index
      "end": 10,              // exclusive
      "reason": "짧은 분류 근거"
    }}
  ],
  "summary": {{
    "impact_count": 0,
    "skill_fit_count": 0,
    "value_fit_count": 0,
    "vague_count": 0,
    "risk_count": 0
  }}
}}

### 추가 규칙 및 예외
- 숫자/퍼센트가 포함된 구문이 ***성과***(증가·감소·절감·달성 등)와 결합 ⇒ impact
- value_fit 키워드 또는 동의어가 포함된 구문은 다른 카테고리로 중복 분류하지 말 것
- skill_fit은 JD(직무 설명)에서 명시된 기술/도구 또는 동의어사전의 변형(소문자 변환 후)과 정확히 일치할 때만 해당
- vague는 실제 근거 없이 추상적·모호한 표현만 해당 (예: \"노력하겠습니다\", \"최선을 다하겠습니다\")
- risk는 부정적·소극적·조직/직무와 충돌하는 표현만 해당 (예: \"야근 싫음\", \"업무 강요는 싫다\")
- 필요한 경우 텍스트를 부분적으로 잘라 여러 하이라이트를 만들되, 인덱스 겹침은 금지
- JSON 이외 불필요한 텍스트를 출력하지 말 것
- 반드시 각 하이라이트별로 "reason"(분류 근거)을 1문장으로 작성
- value_fit은 동의어까지 모두 포함해서 탐지
- 예시와 규칙을 엄격히 따를 것

### 분석 대상 텍스트
{text}
{jd_block}
"""

    def _apply_highlights(self, text: str, highlights: List[Dict]) -> str:
        """하이라이팅 정보를 HTML로 변환 (끝 공백은 하이라이트 밖으로)"""
        if not highlights:
            return text
            
        # 하이라이팅을 시작 위치 기준으로 정렬
        sorted_highlights = sorted(highlights, key=lambda x: x['start'])
        
        # HTML 태그로 변환
        result = ""
        last_end = 0
        
        for highlight in sorted_highlights:
            # 하이라이팅 이전 텍스트 추가
            result += text[last_end:highlight['start']]
            
            # 하이라이팅된 텍스트 추가
            category = highlight['category']
            highlight_text = highlight["text"]
            # 끝에 공백이 있으면 분리
            trailing_space = ""
            while highlight_text and highlight_text[-1].isspace():
                trailing_space = highlight_text[-1] + trailing_space
                highlight_text = highlight_text[:-1]
            if category in self.categories:
                color = self.categories[category]['color']
                bg_color = self.categories[category]['bg_color']
                # title에 하위라벨(한글) 표시
                if highlight.get('sub_label'):
                    title = f"{category}({highlight['sub_label']})"
                else:
                    title = highlight.get("reason", "")
                result += f'<span class="highlight" data-category="{category}" style="background-color: {bg_color}; color: {color}; padding: 2px 4px; border-radius: 3px; font-weight: 500;" title="{title}">{highlight_text}</span>{trailing_space}'
            else:
                result += highlight_text + trailing_space
            last_end = highlight['end']
        
        # 마지막 부분 텍스트 추가
        result += text[last_end:]
        
        return result

    def get_categories(self) -> Dict[str, Any]:
        """형광펜 카테고리 정보 반환"""
        return self.categories 