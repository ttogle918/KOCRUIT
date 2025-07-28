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

# 키워드 매칭 분석 프롬프트
keyword_matching_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 이력서 정보입니다:
    ---
    {resume_text}
    ---
    
    직무 요구사항 및 회사 정보:
    ---
    {job_info}
    ---
    
    위 정보를 바탕으로 이력서와 직무 요구사항 간의 키워드 매칭 분석을 수행해 주세요.
    
    다음 관점에서 분석해 주세요:
    
    1. 매칭된 키워드 (이력서에 있는 직무 관련 키워드)
    2. 부족한 키워드 (직무 요구사항에 있지만 이력서에 없는 키워드)
    3. 스킬 갭 분석 (기술적 차이점과 개선 방안)
    4. 매칭 점수 (전체적인 적합도)
    
    다음 JSON 형식으로 응답해 주세요:
    {{
        "matching_summary": "전체적인 매칭 상황 요약",
        "matched_keywords": ["매칭된 키워드1", "매칭된 키워드2", ...],
        "missing_keywords": ["부족한 키워드1", "부족한 키워드2", ...],
        "skill_gap_analysis": {{
            "gap_description": "스킬 갭에 대한 설명",
            "recommendations": ["개선 방안1", "개선 방안2", ...],
            "priority_skills": ["우선 학습 스킬1", "우선 학습 스킬2", ...]
        }},
        "matching_score": 85
    }}
    """
)

class KeywordMatchingTool:
    """키워드 매칭 분석 도구"""
    
    def __init__(self):
        self.chain = LLMChain(llm=llm, prompt=keyword_matching_prompt)
    
    @redis_cache(expire=1800)  # 30분 캐시
    def analyze_keyword_matching(self, resume_text: str, job_info: str) -> Dict[str, Any]:
        """
        이력서와 직무 요구사항 간의 키워드 매칭 분석
        
        Args:
            resume_text: 이력서 텍스트
            job_info: 직무 요구사항 및 회사 정보
            
        Returns:
            키워드 매칭 분석 결과
        """
        try:
            # LLM 체인 실행
            result = self.chain.run({
                "resume_text": resume_text,
                "job_info": job_info
            })
            
            # JSON 파싱
            try:
                analysis_result = json.loads(result)
                return analysis_result
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 텍스트에서 정보 추출
                return self._extract_info_from_text(result)
                
        except Exception as e:
            print(f"키워드 매칭 분석 중 오류 발생: {e}")
            return {
                "error": f"분석 중 오류가 발생했습니다: {str(e)}",
                "matching_summary": "분석을 완료할 수 없습니다.",
                "matched_keywords": [],
                "missing_keywords": [],
                "skill_gap_analysis": {
                    "gap_description": "분석을 완료할 수 없습니다.",
                    "recommendations": [],
                    "priority_skills": []
                },
                "matching_score": 0
            }
    
    def _extract_info_from_text(self, text: str) -> Dict[str, Any]:
        """텍스트에서 키워드 매칭 정보 추출"""
        try:
            # 매칭된 키워드 추출
            matched_keywords = []
            if "매칭된 키워드" in text:
                match_section = text.split("매칭된 키워드")[1].split("부족한 키워드")[0]
                matched_keywords = re.findall(r'["\']([^"\']+)["\']', match_section)
            
            # 부족한 키워드 추출
            missing_keywords = []
            if "부족한 키워드" in text:
                missing_section = text.split("부족한 키워드")[1].split("스킬 갭")[0]
                missing_keywords = re.findall(r'["\']([^"\']+)["\']', missing_section)
            
            # 매칭 점수 추출
            matching_score = 0
            score_match = re.search(r'매칭 점수[:\s]*(\d+)', text)
            if score_match:
                matching_score = int(score_match.group(1))
            
            return {
                "matching_summary": "키워드 매칭 분석이 완료되었습니다.",
                "matched_keywords": matched_keywords,
                "missing_keywords": missing_keywords,
                "skill_gap_analysis": {
                    "gap_description": "스킬 갭 분석이 완료되었습니다.",
                    "recommendations": ["부족한 스킬을 보완하세요."],
                    "priority_skills": missing_keywords[:3]  # 상위 3개를 우선 스킬로
                },
                "matching_score": matching_score
            }
        except Exception as e:
            return {
                "error": f"정보 추출 중 오류 발생: {str(e)}",
                "matching_summary": "분석을 완료할 수 없습니다.",
                "matched_keywords": [],
                "missing_keywords": [],
                "skill_gap_analysis": {
                    "gap_description": "분석을 완료할 수 없습니다.",
                    "recommendations": [],
                    "priority_skills": []
                },
                "matching_score": 0
            } 