from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List, Optional
from agent.agents.interview_question_node import (
    generate_personal_questions,
    generate_common_questions,
    generate_company_questions,
    generate_job_question_bundle,
    generate_resume_analysis_report,
    generate_interview_checklist,
    analyze_candidate_strengths_weaknesses,
    generate_interview_guideline,
    suggest_evaluation_criteria,
    generate_executive_interview_questions,
    generate_second_interview_questions,
    generate_final_interview_questions,
    generate_advanced_competency_questions
)
import json

# LLM 초기화
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

def analyze_interview_requirements(state: Dict[str, Any]) -> Dict[str, Any]:
    """면접 요구사항 분석 노드"""
    resume_text = state.get("resume_text", "")
    job_info = state.get("job_info", "")
    company_name = state.get("company_name", "")
    interview_type = state.get("interview_type", "general")
    
    # 면접 유형별 요구사항 분석
    requirements = {
        "ai": {
            "needs_personal_questions": True,
            "needs_company_questions": bool(company_name),
            "needs_job_questions": bool(job_info),
            "needs_portfolio_analysis": True,
            "needs_resume_analysis": True,
            "needs_automated_evaluation": True
        },
        "general": {
            "needs_personal_questions": True,
            "needs_company_questions": bool(company_name),
            "needs_job_questions": bool(job_info),
            "needs_portfolio_analysis": True,
            "needs_resume_analysis": True
        },
        "executive": {
            "needs_personal_questions": False,
            "needs_company_questions": True,
            "needs_job_questions": True,
            "needs_portfolio_analysis": True,
            "needs_resume_analysis": True,
            "needs_strategic_questions": True
        },
        "second": {
            "needs_personal_questions": True,
            "needs_company_questions": True,
            "needs_job_questions": True,
            "needs_portfolio_analysis": True,
            "needs_resume_analysis": True,
            "needs_deep_technical": True
        },
        "final": {
            "needs_personal_questions": False,
            "needs_company_questions": True,
            "needs_job_questions": True,
            "needs_portfolio_analysis": False,
            "needs_resume_analysis": True,
            "needs_cultural_fit": True
        }
    }
    
    current_requirements = requirements.get(interview_type, requirements["general"])
    
    return {
        **state,
        "interview_requirements": current_requirements,
        "next": "portfolio_analyzer" if current_requirements.get("needs_portfolio_analysis") else "resume_analyzer"
    }

def portfolio_analyzer(state: Dict[str, Any]) -> Dict[str, Any]:
    """포트폴리오 분석 노드 (단순화됨)"""
    # 포트폴리오 분석을 건너뛰고 기본 정보만 반환
    return {
        **state,
        "portfolio_info": "포트폴리오 분석이 비활성화되었습니다.",
        "next": "resume_analyzer"
    }

def resume_analyzer(state: Dict[str, Any]) -> Dict[str, Any]:
    """이력서 분석 노드"""
    resume_text = state.get("resume_text", "")
    job_info = state.get("job_info", "")
    portfolio_info = state.get("portfolio_info", "")
    job_matching_info = state.get("job_matching_info", "")
    
    try:
        # 이력서 분석 리포트 생성
        analysis_result = generate_resume_analysis_report(
            resume_text=resume_text,
            job_info=job_info,
            portfolio_info=portfolio_info,
            job_matching_info=job_matching_info
        )
        
        return {
            **state,
            "resume_analysis": analysis_result,
            "next": "question_generator"
        }
    except Exception as e:
        return {
            **state,
            "resume_analysis": {"error": f"이력서 분석 중 오류: {str(e)}"},
            "next": "question_generator"
        }

