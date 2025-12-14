#!/usr/bin/env python3
"""
AI 면접용 질문 생성 API
시나리오 기반 질문 생성 (이력서 무관)
"""

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
import json
import logging
import asyncio
from datetime import datetime
import sys
import os

# LangGraph 워크플로우 import를 위한 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../..'))

from app.core.database import get_db
from app.models.v2.interview.interview_question import InterviewQuestion, QuestionType
from app.models.v2.document.application import Application
from app.models.v2.recruitment.job import JobPost
from app.services.v2.interview.interview_question_service import InterviewQuestionService
from app.data.general_interview_questions import get_random_general_questions, get_random_game_test

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    """간단한 테스트 엔드포인트"""
    return {
        "success": True,
        "message": "AI 면접 질문 API가 정상적으로 동작합니다.",
        "timestamp": datetime.now().isoformat(),
        "python_path": sys.path
    }

# WebSocket 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

# 면접 랭그래프 확인 및 연결 API
@router.get("/langgraph-status")
async def get_langgraph_status():
    """면접 랭그래프 상태 확인"""
    try:
        # LangGraph 워크플로우 import 시도
        from agent.agents.ai_interview_workflow import ai_interview_workflow
        from agent.agents.interview_question_workflow import interview_workflow
        
        return {
            "status": "available",
            "workflows": {
                "ai_interview_workflow": "available",
                "interview_question_workflow": "available"
            },
            "message": "면접 랭그래프 워크플로우가 정상적으로 로드되었습니다."
        }
    except ImportError as e:
        logging.error(f"LangGraph 워크플로우 import 실패: {e}")
        return {
            "status": "error",
            "error": f"LangGraph 워크플로우 import 실패: {str(e)}",
            "message": "면접 랭그래프 워크플로우를 로드할 수 없습니다. 경로: {sys.path}"
        }
    except Exception as e:
        logging.error(f"예상치 못한 오류: {e}")
        return {
            "status": "error",
            "error": f"예상치 못한 오류: {str(e)}",
            "message": "면접 랭그래프 상태 확인 중 오류가 발생했습니다."
        }

