#!/usr/bin/env python3
"""
AI 면접 전용 LangGraph 워크플로우
실시간 분석과 평가 중심으로 설계
"""

from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
import json
import logging
from datetime import datetime

# LLM 초기화
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.1,
    api_key=os.getenv("OPENAI_API_KEY")
)

def initialize_ai_interview_session(state: Dict[str, Any]) -> Dict[str, Any]:
    """AI 면접 세션 초기화"""
    try:
        session_id = state.get("session_id", f"session_{datetime.now().timestamp()}")
        job_info = state.get("job_info", "")
        
        # AI 면접 세션 초기화
        session_data = {
            "session_id": session_id,
            "start_time": datetime.now().isoformat(),
            "job_info": job_info,
            "evaluation_metrics": {
                "language_ability": {"logic": 0, "expression": 0, "total": 0},
                "non_verbal_behavior": {"eye_contact": 0, "facial_expression": 0, "posture": 0, "tone": 0, "total": 0},
                "psychological_traits": {"extraversion": 0, "openness": 0, "conscientiousness": 0, "agreeableness": 0, "neuroticism": 0, "total": 0},
                "cognitive_ability": {"focus": 0, "quick_response": 0, "memory": 0, "total": 0},
                "job_fit": {"situation_judgment": 0, "problem_solving": 0, "total": 0},
                "interview_reliability": {"attitude": 0, "authenticity": 0, "consistency": 0, "total": 0}
            },
            "real_time_data": {
                "transcripts": [],
                "audio_analysis": [],
                "behavior_analysis": [],
                "game_test_results": []
            },
            "current_phase": "introduction",
            "total_score": 0
        }
        
        return {
            **state,
            "session_data": session_data,
            "next": "generate_scenario_questions"
        }
    except Exception as e:
        logging.error(f"AI 면접 세션 초기화 오류: {e}")
        return {
            **state,
            "error": f"세션 초기화 오류: {str(e)}",
            "next": END
        }

def generate_scenario_questions(state: Dict[str, Any]) -> Dict[str, Any]:
    """시나리오 기반 질문 생성 (이력서 무관)"""
    try:
        job_info = state.get("job_info", "")
        
        # 직무 적합도 평가를 위한 시나리오 질문들
        scenario_questions = {
            "introduction": [
                "안녕하세요! 자기소개를 해주세요.",
                "우리 회사에 지원한 이유는 무엇인가요?",
                "이 직무에 관심을 갖게 된 계기는 무엇인가요?"
            ],
            "situation_judgment": [
                "팀 프로젝트에서 의견이 맞지 않는 상황이 발생했다면 어떻게 대처하시겠습니까?",
                "업무 중 예상치 못한 문제가 발생했을 때 어떻게 해결하시겠습니까?",
                "스트레스 상황에서 어떻게 스스로를 관리하시나요?"
            ],
            "problem_solving": [
                "복잡한 문제를 해결할 때 어떤 과정을 거치시나요?",
                "한정된 시간과 자원으로 목표를 달성해야 한다면 어떻게 하시겠습니까?",
                "새로운 기술이나 방법을 배워야 할 때 어떻게 접근하시나요?"
            ],
            "teamwork": [
                "팀워크가 중요한 이유는 무엇이라고 생각하시나요?",
                "팀원과 갈등이 생겼을 때 어떻게 해결하시겠습니까?",
                "팀의 성과를 높이기 위해 본인이 할 수 있는 일은 무엇인가요?"
            ]
        }
        
        return {
            **state,
            "scenario_questions": scenario_questions,
            "next": "start_real_time_analysis"
        }
    except Exception as e:
        logging.error(f"시나리오 질문 생성 오류: {e}")
        return {
            **state,
            "error": f"질문 생성 오류: {str(e)}",
            "next": END
        }

def start_real_time_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """실시간 분석 시작"""
    try:
        session_data = state.get("session_data", {})
        session_data["current_phase"] = "real_time_analysis"
        session_data["analysis_start_time"] = datetime.now().isoformat()
        
        return {
            **state,
            "session_data": session_data,
            "next": "process_audio_analysis"
        }
    except Exception as e:
        logging.error(f"실시간 분석 시작 오류: {e}")
        return {
            **state,
            "error": f"분석 시작 오류: {str(e)}",
            "next": END
        }

def process_audio_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """오디오 분석 처리 (실시간)"""
    try:
        audio_data = state.get("audio_data", {})
        session_data = state.get("session_data", {})
        
        if not audio_data:
            return {
                **state,
                "next": "process_behavior_analysis"
            }
        
        # 언어능력 평가
        language_score = evaluate_language_ability(audio_data.get("transcript", ""))
        session_data["evaluation_metrics"]["language_ability"] = language_score
        
        # 음성 특성 분석
        voice_analysis = analyze_voice_characteristics(audio_data.get("audio_features", {}))
        session_data["real_time_data"]["audio_analysis"].append(voice_analysis)
        
        return {
            **state,
            "session_data": session_data,
            "next": "process_behavior_analysis"
        }
    except Exception as e:
        logging.error(f"오디오 분석 오류: {e}")
        return {
            **state,
            "next": "process_behavior_analysis"
        }