def question_generator(state: Dict[str, Any]) -> Dict[str, Any]:
    """면접 질문 생성 노드"""
    resume_text = state.get("resume_text", "")
    job_info = state.get("job_info", "")
    company_name = state.get("company_name", "")
    portfolio_info = state.get("portfolio_info", "")
    interview_type = state.get("interview_type", "general")
    requirements = state.get("interview_requirements", {})
    
    questions = {}
    
    try:
        # 공통 질문 생성 (인성/동기 포함)
        common_questions = generate_common_questions(
            company_name=company_name,
            job_info=job_info
        )
        questions["common"] = common_questions
        
        # 개인별 맞춤형 질문 생성 (인성/동기 제외)
        if requirements.get("needs_personal_questions"):
            personal_questions = generate_personal_questions(
                resume_text=resume_text,
                company_name=company_name,
                portfolio_info=portfolio_info
            )
            questions["personal"] = personal_questions
        
        # 회사 관련 질문 생성
        if requirements.get("needs_company_questions") and company_name:
            company_questions = generate_company_questions(company_name)
            questions["company"] = company_questions
        
        # 직무 관련 질문 생성
        if requirements.get("needs_job_questions") and job_info:
            job_questions = generate_job_question_bundle(
                resume_text=resume_text,
                job_info=job_info,
                company_name=company_name,
                job_matching_info=state.get("job_matching_info", "")
            )
            questions["job"] = job_questions
        
        # 면접 유형별 특화 질문
        if interview_type == "ai":
            # AI 면접은 기본 질문들을 모두 포함하되, 자동화에 최적화된 형태로 제공
            ai_questions = {
                "common": common_questions,
                "personal": questions.get("personal", []),
                "company": questions.get("company", []),
                "job": questions.get("job", [])
            }
            questions["ai"] = ai_questions
        
        elif interview_type == "executive":
            executive_questions = generate_executive_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=company_name
            )
            questions["executive"] = executive_questions
        
        elif interview_type == "second":
            second_questions = generate_second_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=company_name,
                first_interview_feedback=state.get("first_interview_feedback", "")
            )
            questions["second"] = second_questions
        
        elif interview_type == "final":
            final_questions = generate_final_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=company_name,
                previous_feedback=state.get("previous_feedback", "")
            )
            questions["final"] = final_questions
        
        # 고급 역량 질문 생성
        if requirements.get("needs_deep_technical"):
            advanced_questions = generate_advanced_competency_questions(
                resume_text=resume_text,
                job_info=job_info
            )
            questions["advanced_competency"] = advanced_questions
        
        return {
            **state,
            "generated_questions": questions,
            "next": "evaluation_tools"
        }
    except Exception as e:
        return {
            **state,
            "generated_questions": {"error": f"질문 생성 중 오류: {str(e)}"},
            "next": "evaluation_tools"
        }

def evaluation_tools(state: Dict[str, Any]) -> Dict[str, Any]:
    """면접 평가 도구 생성 노드"""
    resume_text = state.get("resume_text", "")
    job_info = state.get("job_info", "")
    company_name = state.get("company_name", "")
    
    evaluation_tools = {}
    
    try:
        # 면접 체크리스트 생성
        checklist = generate_interview_checklist(
            resume_text=resume_text,
            job_info=job_info,
            company_name=company_name
        )
        evaluation_tools["checklist"] = checklist
        
        # 강점/약점 분석
        strengths_weaknesses = analyze_candidate_strengths_weaknesses(
            resume_text=resume_text,
            job_info=job_info,
            company_name=company_name
        )
        evaluation_tools["strengths_weaknesses"] = strengths_weaknesses
        
        # 면접 가이드라인 생성
        guideline = generate_interview_guideline(
            resume_text=resume_text,
            job_info=job_info,
            company_name=company_name
        )
        evaluation_tools["guideline"] = guideline
        
        # 평가 기준 제안
        criteria = suggest_evaluation_criteria(
            resume_text=resume_text,
            job_info=job_info,
            company_name=company_name
        )
        evaluation_tools["evaluation_criteria"] = criteria
        
        return {
            **state,
            "evaluation_tools": evaluation_tools,
            "next": "result_integrator"
        }
    except Exception as e:
        return {
            **state,
            "evaluation_tools": {"error": f"평가 도구 생성 중 오류: {str(e)}"},
            "next": "result_integrator"
        }

def result_integrator(state: Dict[str, Any]) -> Dict[str, Any]:
    """결과 통합 및 최종 정리 노드"""
    generated_questions = state.get("generated_questions", {})
    evaluation_tools = state.get("evaluation_tools", {})
    resume_analysis = state.get("resume_analysis", {})
    interview_type = state.get("interview_type", "general")
    
    # 모든 질문을 하나의 리스트로 통합
    all_questions = []
    
    for category, questions in generated_questions.items():
        if isinstance(questions, dict):
            # 카테고리별 질문 딕셔너리인 경우
            for subcategory, subquestions in questions.items():
                if isinstance(subquestions, list):
                    all_questions.extend(subquestions)
                elif isinstance(subquestions, str):
                    all_questions.append(subquestions)
        elif isinstance(questions, list):
            all_questions.extend(questions)
        elif isinstance(questions, str):
            all_questions.append(questions)
    
    # 중복 제거 및 정리
    unique_questions = list(dict.fromkeys(all_questions))
    
    # 최종 결과 구성
    final_result = {
        "interview_type": interview_type,
        "questions": unique_questions,
        "question_bundle": generated_questions,
        "evaluation_tools": evaluation_tools,
        "resume_analysis": resume_analysis,
        "total_questions": len(unique_questions),
        "generated_at": state.get("timestamp", "")
    }
    
    return {
        **state,
        "final_result": final_result,
        "next": END
    }

