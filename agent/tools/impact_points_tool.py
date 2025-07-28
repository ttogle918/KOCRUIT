from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any, List
import json
import re
from agent.utils.llm_cache import redis_cache

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini")

# 임팩트 포인트 분석 프롬프트
impact_points_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 이력서 정보입니다:
    ---
    {resume_text}
    ---
    
    직무 정보:
    ---
    {job_info}
    ---
    
    위 정보를 바탕으로 이력서 텍스트만으로 후보의 핵심 임팩트 포인트를 분석해 주세요.
    
    다음 관점에서 분석해 주세요:
    
    1. 강점 Top3: 이력서에서 가장 인상적이고 차별화된 강점 3가지
    2. 주의 Top2: 이력서에서 발견되는 잠재적 우려사항이나 개선점 2가지
    3. 면접 포인트 Top2: 면접에서 집중적으로 물어볼 만한 핵심 포인트 2가지
    
    다음 JSON 형식으로 응답해 주세요:
    {{
        "strengths": [
            "강점1: 구체적이고 명확한 설명",
            "강점2: 구체적이고 명확한 설명", 
            "강점3: 구체적이고 명확한 설명"
        ],
        "cautions": [
            "주의사항1: 구체적이고 명확한 설명",
            "주의사항2: 구체적이고 명확한 설명"
        ],
        "interview_points": [
            "면접 포인트1: 구체적이고 명확한 설명",
            "면접 포인트2: 구체적이고 명확한 설명"
        ],
        "additional_insights": "전체적인 후보 평가에 대한 추가 인사이트 (선택사항)"
    }}
    
    각 항목은 구체적이고 명확하게 작성해 주세요. 추상적이거나 모호한 표현은 피해 주세요.
    """
)

class ImpactPointsTool:
    """임팩트 포인트 분석 도구"""
    
    def __init__(self):
        self.chain = LLMChain(llm=llm, prompt=impact_points_prompt)
    
    @redis_cache(expire=1800)  # 30분 캐시
    def analyze_impact_points(self, resume_text: str, job_info: str = "") -> Dict[str, Any]:
        """
        이력서 텍스트 기반 임팩트 포인트 분석
        
        Args:
            resume_text: 이력서 텍스트
            job_info: 직무 정보 (선택사항)
            
        Returns:
            임팩트 포인트 분석 결과
        """
        try:
            # LLM 체인 실행
            result = self.chain.run({
                "resume_text": resume_text,
                "job_info": job_info or "직무 정보가 제공되지 않았습니다."
            })
            
            # JSON 파싱
            try:
                analysis_result = json.loads(result)
                return analysis_result
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 텍스트에서 정보 추출
                return self._extract_info_from_text(result)
                
        except Exception as e:
            print(f"임팩트 포인트 분석 중 오류 발생: {e}")
            return {
                "error": f"분석 중 오류가 발생했습니다: {str(e)}",
                "strengths": ["분석을 완료할 수 없습니다."],
                "cautions": ["분석을 완료할 수 없습니다."],
                "interview_points": ["분석을 완료할 수 없습니다."],
                "additional_insights": "분석 중 오류가 발생했습니다."
            }
    
    def _extract_info_from_text(self, text: str) -> Dict[str, Any]:
        """텍스트에서 임팩트 포인트 정보 추출"""
        try:
            # 강점 추출
            strengths = []
            if "강점" in text:
                strength_section = text.split("강점")[1].split("주의")[0] if "주의" in text else text.split("강점")[1]
                strength_matches = re.findall(r'["\']([^"\']+)["\']', strength_section)
                strengths = [match for match in strength_matches if len(match) > 10][:3]  # 의미있는 텍스트만 선택
            
            # 주의사항 추출
            cautions = []
            if "주의" in text:
                caution_section = text.split("주의")[1].split("면접")[0] if "면접" in text else text.split("주의")[1]
                caution_matches = re.findall(r'["\']([^"\']+)["\']', caution_section)
                cautions = [match for match in caution_matches if len(match) > 10][:2]
            
            # 면접 포인트 추출
            interview_points = []
            if "면접" in text:
                interview_section = text.split("면접")[1]
                interview_matches = re.findall(r'["\']([^"\']+)["\']', interview_section)
                interview_points = [match for match in interview_matches if len(match) > 10][:2]
            
            # 기본값 설정
            if not strengths:
                strengths = ["이력서에서 강점을 분석할 수 없습니다."]
            if not cautions:
                cautions = ["이력서에서 주의사항을 분석할 수 없습니다."]
            if not interview_points:
                interview_points = ["이력서에서 면접 포인트를 분석할 수 없습니다."]
            
            return {
                "strengths": strengths[:3],
                "cautions": cautions[:2],
                "interview_points": interview_points[:2],
                "additional_insights": "이력서 기반 임팩트 포인트 분석이 완료되었습니다."
            }
        except Exception as e:
            return {
                "error": f"정보 추출 중 오류 발생: {str(e)}",
                "strengths": ["분석을 완료할 수 없습니다."],
                "cautions": ["분석을 완료할 수 없습니다."],
                "interview_points": ["분석을 완료할 수 없습니다."],
                "additional_insights": "분석 중 오류가 발생했습니다."
            } 