def process_behavior_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """행동 분석 처리 (실시간)"""
    try:
        behavior_data = state.get("behavior_data", {})
        session_data = state.get("session_data", {})
        
        if not behavior_data:
            return {
                **state,
                "next": "process_game_test"
            }
        
        # 비언어행동 평가
        non_verbal_score = evaluate_non_verbal_behavior(behavior_data)
        session_data["evaluation_metrics"]["non_verbal_behavior"] = non_verbal_score
        
        # 심리 성향 분석
        psychological_score = analyze_psychological_traits(behavior_data)
        session_data["evaluation_metrics"]["psychological_traits"] = psychological_score
        
        session_data["real_time_data"]["behavior_analysis"].append(behavior_data)
        
        return {
            **state,
            "session_data": session_data,
            "next": "process_game_test"
        }
    except Exception as e:
        logging.error(f"행동 분석 오류: {e}")
        return {
            **state,
            "next": "process_game_test"
        }

def process_game_test(state: Dict[str, Any]) -> Dict[str, Any]:
    """게임형 테스트 처리"""
    try:
        game_data = state.get("game_data", {})
        session_data = state.get("session_data", {})
        
        if not game_data:
            return {
                **state,
                "next": "calculate_final_score"
            }
        
        # 인지 능력 평가
        cognitive_score = evaluate_cognitive_ability(game_data)
        session_data["evaluation_metrics"]["cognitive_ability"] = cognitive_score
        
        # 직무 적합도 평가
        job_fit_score = evaluate_job_fit(game_data, session_data.get("real_time_data", {}))
        session_data["evaluation_metrics"]["job_fit"] = job_fit_score
        
        session_data["real_time_data"]["game_test_results"].append(game_data)
        
        return {
            **state,
            "session_data": session_data,
            "next": "calculate_final_score"
        }
    except Exception as e:
        logging.error(f"게임 테스트 오류: {e}")
        return {
            **state,
            "next": "calculate_final_score"
        }

def calculate_final_score(state: Dict[str, Any]) -> Dict[str, Any]:
    """최종 점수 계산"""
    try:
        session_data = state.get("session_data", {})
        metrics = session_data.get("evaluation_metrics", {})
        
        # 각 영역별 점수 계산
        total_score = 0
        area_scores = {}
        
        for area, scores in metrics.items():
            if isinstance(scores, dict) and "total" in scores:
                area_total = scores["total"]
                area_scores[area] = area_total
                total_score += area_total
        
        # 면접 신뢰도 계산
        reliability_score = calculate_interview_reliability(session_data.get("real_time_data", {}))
        metrics["interview_reliability"] = reliability_score
        area_scores["interview_reliability"] = reliability_score["total"]
        total_score += reliability_score["total"]
        
        # 최종 결과
        final_result = {
            "session_id": session_data.get("session_id"),
            "total_score": total_score,
            "area_scores": area_scores,
            "evaluation_metrics": metrics,
            "real_time_data": session_data.get("real_time_data"),
            "interview_report": generate_interview_report(area_scores, metrics),
            "completed_at": datetime.now().isoformat()
        }
        
        return {
            **state,
            "final_result": final_result,
            "next": END
        }
    except Exception as e:
        logging.error(f"최종 점수 계산 오류: {e}")
        return {
            **state,
            "error": f"점수 계산 오류: {str(e)}",
            "next": END
        }

# 평가 함수들
def evaluate_language_ability(transcript: str) -> Dict[str, float]:
    """언어능력 평가"""
    try:
        # 간단한 평가 기준
        words = transcript.split()
        sentences = transcript.split('.')
        
        logic_score = min(len(sentences) * 2, 10)  # 문장 수 기반
        expression_score = min(len(words) * 0.5, 10)  # 단어 수 기반
        
        return {
            "logic": logic_score,
            "expression": expression_score,
            "total": (logic_score + expression_score) / 2
        }
    except Exception:
        return {"logic": 0, "expression": 0, "total": 0}

def analyze_voice_characteristics(audio_features: Dict) -> Dict[str, Any]:
    """음성 특성 분석"""
    return {
        "volume": audio_features.get("volume", 0),
        "pitch": audio_features.get("pitch", 0),
        "speech_rate": audio_features.get("speech_rate", 0),
        "clarity": audio_features.get("clarity", 0)
    }