def build_interview_question_workflow() -> StateGraph:
    """면접 질문 생성 워크플로우 그래프 생성"""
    workflow = StateGraph(Dict[str, Any])
    
    # 노드 추가
    workflow.add_node("analyze_requirements", analyze_interview_requirements)
    workflow.add_node("portfolio_analyzer", portfolio_analyzer)
    workflow.add_node("resume_analyzer", resume_analyzer)
    workflow.add_node("question_generator", question_generator)
    workflow.add_node("evaluation_tools", evaluation_tools)
    workflow.add_node("result_integrator", result_integrator)
    
    # 시작점 설정
    workflow.set_entry_point("analyze_requirements")
    
    # 조건부 엣지 추가
    workflow.add_conditional_edges(
        "analyze_requirements",
        lambda x: x["next"],
        {
            "portfolio_analyzer": "portfolio_analyzer",
            "resume_analyzer": "resume_analyzer"
        }
    )
    
    workflow.add_conditional_edges(
        "portfolio_analyzer",
        lambda x: x["next"],
        {
            "resume_analyzer": "resume_analyzer"
        }
    )
    
    workflow.add_conditional_edges(
        "resume_analyzer",
        lambda x: x["next"],
        {
            "question_generator": "question_generator"
        }
    )
    
    workflow.add_conditional_edges(
        "question_generator",
        lambda x: x["next"],
        {
            "evaluation_tools": "evaluation_tools"
        }
    )
    
    workflow.add_conditional_edges(
        "evaluation_tools",
        lambda x: x["next"],
        {
            "result_integrator": "result_integrator"
        }
    )
    
    workflow.add_edge("result_integrator", END)
    
    return workflow.compile()

# 워크플로우 인스턴스 생성
interview_workflow = build_interview_question_workflow()

def generate_comprehensive_interview_questions(
    resume_text: str,
    job_info: str = "",
    company_name: str = "",
    applicant_name: str = "",
    interview_type: str = "general",
    first_interview_feedback: str = "",
    previous_feedback: str = "",
    job_matching_info: str = ""
) -> Dict[str, Any]:
    """LangGraph 워크플로우를 사용한 종합 면접 질문 생성"""
    
    from datetime import datetime
    
    # 초기 상태 설정
    initial_state = {
        "resume_text": resume_text,
        "job_info": job_info,
        "company_name": company_name,
        "applicant_name": applicant_name,
        "interview_type": interview_type,
        "first_interview_feedback": first_interview_feedback,
        "previous_feedback": previous_feedback,
        "job_matching_info": job_matching_info,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # 워크플로우 실행
        result = interview_workflow.invoke(initial_state)
        return result.get("final_result", {})
    except Exception as e:
        return {
            "error": f"워크플로우 실행 중 오류: {str(e)}",
            "interview_type": interview_type,
            "questions": [],
            "question_bundle": {},
            "evaluation_tools": {},
            "resume_analysis": {}
        }

# 특화된 워크플로우들
def build_executive_interview_workflow() -> StateGraph:
    """임원면접 전용 워크플로우"""
    workflow = StateGraph(Dict[str, Any])
    
    workflow.add_node("resume_analyzer", resume_analyzer)
    workflow.add_node("question_generator", question_generator)
    workflow.add_node("result_integrator", result_integrator)
    
    workflow.set_entry_point("resume_analyzer")
    workflow.add_edge("resume_analyzer", "question_generator")
    workflow.add_edge("question_generator", "result_integrator")
    workflow.add_edge("result_integrator", END)
    
    return workflow.compile()

def build_technical_interview_workflow() -> StateGraph:
    """기술면접 전용 워크플로우"""
    workflow = StateGraph(Dict[str, Any])
    
    workflow.add_node("portfolio_analyzer", portfolio_analyzer)
    workflow.add_node("resume_analyzer", resume_analyzer)
    workflow.add_node("question_generator", question_generator)
    workflow.add_node("result_integrator", result_integrator)
    
    workflow.set_entry_point("portfolio_analyzer")
    workflow.add_edge("portfolio_analyzer", "resume_analyzer")
    workflow.add_edge("resume_analyzer", "question_generator")
    workflow.add_edge("question_generator", "result_integrator")
    workflow.add_edge("result_integrator", END)
    
    return workflow.compile()

# 특화된 워크플로우 인스턴스들
executive_workflow = build_executive_interview_workflow()
technical_workflow = build_technical_interview_workflow() 