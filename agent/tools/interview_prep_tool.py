from typing import Dict, Any, Optional
from langchain_openai import ChatOpenAI
import logging
import json
import os

logger = logging.getLogger(__name__)

class InterviewPrepTool:
    """면접 준비 도구 생성기 (체크리스트, 가이드라인 등)"""
    
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

    async def generate_tools(self, job_post: Dict[str, Any], resume_data: Dict[str, Any], interview_type: str = "PRACTICAL") -> Dict[str, Any]:
        """면접관을 위한 AI 도구 생성"""
        try:
            # 기본 프롬프트 구성 (이전 코드 참조)
            prompt = f"""
            당신은 채용 면접 전문가입니다. 다음 채용 공고와 지원자 정보를 바탕으로, 면접관이 효과적인 면접을 진행할 수 있도록 돕는 도구들을 생성해 주세요.

            [채용 공고 정보]
            직무: {job_post.get('title', '')}
            자격요건: {job_post.get('qualifications', '')}
            우대사항: {job_post.get('conditions', '')}
            상세내용: {job_post.get('job_details', '')}

            [지원자 정보]
            이름: {resume_data.get('name', '지원자')}
            경력: {resume_data.get('career_summary', '')}
            주요기술: {resume_data.get('skills', '')}
            자기소개: {resume_data.get('introduction', '')}
            
            [면접 유형]
            {interview_type} (PRACTICAL: 실무 면접, EXECUTIVE: 임원 면접)

            다음 4가지 도구를 포함한 JSON 형식으로 응답해 주세요:

            1. checklist: 면접 전/중/후 체크리스트, 주의해야 할 Red Flag/Green Flag
            2. strengths_weaknesses: 지원자의 강점/약점 분석, 개발 필요 영역, 경쟁 우위 요소
            3. guideline: 면접 진행 가이드라인, 카테고리별 핵심 질문 전략, 시간 배분 제안
            4. evaluation_criteria: 평가 기준표, 가중치 추천, 평가 질문, 채점 가이드라인

            응답 형식 예시:
            {{
                "evaluation_tools": {{
                    "checklist": {{
                        "pre_interview_checklist": ["...", "..."],
                        "during_interview_checklist": ["...", "..."],
                        "post_interview_checklist": ["...", "..."],
                        "red_flags_to_watch": ["...", "..."],
                        "green_flags_to_confirm": ["...", "..."]
                    }},
                    "strengths_weaknesses": {{
                        "strengths": [{{"area": "...", "description": "...", "evidence": "..."}}],
                        "weaknesses": [{{"area": "...", "description": "...", "suggestion": "..."}}],
                        "development_areas": ["...", "..."],
                        "competitive_advantages": ["...", "..."]
                    }},
                    "guideline": {{
                        "interview_approach": "...",
                        "key_questions_by_category": {{
                            "직무적합성": ["...", "..."],
                            "인성": ["...", "..."]
                        }},
                        "evaluation_criteria": [{{"criterion": "...", "description": "...", "weight": 0.4}}],
                        "time_allocation": {{"직무질문": 0.5, "인성질문": 0.3, "기타": 0.2}},
                        "follow_up_questions": ["...", "..."]
                    }},
                    "evaluation_criteria": {{
                        "suggested_criteria": [{{"criterion": "...", "description": "...", "weight": 0.3}}],
                        "weight_recommendations": [{{"category": "...", "weight": 0.3, "reason": "..."}}],
                        "evaluation_questions": ["...", "..."],
                        "scoring_guidelines": {{"A": "90-100점", "B": "80-89점", "C": "70-79점", "D": "60-69점", "F": "60점 미만"}}
                    }}
                }}
            }}
            """
            
            response = await self.llm.ainvoke(prompt)
            content = response.content.strip()
            
            # JSON 파싱
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            return json.loads(content)
            
        except Exception as e:
            logger.error(f"면접 도구 생성 실패: {e}")
            return {"error": str(e)}

# 싱글톤
interview_prep_tool = InterviewPrepTool()

