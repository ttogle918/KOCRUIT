import json
from typing import Dict, List, Any
from openai import OpenAI
import os

class HighlightResumeTool:
    """자기소개서 텍스트를 분석하여 형광펜 하이라이팅을 적용하는 도구"""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # 형광펜 카테고리 정의
        self.categories = {
            'impact': {
                'name': 'impact',
                'description': '숫자·퍼센트 등 정량 성과',
                'color': '#4ade80',  # 초록색
                'bg_color': '#dcfce7'
            },
            'skill_fit': {
                'name': 'skill_fit', 
                'description': 'JD 핵심 기술과 직접 매칭',
                'color': '#3b82f6',  # 파란색
                'bg_color': '#dbeafe'
            },
            'value_fit': {
                'name': 'value_fit',
                'description': '회사 인재상 키워드와 직접 매칭', 
                'color': '#fbbf24',  # 노란색
                'bg_color': '#fef3c7'
            },
            'vague': {
                'name': 'vague',
                'description': '근거 없는 추상 표현',
                'color': '#fb923c',  # 주황색
                'bg_color': '#fed7aa'
            },
            'risk': {
                'name': 'risk',
                'description': '가치·직무와 충돌 or 부정적 태도',
                'color': '#f87171',  # 빨간색
                'bg_color': '#fee2e2'
            }
        }

    def analyze_text(self, text: str, job_description: str = "", company_values: str = "") -> Dict[str, Any]:
        """
        자기소개서 텍스트를 분석하여 형광펜 하이라이팅 정보를 반환
        
        Args:
            text: 분석할 자기소개서 텍스트
            job_description: 직무 설명 (선택사항)
            company_values: 회사 가치관 (선택사항)
            
        Returns:
            하이라이팅 정보가 포함된 딕셔너리
        """
        try:
            # LLM에게 분석 요청
            prompt = self._create_analysis_prompt(text, job_description, company_values)
            
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
            
            # 응답 파싱
            result = json.loads(response.choices[0].message.content)
            
            # 형광펜 정보 추가
            highlighted_text = self._apply_highlights(text, result.get('highlights', []))
            
            return {
                'original_text': text,
                'highlighted_text': highlighted_text,
                'highlights': result.get('highlights', []),
                'summary': result.get('summary', {}),
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

    def _create_analysis_prompt(self, text: str, job_description: str, company_values: str) -> str:
        """LLM 분석을 위한 프롬프트 생성"""
        
        context = ""
        if job_description:
            context += f"\n\n직무 설명: {job_description}"
        if company_values:
            context += f"\n\n회사 가치관: {company_values}"
            
        return f"""
다음 자기소개서 텍스트를 분석하여 5가지 카테고리로 분류해주세요.

분석할 텍스트:
{text}{context}

분류 카테고리:
1. impact: 숫자·퍼센트 등 정량 성과 (예: "매출 20% 증가", "고객 만족도 95%")
2. skill_fit: JD 핵심 기술과 직접 매칭 (예: "Java 개발", "Spring Framework")
3. value_fit: 회사 인재상 키워드와 직접 매칭 (예: "창의성", "협력", "도전")
4. vague: 근거 없는 추상 표현 (예: "열심히 하겠습니다", "최선을 다하겠습니다")
5. risk: 가치·직무와 충돌 or 부정적 태도 (예: "업무 강요", "부당한 요구")

응답 형식:
{{
    "highlights": [
        {{
            "text": "분석된 텍스트 조각",
            "category": "impact|skill_fit|value_fit|vague|risk",
            "start": 시작_인덱스,
            "end": 끝_인덱스,
            "reason": "분류 이유"
        }}
    ],
    "summary": {{
        "impact_count": 개수,
        "skill_fit_count": 개수,
        "value_fit_count": 개수,
        "vague_count": 개수,
        "risk_count": 개수
    }}
}}

주의사항:
- 텍스트 조각은 원문의 정확한 부분을 사용하세요
- start와 end 인덱스는 0부터 시작하는 문자 위치입니다
- 각 텍스트 조각은 겹치지 않아야 합니다
- 모든 텍스트를 분류할 필요는 없습니다
"""

    def _apply_highlights(self, text: str, highlights: List[Dict]) -> str:
        """하이라이팅 정보를 HTML로 변환"""
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
            if category in self.categories:
                color = self.categories[category]['color']
                bg_color = self.categories[category]['bg_color']
                
                result += f'<span class="highlight" data-category="{category}" style="background-color: {bg_color}; color: {color}; padding: 2px 4px; border-radius: 3px; font-weight: 500;" title="{highlight.get("reason", "")}">{highlight["text"]}</span>'
            else:
                result += highlight['text']
                
            last_end = highlight['end']
        
        # 마지막 부분 텍스트 추가
        result += text[last_end:]
        
        return result

    def get_categories(self) -> Dict[str, Any]:
        """형광펜 카테고리 정보 반환"""
        return self.categories 