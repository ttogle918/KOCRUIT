#!/usr/bin/env python3
"""
ai_question_generation_workflow.py
AI 기반 시나리오 질문 생성 워크플로우
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 설정 클래스 (간단한 버전)
class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    
settings = Settings()

logger = logging.getLogger(__name__)

class ScenarioQuestion(BaseModel):
    """시나리오 질문 모델"""
    id: int = Field(description="질문 ID")
    scenario: str = Field(description="상황 시나리오")
    question: str = Field(description="구체적인 질문")
    category: str = Field(description="질문 카테고리")
    time_limit: int = Field(description="답변 시간 제한 (초)")
    difficulty: str = Field(description="난이도 (easy, medium, hard)")
    evaluation_focus: List[str] = Field(description="평가 중점 영역들")

class QuestionSet(BaseModel):
    """질문 세트 모델"""
    scenarios: List[ScenarioQuestion] = Field(description="시나리오 질문 목록")
    total_count: int = Field(description="총 질문 수")
    job_fit_score: float = Field(description="직무 적합도 점수")

class AIQuestionGenerationWorkflow:
    """AI 기반 시나리오 질문 생성 워크플로우"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY
        )
        self.parser = PydanticOutputParser(pydantic_object=QuestionSet)
    
    async def generate_scenario_questions(
        self,
        job_title: str,
        job_description: str,
        company_name: str,
        required_skills: List[str],
        experience_level: str = "mid-level"
    ) -> QuestionSet:
        """직무별 맞춤 시나리오 질문 생성"""
        
        try:
            # 시스템 프롬프트
            system_prompt = """당신은 전문적인 면접관입니다. 주어진 직무와 회사 정보를 바탕으로 
            실무에서 실제로 발생할 수 있는 상황들을 시나리오로 만들어 질문을 생성해야 합니다.
            
            질문 생성 규칙:
            1. 실제 업무에서 발생할 수 있는 구체적인 상황을 제시
            2. 지원자의 문제해결 능력, 협업 능력, 의사소통 능력을 평가할 수 있는 질문
            3. 직무와 관련된 기술적/비기술적 역량을 종합적으로 평가
            4. 다양한 난이도의 질문 포함 (쉬운 것부터 어려운 것까지)
            5. 각 질문마다 평가 중점 영역을 명시
            
            평가 영역:
            - language_ability: 언어능력 (논리성, 표현력)
            - non_verbal_behavior: 비언어행동 (시선, 표정, 자세, 말투)
            - psychological_traits: 심리성향 (Big5 기반)
            - cognitive_ability: 인지능력 (집중력, 순발력, 기억력)
            - job_fit: 직무적합도 (상황판단력, 문제해결력)
            - interview_reliability: 면접신뢰도 (태도, 진정성, 일관성)
            
            질문 카테고리:
            - situation_handling: 상황 대처
            - teamwork: 팀워크 및 협업
            - problem_solving: 문제 해결
            - learning: 학습 및 성장
            - time_management: 시간 관리
            - communication: 의사소통
            - leadership: 리더십
            - technical: 기술적 역량
            """
            
            # 사용자 프롬프트
            user_prompt = f"""
            직무 정보:
            - 직무명: {job_title}
            - 회사: {company_name}
            - 직무 설명: {job_description}
            - 필요 역량: {', '.join(required_skills)}
            - 경력 수준: {experience_level}
            
            위 정보를 바탕으로 5-7개의 시나리오 질문을 생성해주세요.
            각 질문은 실제 업무 상황을 반영하고, 지원자의 역량을 종합적으로 평가할 수 있어야 합니다.
            
            응답 형식:
            {{
                "scenarios": [
                    {{
                        "id": 1,
                        "scenario": "구체적인 상황 설명",
                        "question": "구체적인 질문",
                        "category": "질문 카테고리",
                        "time_limit": 120,
                        "difficulty": "medium",
                        "evaluation_focus": ["job_fit", "problem_solving", "communication"]
                    }}
                ],
                "total_count": 5,
                "job_fit_score": 8.5
            }}
            """
            
            # AI 모델 호출
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # 응답 파싱
            try:
                # JSON 블록 추출
                content = response.content
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    json_str = content[json_start:json_end].strip()
                else:
                    # JSON 블록이 없으면 전체 내용에서 JSON 찾기
                    start_idx = content.find("{")
                    end_idx = content.rfind("}") + 1
                    json_str = content[start_idx:end_idx]
                
                # JSON 파싱
                data = json.loads(json_str)
                
                # Pydantic 모델로 변환
                question_set = QuestionSet(**data)
                
                logger.info(f"AI 시나리오 질문 생성 완료: {question_set.total_count}개 질문")
                return question_set
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON 파싱 오류: {e}")
                logger.error(f"응답 내용: {response.content}")
                # 폴백: 기본 질문 반환
                return self._get_fallback_questions()
                
        except Exception as e:
            logger.error(f"AI 질문 생성 오류: {e}")
            return self._get_fallback_questions()
    
    def _get_fallback_questions(self) -> QuestionSet:
        """기본 폴백 질문 반환"""
        return QuestionSet(
            scenarios=[
                ScenarioQuestion(
                    id=1,
                    scenario="고객이 갑작스럽게 요구사항을 변경했을 때, 어떻게 대응하시겠습니까?",
                    question="이런 상황에서 본인의 대응 방식을 구체적으로 설명해주세요.",
                    category="situation_handling",
                    time_limit=120,
                    difficulty="medium",
                    evaluation_focus=["job_fit", "problem_solving", "communication"]
                ),
                ScenarioQuestion(
                    id=2,
                    scenario="팀원과 의견이 충돌하는 상황에서, 어떻게 해결하시겠습니까?",
                    question="협업 과정에서 발생할 수 있는 갈등 해결 방법을 설명해주세요.",
                    category="teamwork",
                    time_limit=120,
                    difficulty="medium",
                    evaluation_focus=["teamwork", "communication", "psychological_traits"]
                ),
                ScenarioQuestion(
                    id=3,
                    scenario="업무 중 예상치 못한 문제가 발생했을 때, 어떻게 해결하시겠습니까?",
                    question="문제 해결 과정에서 본인의 접근 방식을 설명해주세요.",
                    category="problem_solving",
                    time_limit=120,
                    difficulty="hard",
                    evaluation_focus=["job_fit", "cognitive_ability", "problem_solving"]
                ),
                ScenarioQuestion(
                    id=4,
                    scenario="새로운 기술을 배워야 하는 상황에서, 어떻게 학습하시겠습니까?",
                    question="효율적인 학습 방법과 지속적인 성장 방안을 설명해주세요.",
                    category="learning",
                    time_limit=120,
                    difficulty="easy",
                    evaluation_focus=["learning", "cognitive_ability", "psychological_traits"]
                ),
                ScenarioQuestion(
                    id=5,
                    scenario="업무량이 급증했을 때, 어떻게 우선순위를 정하시겠습니까?",
                    question="시간 관리와 업무 효율성을 높이는 방법을 설명해주세요.",
                    category="time_management",
                    time_limit=120,
                    difficulty="medium",
                    evaluation_focus=["time_management", "job_fit", "cognitive_ability"]
                )
            ],
            total_count=5,
            job_fit_score=7.0
        )
    
    async def generate_follow_up_questions(
        self,
        original_question: str,
        candidate_response: str,
        evaluation_focus: List[str]
    ) -> List[str]:
        """후속 질문 생성"""
        
        try:
            system_prompt = """당신은 면접관입니다. 지원자의 답변을 듣고 
            더 깊이 있는 정보를 얻기 위한 후속 질문을 생성해야 합니다.
            
            후속 질문 생성 규칙:
            1. 지원자의 답변에서 구체적인 예시나 경험을 요구
            2. 답변이 모호한 부분에 대해 명확히 하기
            3. 평가 중점 영역에 맞는 추가 질문
            4. 최대 3개의 후속 질문 생성
            """
            
            user_prompt = f"""
            원본 질문: {original_question}
            지원자 답변: {candidate_response}
            평가 중점: {', '.join(evaluation_focus)}
            
            위 정보를 바탕으로 후속 질문을 생성해주세요.
            
            응답 형식:
            {{
                "follow_up_questions": [
                    "구체적인 예시를 들어 설명해주세요.",
                    "그 상황에서 본인의 역할은 무엇이었나요?",
                    "결과적으로 어떤 성과를 얻었나요?"
                ]
            }}
            """
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # JSON 파싱
            content = response.content
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                json_str = content[json_start:json_end].strip()
            else:
                start_idx = content.find("{")
                end_idx = content.rfind("}") + 1
                json_str = content[start_idx:end_idx]
            
            data = json.loads(json_str)
            return data.get("follow_up_questions", [])
            
        except Exception as e:
            logger.error(f"후속 질문 생성 오류: {e}")
            return [
                "구체적인 예시를 들어 설명해주세요.",
                "그 상황에서 본인의 역할은 무엇이었나요?",
                "결과적으로 어떤 성과를 얻었나요?"
            ]

# 싱글톤 인스턴스
ai_question_generator = AIQuestionGenerationWorkflow()

async def generate_ai_scenario_questions(
    job_title: str,
    job_description: str,
    company_name: str,
    required_skills: List[str],
    experience_level: str = "mid-level"
) -> QuestionSet:
    """AI 시나리오 질문 생성 함수"""
    return await ai_question_generator.generate_scenario_questions(
        job_title=job_title,
        job_description=job_description,
        company_name=company_name,
        required_skills=required_skills,
        experience_level=experience_level
    )

async def generate_follow_up_questions(
    original_question: str,
    candidate_response: str,
    evaluation_focus: List[str]
) -> List[str]:
    """후속 질문 생성 함수"""
    return await ai_question_generator.generate_follow_up_questions(
        original_question=original_question,
        candidate_response=candidate_response,
        evaluation_focus=evaluation_focus
    ) 