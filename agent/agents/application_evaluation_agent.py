from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, Optional
from agent.tools.resume_scoring_tool import resume_scoring_tool
from agent.tools.pass_reason_tool import pass_reason_tool
from agent.tools.fail_reason_tool import fail_reason_tool
from agent.tools.application_decision_tool import application_decision_tool
from agent.utils.llm_cache import redis_cache

# 상태 정의
class ApplicationState(TypedDict):
    job_posting: str
    spec_data: dict
    resume_data: dict
    weight_data: Optional[dict]  # weight_data 필드를 Optional로 정의
    ai_score: float
    scoring_details: dict
    pass_reason: str
    fail_reason: str
    status: str
    decision_reason: str
    confidence: float

def build_application_evaluation_graph():
    """
    서류 평가를 위한 그래프를 생성합니다.
    """
    
    # 그래프 생성
    workflow = StateGraph(ApplicationState)
    
    # 노드 추가
    workflow.add_node("score_resume", resume_scoring_tool)
    workflow.add_node("generate_pass_reason", pass_reason_tool)
    workflow.add_node("generate_fail_reason", fail_reason_tool)
    workflow.add_node("make_decision", application_decision_tool)
    
    # 엣지 연결
    workflow.set_entry_point("score_resume")
    workflow.add_edge("score_resume", "generate_pass_reason")
    workflow.add_edge("generate_pass_reason", "generate_fail_reason")
    workflow.add_edge("generate_fail_reason", "make_decision")
    workflow.add_edge("make_decision", END)
    
    # 그래프 컴파일
    return workflow.compile()

@redis_cache()
def evaluate_application(job_posting: str, spec_data: dict, resume_data: dict, weight_data: dict = None):
    """
    지원자의 서류를 평가합니다.
    Redis 캐싱이 적용되어 같은 입력에 대해 캐시된 결과를 반환합니다.
    
    Args:
        job_posting (str): 채용공고 내용
        spec_data (dict): 지원자 스펙 데이터
        resume_data (dict): 이력서 데이터
        weight_data (dict): 가중치 데이터 (선택사항)
    
    Returns:
        dict: 평가 결과
    """
    # 초기 상태 설정
    initial_state = {
        "job_posting": job_posting,
        "spec_data": spec_data,
        "resume_data": resume_data,
        "weight_data": weight_data if weight_data is not None else {},
        "ai_score": 0.0,
        "scoring_details": {},
        "pass_reason": "",
        "fail_reason": "",
        "status": "",
        "decision_reason": "",
        "confidence": 0.0
    }
    
    # 그래프 실행
    graph = build_application_evaluation_graph()
    result = graph.invoke(initial_state)
    
    return {
        "ai_score": result.get("ai_score", 0.0),
        "status": result.get("status", "REJECTED"),
        "pass_reason": result.get("pass_reason", ""),
        "fail_reason": result.get("fail_reason", ""),
        "scoring_details": result.get("scoring_details", {}),
        "decision_reason": result.get("decision_reason", ""),
        "confidence": result.get("confidence", 0.0)
    } 