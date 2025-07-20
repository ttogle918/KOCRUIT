#!/usr/bin/env python3
"""
AI 면접용 질문 생성 API
시나리오 기반 질문 생성 (이력서 무관)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
import json
import logging

from ...core.database import get_db
from ...models.interview_question import InterviewQuestion, QuestionType
from ...schemas.interview_question import InterviewQuestionCreate

router = APIRouter()

@router.post("/generate-ai-interview-questions")
async def generate_ai_interview_questions(
    job_info: str = "",
    interview_type: str = "ai_interview",
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