def evaluate_non_verbal_behavior(behavior_data: Dict) -> Dict[str, float]:
    """비언어행동 평가"""
    return {
        "eye_contact": behavior_data.get("eye_contact", 5),
        "facial_expression": behavior_data.get("facial_expression", 5),
        "posture": behavior_data.get("posture", 5),
        "tone": behavior_data.get("tone", 5),
        "total": sum([
            behavior_data.get("eye_contact", 5),
            behavior_data.get("facial_expression", 5),
            behavior_data.get("posture", 5),
            behavior_data.get("tone", 5)
        ]) / 4
    }

def analyze_psychological_traits(behavior_data: Dict) -> Dict[str, float]:
    """심리 성향 분석 (Big5 기반)"""
    return {
        "extraversion": behavior_data.get("extraversion", 5),
        "openness": behavior_data.get("openness", 5),
        "conscientiousness": behavior_data.get("conscientiousness", 5),
        "agreeableness": behavior_data.get("agreeableness", 5),
        "neuroticism": behavior_data.get("neuroticism", 5),
        "total": sum([
            behavior_data.get("extraversion", 5),
            behavior_data.get("openness", 5),
            behavior_data.get("conscientiousness", 5),
            behavior_data.get("agreeableness", 5),
            behavior_data.get("neuroticism", 5)
        ]) / 5
    }

def evaluate_cognitive_ability(game_data: Dict) -> Dict[str, float]:
    """인지 능력 평가"""
    return {
        "focus": game_data.get("focus_score", 5),
        "quick_response": game_data.get("response_time_score", 5),
        "memory": game_data.get("memory_score", 5),
        "total": sum([
            game_data.get("focus_score", 5),
            game_data.get("response_time_score", 5),
            game_data.get("memory_score", 5)
        ]) / 3
    }

def evaluate_job_fit(game_data: Dict, real_time_data: Dict) -> Dict[str, float]:
    """직무 적합도 평가"""
    return {
        "situation_judgment": game_data.get("situation_score", 5),
        "problem_solving": game_data.get("problem_solving_score", 5),
        "total": sum([
            game_data.get("situation_score", 5),
            game_data.get("problem_solving_score", 5)
        ]) / 2
    }

def calculate_interview_reliability(real_time_data: Dict) -> Dict[str, float]:
    """면접 신뢰도 계산"""
    return {
        "attitude": 7,  # 기본값
        "authenticity": 7,
        "consistency": 7,
        "total": 7
    }

def generate_interview_report(area_scores: Dict, metrics: Dict) -> Dict[str, Any]:
    """면접 리포트 생성"""
    return {
        "summary": "AI 면접 평가 완료",
        "strengths": ["긍정적인 태도", "명확한 의사소통"],
        "weaknesses": ["개선 필요 영역"],
        "recommendations": ["추가 면접 권장"]
    }

def build_ai_interview_workflow() -> StateGraph:
    """AI 면접 워크플로우 그래프 생성"""
    workflow = StateGraph(Dict[str, Any])
    
    # 노드 추가
    workflow.add_node("initialize_session", initialize_ai_interview_session)
    workflow.add_node("generate_scenario_questions", generate_scenario_questions)
    workflow.add_node("start_real_time_analysis", start_real_time_analysis)
    workflow.add_node("process_audio_analysis", process_audio_analysis)
    workflow.add_node("process_behavior_analysis", process_behavior_analysis)
    workflow.add_node("process_game_test", process_game_test)
    workflow.add_node("calculate_final_score", calculate_final_score)
    
    # 시작점 설정
    workflow.set_entry_point("initialize_session")
    
    # 엣지 추가
    workflow.add_edge("initialize_session", "generate_scenario_questions")
    workflow.add_edge("generate_scenario_questions", "start_real_time_analysis")
    workflow.add_edge("start_real_time_analysis", "process_audio_analysis")
    workflow.add_edge("process_audio_analysis", "process_behavior_analysis")
    workflow.add_edge("process_behavior_analysis", "process_game_test")
    workflow.add_edge("process_game_test", "calculate_final_score")
    workflow.add_edge("calculate_final_score", END)
    
    return workflow.compile()

# 워크플로우 인스턴스 생성
ai_interview_workflow = build_ai_interview_workflow()

def run_ai_interview(
    session_id: str,
    job_info: str = "",
    audio_data: Dict = None,
    behavior_data: Dict = None,
    game_data: Dict = None
) -> Dict[str, Any]:
    """AI 면접 실행"""
    
    initial_state = {
        "session_id": session_id,
        "job_info": job_info,
        "audio_data": audio_data or {},
        "behavior_data": behavior_data or {},
        "game_data": game_data or {}
    }
    
    try:
        result = ai_interview_workflow.invoke(initial_state)
        return result.get("final_result", {})
    except Exception as e:
        return {
            "error": f"AI 면접 실행 오류: {str(e)}",
            "session_id": session_id
        } 