@router.post("/langgraph/run-interview-workflow")
async def run_interview_langgraph_workflow(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """면접 질문 생성 랭그래프 워크플로우 실행"""
    try:
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 요청 데이터 추출
        resume_text = request.get("resume_text", "")
        job_info = request.get("job_info", "")
        company_name = request.get("company_name", "")
        applicant_name = request.get("applicant_name", "")
        interview_type = request.get("interview_type", "general")
        first_interview_feedback = request.get("first_interview_feedback", "")
        previous_feedback = request.get("previous_feedback", "")
        job_matching_info = request.get("job_matching_info", "")
        
        # 워크플로우 실행
        result = generate_comprehensive_interview_questions(
            resume_text=resume_text,
            job_info=job_info,
            company_name=company_name,
            applicant_name=applicant_name,
            interview_type=interview_type,
            first_interview_feedback=first_interview_feedback,
            previous_feedback=previous_feedback,
            job_matching_info=job_matching_info
        )
        
        return {
            "success": True,
            "workflow_type": "interview_question_generation",
            "result": result,
            "executed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logging.error(f"면접 랭그래프 워크플로우 실행 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "workflow_type": "interview_question_generation"
        }

@router.post("/langgraph/run-ai-interview-workflow")
async def run_ai_interview_langgraph_workflow(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """AI 면접 평가 랭그래프 워크플로우 실행"""
    try:
        from agent.agents.ai_interview_workflow import run_ai_interview
        
        # 요청 데이터 추출
        session_id = request.get("session_id", f"session_{datetime.now().timestamp()}")
        job_info = request.get("job_info", "")
        audio_data = request.get("audio_data", {})
        behavior_data = request.get("behavior_data", {})
        game_data = request.get("game_data", {})
        
        # 워크플로우 실행
        result = run_ai_interview(
            session_id=session_id,
            job_info=job_info,
            audio_data=audio_data,
            behavior_data=behavior_data,
            game_data=game_data
        )
        
        return {
            "success": True,
            "workflow_type": "ai_interview_evaluation",
            "result": result,
            "session_id": session_id,
            "executed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logging.error(f"AI 면접 랭그래프 워크플로우 실행 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "workflow_type": "ai_interview_evaluation"
        }

@router.get("/langgraph/workflow-info")
async def get_langgraph_workflow_info():
    """면접 랭그래프 워크플로우 정보 조회"""
    try:
        from agent.agents.ai_interview_workflow import ai_interview_workflow
        from agent.agents.interview_question_workflow import interview_workflow
        
        # 워크플로우 구조 정보
        ai_interview_nodes = list(ai_interview_workflow.nodes.keys())
        interview_question_nodes = list(interview_workflow.nodes.keys())
        
        return {
            "ai_interview_workflow": {
                "name": "AI 면접 평가 워크플로우",
                "description": "실시간 AI 면접 분석 및 평가를 위한 워크플로우",
                "nodes": ai_interview_nodes,
                "node_count": len(ai_interview_nodes),
                "entry_point": "initialize_session",
                "end_point": "calculate_final_score"
            },
            "interview_question_workflow": {
                "name": "면접 질문 생성 워크플로우",
                "description": "이력서 기반 맞춤형 면접 질문 생성을 위한 워크플로우",
                "nodes": interview_question_nodes,
                "node_count": len(interview_question_nodes),
                "entry_point": "analyze_requirements",
                "end_point": "result_integrator"
            },
            "total_workflows": 2,
            "status": "available"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        }

@router.post("/langgraph/test-workflow")
async def test_langgraph_workflow(
    workflow_type: str = "interview_question",
    test_data: Dict[str, Any] = None
):
    """면접 랭그래프 워크플로우 테스트"""
    try:
        if workflow_type == "interview_question":
            from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
            
            # 테스트 데이터
            test_data = test_data or {
                "resume_text": "테스트 이력서 내용입니다. 3년간 개발 경험이 있으며, Java와 Python을 주로 사용합니다.",
                "job_info": "백엔드 개발자 포지션입니다. Java, Spring Boot, MySQL 경험이 필요합니다.",
                "company_name": "테스트 회사",
                "applicant_name": "테스트 지원자",
                "interview_type": "general"
            }
            
            result = generate_comprehensive_interview_questions(**test_data)
            
        elif workflow_type == "ai_interview":
            from agent.agents.ai_interview_workflow import run_ai_interview
            
            # 테스트 데이터
            test_data = test_data or {
                "session_id": f"test_session_{datetime.now().timestamp()}",
                "job_info": "테스트 직무 정보",
                "audio_data": {"transcript": "테스트 응답입니다."},
                "behavior_data": {"eye_contact": 7, "posture": 8},
                "game_data": {"focus_score": 8, "response_time_score": 7}
            }
            
            result = run_ai_interview(**test_data)
            
        else:
            return {
                "success": False,
                "error": f"지원하지 않는 워크플로우 타입: {workflow_type}"
            }
        
        return {
            "success": True,
            "workflow_type": workflow_type,
            "test_result": result,
            "tested_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "workflow_type": workflow_type
        }

@router.post("/generate-ai-interview-questions")
async def generate_ai_interview_questions(
    job_info: str = "",
    interview_type: str = "AI_INTERVIEW",
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """AI 면접용 시나리오 기반 질문 생성"""
    
    try:
        # 시나리오 기반 질문들 (이력서 무관)
        scenario_questions = {
            "introduction": [
                "안녕하세요! 자기소개를 해주세요.",
                "우리 회사에 지원한 이유는 무엇인가요?",
                "이 직무에 관심을 갖게 된 계기는 무엇인가요?",
                "본인의 강점과 약점은 무엇인가요?",
                "앞으로의 커리어 계획은 어떻게 되시나요?"
            ],
            "situation_judgment": [
                "팀 프로젝트에서 의견이 맞지 않는 상황이 발생했다면 어떻게 대처하시겠습니까?",
                "업무 중 예상치 못한 문제가 발생했을 때 어떻게 해결하시겠습니까?",
                "스트레스 상황에서 어떻게 스스로를 관리하시나요?",
                "갑작스러운 업무 변경이 있을 때 어떻게 대응하시겠습니까?",
                "업무와 개인생활의 균형을 어떻게 맞추시겠습니까?"
            ],
            "problem_solving": [
                "복잡한 문제를 해결할 때 어떤 과정을 거치시나요?",
                "한정된 시간과 자원으로 목표를 달성해야 한다면 어떻게 하시겠습니까?",
                "새로운 기술이나 방법을 배워야 할 때 어떻게 접근하시나요?",
                "실패했던 경험이 있다면 어떻게 극복하셨나요?",
                "창의적인 해결책이 필요한 상황을 어떻게 접근하시나요?"
            ],
            "teamwork": [
                "팀워크가 중요한 이유는 무엇이라고 생각하시나요?",
                "팀원과 갈등이 생겼을 때 어떻게 해결하시겠습니까?",
                "팀의 성과를 높이기 위해 본인이 할 수 있는 일은 무엇인가요?",
                "다양한 성향의 팀원들과 어떻게 협업하시겠습니까?",
                "팀 리더가 된다면 어떤 방식으로 팀을 이끌어가시겠습니까?"
            ],
            "communication": [
                "복잡한 내용을 상대방에게 설명할 때 어떤 방법을 사용하시나요?",
                "의견이 다른 사람과 어떻게 소통하시겠습니까?",
                "피드백을 받았을 때 어떻게 반응하시나요?",
                "상대방의 말을 잘 듣는 것의 중요성에 대해 어떻게 생각하시나요?",
                "효과적인 커뮤니케이션을 위해 본인이 노력하는 점은 무엇인가요?"
            ],
            "adaptability": [
                "변화하는 환경에 어떻게 적응하시나요?",
                "새로운 도전을 두려워하지 않는 이유는 무엇인가요?",
                "실패를 두려워하지 않는 이유는 무엇인가요?",
                "배움에 대한 본인의 태도는 어떠한가요?",
                "미래에 대한 불확실성을 어떻게 받아들이시나요?"
            ]
        }
        
        # 질문을 DB에 저장
        saved_questions = []
        question_id = 1
        
        for category, questions in scenario_questions.items():
            for question_text in questions:
                # DB에 저장
                db_question = InterviewQuestion(
                    type=QuestionType.AI_INTERVIEW,
                    question_text=question_text,
                    category=category,
                    difficulty="medium",
                    job_post_id=None,  # AI 면접은 특정 공고와 무관
                    applicant_id=None,  # 개별 지원자와 무관
                    created_by="ai_system"
                )
                
                db.add(db_question)
                db.commit()
                db.refresh(db_question)
                
                saved_questions.append({
                    "id": db_question.id,
                    "question_text": question_text,
                    "category": category,
                    "type": "AI_INTERVIEW"
                })
                
                question_id += 1
        
        return {
            "success": True,
            "message": "AI 면접 질문 생성 완료",
            "total_questions": len(saved_questions),
            "questions_by_category": scenario_questions,
            "saved_questions": saved_questions
        }
        
    except Exception as e:
        logging.error(f"AI 면접 질문 생성 오류: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"질문 생성 중 오류가 발생했습니다: {str(e)}")

@router.get("/ai-interview-questions")
async def get_ai_interview_questions(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """AI 면접 질문 조회"""
    
    try:
        query = db.query(InterviewQuestion).filter(
            InterviewQuestion.type == QuestionType.AI_INTERVIEW
        )
        
        if category:
            query = query.filter(InterviewQuestion.category == category)
        
        questions = query.all()
        
        # 카테고리별로 그룹화
        questions_by_category = {}
        for question in questions:
            category_name = question.category or "general"
            if category_name not in questions_by_category:
                questions_by_category[category_name] = []
            
            questions_by_category[category_name].append({
                "id": question.id,
                "question_text": question.question_text,
                "category": category_name,
                "difficulty": question.difficulty
            })
        
        return {
            "success": True,
            "total_questions": len(questions),
            "questions_by_category": questions_by_category,
            "categories": list(questions_by_category.keys())
        }
        
    except Exception as e:
        logging.error(f"AI 면접 질문 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=f"질문 조회 중 오류가 발생했습니다: {str(e)}")

@router.delete("/ai-interview-questions")
async def clear_ai_interview_questions(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """AI 면접 질문 전체 삭제"""
    
    try:
        deleted_count = db.query(InterviewQuestion).filter(
            InterviewQuestion.type == QuestionType.AI_INTERVIEW
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"{deleted_count}개의 AI 면접 질문이 삭제되었습니다."
        }
        
    except Exception as e:
        logging.error(f"AI 면접 질문 삭제 오류: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"질문 삭제 중 오류가 발생했습니다: {str(e)}")

@router.get("/ai-interview-scenarios")
async def get_ai_interview_scenarios() -> Dict[str, Any]:
    """AI 면접 시나리오 정보 조회"""
    
    scenarios = {
        "introduction": {
            "name": "자기소개",
            "description": "지원자의 기본적인 자기소개와 동기 파악",
            "duration": "3-5분",
            "focus": "의사소통 능력, 자신감, 명확성"
        },
        "situation_judgment": {
            "name": "상황판단",
            "description": "실무에서 발생할 수 있는 다양한 상황에 대한 대응 능력 평가",
            "duration": "5-7분",
            "focus": "문제해결 능력, 판단력, 스트레스 관리"
        },
        "problem_solving": {
            "name": "문제해결",
            "description": "복잡한 문제를 체계적으로 해결하는 능력 평가",
            "duration": "5-7분",
            "focus": "논리적 사고, 창의성, 학습 능력"
        },
        "teamwork": {
            "name": "팀워크",
            "description": "팀 환경에서의 협업 능력과 리더십 평가",
            "duration": "4-6분",
            "focus": "협업 능력, 갈등 해결, 리더십"
        },
        "communication": {
            "name": "커뮤니케이션",
            "description": "효과적인 의사소통 능력과 피드백 수용 능력 평가",
            "duration": "4-6분",
            "focus": "설명 능력, 경청 능력, 피드백 수용"
        },
        "adaptability": {
            "name": "적응력",
            "description": "변화하는 환경에 대한 적응 능력과 학습 의지 평가",
            "duration": "3-5분",
            "focus": "적응력, 학습 의지, 도전 정신"
        }
    }
    
    return {
        "success": True,
        "scenarios": scenarios,
        "total_scenarios": len(scenarios)
    } 

@router.post("/scenarios")
async def generate_scenario_questions(
    job_post_id: int,
    applicant_id: int,
    db: Session = Depends(get_db)
):
    """AI 면접을 위한 시나리오 질문 생성 (하이브리드 방식)"""
    try:
        # 지원자 정보 조회
        application = db.query(Application).filter(Application.id == applicant_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="채용공고를 찾을 수 없습니다")
        
        # 1. DB에서 기존 질문 조회 (공고별로 미리 생성된 질문)
        existing_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.job_post_id == job_post_id,
            InterviewQuestion.type == QuestionType.AI_INTERVIEW
        ).all()
        
        if existing_questions:
            # 기존 질문이 있으면 랜덤 선택
            import random
            selected_questions = random.sample(existing_questions, min(10, len(existing_questions)))
            
            scenarios = []
            for i, question in enumerate(selected_questions, 1):
                scenarios.append({
                    "id": i,
                    "scenario": question.question_text,
                    "question": question.question_text,
                    "category": question.category or "general",
                    "time_limit": 120,
                    "difficulty": question.difficulty or "medium",
                    "evaluation_focus": ["job_fit", "communication", "problem_solving"],
                    "source": "stored"
                })
            
            return {
                "success": True,
                "scenarios": scenarios,
                "total_count": len(scenarios),
                "generated_by": "stored_random"
            }
        
        # 2. 기존 질문이 없으면 새로 생성 (일반 7개 + 직무별 3개 + 게임 테스트)
        try:
            # 1. 일반 질문 7개 선택
            general_questions = get_random_general_questions(count=7)
            
            # 2. 직무별 AI 질문 3개 생성
            job_title = job_post.title or "개발자"
            job_description = job_post.description or "소프트웨어 개발"
            company_name = job_post.company.name if job_post.company else "회사"
            
            # 필요 역량 추출
            required_skills = []
            if job_description:
                skill_keywords = ["Java", "Python", "JavaScript", "React", "Spring", "Django", "Node.js", "SQL", "AWS", "Docker"]
                for skill in skill_keywords:
                    if skill.lower() in job_description.lower():
                        required_skills.append(skill)
            
            if not required_skills:
                required_skills = ["프로그래밍", "문제해결", "협업"]
            
            # AI 질문 생성 (3개만) - Agent 서비스 연동 필요
            # question_set = await generate_ai_scenario_questions(
            #     job_title=job_title,
            #     job_description=job_description,
            #     company_name=company_name,
            #     required_skills=required_skills,
            #     experience_level="mid-level"
            # )
            
            # 임시로 기본 직무 질문 사용
            question_set = {
                "scenarios": [
                    {
                        "id": 1,
                        "scenario": "고객이 갑작스럽게 요구사항을 변경했을 때, 어떻게 대응하시겠습니까?",
                        "question": "이런 상황에서 본인의 대응 방식을 구체적으로 설명해주세요.",
                        "category": "job_specific",
                        "time_limit": 120,
                        "difficulty": "medium",
                        "evaluation_focus": ["job_fit", "problem_solving", "communication"]
                    },
                    {
                        "id": 2,
                        "scenario": "팀원과 의견이 충돌하는 상황에서, 어떻게 해결하시겠습니까?",
                        "question": "협업 과정에서 발생할 수 있는 갈등 해결 방법을 설명해주세요.",
                        "category": "job_specific",
                        "time_limit": 120,
                        "difficulty": "medium",
                        "evaluation_focus": ["teamwork", "communication", "psychological_traits"]
                    },
                    {
                        "id": 3,
                        "scenario": "업무 중 예상치 못한 문제가 발생했을 때, 어떻게 해결하시겠습니까?",
                        "question": "문제 해결 과정에서 본인의 접근 방식을 설명해주세요.",
                        "category": "job_specific",
                        "time_limit": 120,
                        "difficulty": "hard",
                        "evaluation_focus": ["job_fit", "cognitive_ability", "problem_solving"]
                    }
                ],
                "total_count": 3,
                "job_fit_score": 7.5
            }
            
            job_specific_questions = []
            for i, scenario in enumerate(question_set.scenarios[:3], 1):
                job_specific_questions.append({
                    "id": f"ai_{i}",
                    "scenario": scenario.scenario,
                    "question": scenario.question,
                    "category": "job_specific",
                    "time_limit": scenario.time_limit,
                    "difficulty": scenario.difficulty,
                    "evaluation_focus": scenario.evaluation_focus,
                    "source": "ai"
                })
            
            # 3. 게임 테스트 선택
            game_test = get_random_game_test()
            
            # 4. 질문 순서 구성 (일반 질문 4개 + 게임 테스트 + 일반 질문 3개 + 직무 질문 3개)
            combined_scenarios = []
            
            # 일반 질문 4개
            for i, question in enumerate(general_questions[:4], 1):
                combined_scenarios.append({
                    "id": i,
                    "scenario": question["question"],
                    "question": question["question"],
                    "category": question["category"],
                    "time_limit": question["time_limit"],
                    "difficulty": question["difficulty"],
                    "evaluation_focus": question["evaluation_focus"],
                    "source": "general"
                })
            
            # 게임 테스트 삽입
            combined_scenarios.append({
                "id": 5,
                "type": "game_test",
                "game_data": game_test,
                "category": "game_test",
                "source": "game"
            })
            
            # 나머지 일반 질문 3개
            for i, question in enumerate(general_questions[4:7], 6):
                combined_scenarios.append({
                    "id": i,
                    "scenario": question["question"],
                    "question": question["question"],
                    "category": question["category"],
                    "time_limit": question["time_limit"],
                    "difficulty": question["difficulty"],
                    "evaluation_focus": question["evaluation_focus"],
                    "source": "general"
                })
            
            # 직무별 질문 3개
            for i, question in enumerate(job_specific_questions, 9):
                combined_scenarios.append({
                    "id": i,
                    "scenario": question["scenario"],
                    "question": question["question"],
                    "category": question["category"],
                    "time_limit": question["time_limit"],
                    "difficulty": question["difficulty"],
                    "evaluation_focus": question["evaluation_focus"],
                    "source": "ai"
                })
            
            # DB에 저장 (게임 테스트 제외)
            for scenario in combined_scenarios:
                if "type" not in scenario or scenario["type"] != "game_test":
                    db_question = InterviewQuestion(
                        type=QuestionType.AI_INTERVIEW,
                        question_text=scenario["question"],
                        category=scenario["category"],
                        difficulty=scenario["difficulty"],
                        job_post_id=job_post_id,
                        applicant_id=None,  # 공고별 공통 질문
                        created_by="ai_system"
                    )
                    db.add(db_question)
            
            db.commit()
            
            return {
                "success": True,
                "scenarios": combined_scenarios,
                "total_count": len(combined_scenarios),
                "breakdown": {
                    "general_questions": 7,
                    "job_specific_questions": 3,
                    "game_test": 1
                },
                "game_test": game_test,
                "generated_by": "hybrid_optimized"
            }
            
        except Exception as ai_error:
            logging.warning(f"AI 질문 생성 실패, 기본 질문 사용: {ai_error}")
            # AI 생성 실패 시 기본 질문 사용
            scenarios = [
                {
                    "id": 1,
                    "scenario": "고객이 갑작스럽게 요구사항을 변경했을 때, 어떻게 대응하시겠습니까?",
                    "question": "이런 상황에서 본인의 대응 방식을 구체적으로 설명해주세요.",
                    "category": "situation_handling",
                    "time_limit": 120,
                    "difficulty": "medium",
                    "evaluation_focus": ["job_fit", "problem_solving", "communication"],
                    "source": "fallback"
                },
                {
                    "id": 2,
                    "scenario": "팀원과 의견이 충돌하는 상황에서, 어떻게 해결하시겠습니까?",
                    "question": "협업 과정에서 발생할 수 있는 갈등 해결 방법을 설명해주세요.",
                    "category": "teamwork",
                    "time_limit": 120,
                    "difficulty": "medium",
                    "evaluation_focus": ["teamwork", "communication", "psychological_traits"],
                    "source": "fallback"
                },
                {
                    "id": 3,
                    "scenario": "업무 중 예상치 못한 문제가 발생했을 때, 어떻게 해결하시겠습니까?",
                    "question": "문제 해결 과정에서 본인의 접근 방식을 설명해주세요.",
                    "category": "problem_solving",
                    "time_limit": 120,
                    "difficulty": "hard",
                    "evaluation_focus": ["job_fit", "cognitive_ability", "problem_solving"],
                    "source": "fallback"
                },
                {
                    "id": 4,
                    "scenario": "새로운 기술을 배워야 하는 상황에서, 어떻게 학습하시겠습니까?",
                    "question": "효율적인 학습 방법과 지속적인 성장 방안을 설명해주세요.",
                    "category": "learning",
                    "time_limit": 120,
                    "difficulty": "easy",
                    "evaluation_focus": ["learning", "cognitive_ability", "psychological_traits"],
                    "source": "fallback"
                },
                {
                    "id": 5,
                    "scenario": "업무량이 급증했을 때, 어떻게 우선순위를 정하시겠습니까?",
                    "question": "시간 관리와 업무 효율성을 높이는 방법을 설명해주세요.",
                    "category": "time_management",
                    "time_limit": 120,
                    "difficulty": "medium",
                    "evaluation_focus": ["time_management", "job_fit", "cognitive_ability"],
                    "source": "fallback"
                }
            ]
            
            return {
                "success": True,
                "scenarios": scenarios,
                "total_count": len(scenarios),
                "generated_by": "fallback"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시나리오 질문 생성 실패: {str(e)}")

@router.post("/start-interview")
async def start_ai_interview(
    job_post_id: int,
    applicant_id: int,
    db: Session = Depends(get_db)
):
    """AI 면접 시작"""
    try:
        # 지원자 정보 조회
        application = db.query(Application).filter(Application.id == applicant_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="채용공고를 찾을 수 없습니다")
        
        # AI 면접 워크플로우 시작
        interview_data = {
            "job_post_id": job_post_id,
            "applicant_id": applicant_id,
            "company_name": job_post.company.name if job_post.company else "",
            "job_title": job_post.title,
            "applicant_name": application.applicant.name if application.applicant else "",
            "start_time": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "interview_id": f"ai_interview_{job_post_id}_{applicant_id}",
            "data": interview_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 면접 시작 실패: {str(e)}")

@router.post("/evaluate")
async def evaluate_response(
    response_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """응답 평가"""
    try:
        # AI 면접 워크플로우를 통한 평가
        evaluation_result = await run_ai_interview_workflow(
            response_text=response_data.get("response", ""),
            audio_data=response_data.get("audio", None),
            video_data=response_data.get("video", None),
            question_context=response_data.get("question_context", ""),
            job_context=response_data.get("job_context", "")
        )
        
        return {
            "success": True,
            "evaluation": evaluation_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"응답 평가 실패: {str(e)}")

@router.post("/game-test")
async def start_game_test(
    game_type: str,
    job_post_id: int,
    applicant_id: int
):
    """게임형 테스트 시작"""
    try:
        games = {
            "memory": {
                "title": "기억력 테스트",
                "description": "순서대로 나타나는 숫자를 기억하여 입력하세요.",
                "instructions": "화면에 나타나는 숫자를 순서대로 기억하고 입력하세요. 레벨이 올라갈수록 숫자가 늘어납니다.",
                "type": "memory",
                "max_level": 10
            },
            "reaction": {
                "title": "반응속도 테스트",
                "description": "화면이 변할 때 빠르게 클릭하세요.",
                "instructions": "화면 색상이 변하는 순간 빠르게 클릭하세요. 반응 시간을 측정합니다.",
                "type": "reaction",
                "max_trials": 10
            },
            "pattern": {
                "title": "패턴 인식 테스트",
                "description": "규칙을 찾아 다음 패턴을 예측하세요.",
                "instructions": "주어진 패턴의 규칙을 찾아 다음에 올 패턴을 예측하세요.",
                "type": "pattern",
                "max_patterns": 8
            }
        }
        
        if game_type not in games:
            raise HTTPException(status_code=400, detail="지원하지 않는 게임 타입입니다")
        
        return {
            "success": True,
            "game": games[game_type]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"게임 테스트 시작 실패: {str(e)}")

@router.post("/game-score")
async def submit_game_score(
    game_type: str,
    score: float,
    job_post_id: int,
    applicant_id: int
):
    """게임 점수 제출"""
    try:
        # 게임 점수를 평가 메트릭에 반영
        score_mapping = {
            "memory": "cognitive_ability",
            "reaction": "cognitive_ability", 
            "pattern": "cognitive_ability"
        }
        
        metric = score_mapping.get(game_type, "cognitive_ability")
        
        return {
            "success": True,
            "metric": metric,
            "score": score,
            "message": f"{game_type} 게임 점수가 {metric}에 반영되었습니다"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"게임 점수 제출 실패: {str(e)}")

@router.websocket("/ws/ai-interview/{job_post_id}/{applicant_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    job_post_id: int,
    applicant_id: int
):
    """AI 면접 WebSocket 엔드포인트"""
    client_id = f"{job_post_id}_{applicant_id}"
    
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # 클라이언트로부터 메시지 수신
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 메시지 타입에 따른 처리
            if message["type"] == "interview_start":
                # 면접 시작
                await manager.send_personal_message(
                    json.dumps({
                        "type": "interview_started",
                        "message": "AI 면접이 시작되었습니다"
                    }),
                    client_id
                )
                
            elif message["type"] == "response_submitted":
                # 응답 제출 시 실시간 평가
                evaluation_result = await run_ai_interview_workflow(
                    response_text=message.get("response", ""),
                    audio_data=message.get("audio", None),
                    video_data=message.get("video", None),
                    question_context=message.get("question_context", ""),
                    job_context=message.get("job_context", "")
                )
                
                # 평가 결과 전송
                await manager.send_personal_message(
                    json.dumps({
                        "type": "evaluation_update",
                        "evaluation": evaluation_result
                    }),
                    client_id
                )
                
            elif message["type"] == "question_timer":
                # 질문 타이머 업데이트
                await manager.send_personal_message(
                    json.dumps({
                        "type": "question_timer",
                        "time": message.get("time", 0)
                    }),
                    client_id
                )
                
            elif message["type"] == "game_test_start":
                # 게임 테스트 시작
                game_data = {
                    "title": "기억력 테스트",
                    "description": "순서대로 나타나는 숫자를 기억하여 입력하세요.",
                    "instructions": "화면에 나타나는 숫자를 순서대로 기억하고 입력하세요.",
                    "type": "memory"
                }
                
                await manager.send_personal_message(
                    json.dumps({
                        "type": "game_test_start",
                        "game": game_data
                    }),
                    client_id
                )
                
            elif message["type"] == "game_score_update":
                # 게임 점수 업데이트
                await manager.send_personal_message(
                    json.dumps({
                        "type": "game_score_update",
                        "score": message.get("score", 0)
                    }),
                    client_id
                )
                
            elif message["type"] == "interview_complete":
                # 면접 완료
                await manager.send_personal_message(
                    json.dumps({
                        "type": "interview_complete",
                        "message": "AI 면접이 완료되었습니다"
                    }),
                    client_id
                )
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket 오류: {e}")
        manager.disconnect(client_id)

@router.post("/follow-up-questions")
async def generate_follow_up_questions_api(
    original_question: str,
    candidate_response: str,
    evaluation_focus: List[str],
    db: Session = Depends(get_db)
):
    """후속 질문 생성 API"""
    try:
        # AI 기반 후속 질문 생성 - Agent 서비스 연동 필요
        # follow_up_questions = await generate_follow_up_questions(
        #     original_question=original_question,
        #     candidate_response=candidate_response,
        #     evaluation_focus=evaluation_focus
        # )
        
        # 임시로 기본 후속 질문 사용
        follow_up_questions = [
            "구체적인 예시를 들어 설명해주세요.",
            "그 상황에서 본인의 역할은 무엇이었나요?",
            "결과적으로 어떤 성과를 얻었나요?"
        ]
        
        return {
            "success": True,
            "follow_up_questions": follow_up_questions,
            "total_count": len(follow_up_questions)
        }
        
    except Exception as e:
        logging.error(f"후속 질문 생성 실패: {e}")
        # 기본 후속 질문 반환
        default_questions = [
            "구체적인 예시를 들어 설명해주세요.",
            "그 상황에서 본인의 역할은 무엇이었나요?",
            "결과적으로 어떤 성과를 얻었나요?"
        ]
        
        return {
            "success": True,
            "follow_up_questions": default_questions,
            "total_count": len(default_questions),
            "generated_by": "fallback"
        }

@router.get("/status/{job_post_id}/{applicant_id}")
async def get_interview_status(
    job_post_id: int,
    applicant_id: int,
    db: Session = Depends(get_db)
):
    """AI 면접 상태 조회"""
    try:
        # 지원자 정보 조회
        application = db.query(Application).filter(Application.id == applicant_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="지원자를 찾을 수 없습니다")
        
        # 면접 상태 반환
        return {
            "success": True,
            "status": "ready",  # ready, in_progress, completed
            "applicant": {
                "id": application.id,
                "name": application.applicant.name if application.applicant else "",
                "email": application.applicant.email if application.applicant else ""
            },
            "job_post_id": job_post_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"면접 상태 조회 실패: {str(e)}") 