from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from typing import Dict, List, Any, TypedDict
import json
import time
from datetime import datetime

# 상태 정의
class AIInsightsState(TypedDict):
    job_post_id: int
    interview_data: Dict[str, Any]
    analysis_stage: str
    basic_insights: Dict[str, Any]
    advanced_insights: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    final_report: Dict[str, Any]
    error: str

# LangChain 모델 초기화
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.1,
    max_tokens=4000
)

def analyze_interview_patterns(state: AIInsightsState) -> AIInsightsState:
    """면접 패턴 분석"""
    try:
        interview_data = state["interview_data"]
        
        # 면접 데이터 분석
        ai_scores = interview_data.get("ai_scores", [])
        practical_scores = interview_data.get("practical_scores", [])
        executive_scores = interview_data.get("executive_scores", [])
        
        # 패턴 분석 프롬프트
        pattern_prompt = f"""
        다음 면접 데이터를 분석하여 패턴을 찾아주세요:
        
        AI 면접 점수: {ai_scores}
        실무진 면접 점수: {practical_scores}
        임원진 면접 점수: {executive_scores}
        
        다음 항목들을 분석해주세요:
        1. 점수 분포 패턴
        2. 단계별 점수 변화 추이
        3. 이상치나 특이 패턴
        4. 면접 단계별 난이도 분석
        
        JSON 형태로 응답해주세요.
        """
        
        response = llm.invoke([HumanMessage(content=pattern_prompt)])
        pattern_analysis = json.loads(response.content)
        
        state["basic_insights"] = {
            "pattern_analysis": pattern_analysis,
            "score_distribution": {
                "ai": {"mean": sum(ai_scores)/len(ai_scores) if ai_scores else 0, "count": len(ai_scores)},
                "practical": {"mean": sum(practical_scores)/len(practical_scores) if practical_scores else 0, "count": len(practical_scores)},
                "executive": {"mean": sum(executive_scores)/len(executive_scores) if executive_scores else 0, "count": len(executive_scores)}
            }
        }
        state["analysis_stage"] = "pattern_analyzed"
        
    except Exception as e:
        state["error"] = f"패턴 분석 중 오류: {str(e)}"
    
    return state

def generate_advanced_insights(state: AIInsightsState) -> AIInsightsState:
    """고급 인사이트 생성"""
    try:
        basic_insights = state["basic_insights"]
        interview_data = state["interview_data"]
        
        # 고급 분석 프롬프트
        advanced_prompt = f"""
        다음 면접 데이터와 기본 분석 결과를 바탕으로 고급 인사이트를 생성해주세요:
        
        기본 분석: {json.dumps(basic_insights, ensure_ascii=False)}
        면접 데이터: {json.dumps(interview_data, ensure_ascii=False)}
        
        다음 항목들을 분석해주세요:
        1. 면접 프로세스 최적화 방안
        2. 평가 기준 개선 제안
        3. 지원자 품질 향상 전략
        4. 리스크 요소 식별
        5. 성과 예측 모델 제안
        
        JSON 형태로 응답해주세요.
        """
        
        response = llm.invoke([HumanMessage(content=advanced_prompt)])
        advanced_insights = json.loads(response.content)
        
        state["advanced_insights"] = advanced_insights
        state["analysis_stage"] = "advanced_analyzed"
        
    except Exception as e:
        state["error"] = f"고급 인사이트 생성 중 오류: {str(e)}"
    
    return state

def generate_recommendations(state: AIInsightsState) -> AIInsightsState:
    """AI 추천사항 생성"""
    try:
        basic_insights = state["basic_insights"]
        advanced_insights = state["advanced_insights"]
        
        # 추천사항 생성 프롬프트
        recommendation_prompt = f"""
        다음 분석 결과를 바탕으로 구체적이고 실행 가능한 추천사항을 생성해주세요:
        
        기본 분석: {json.dumps(basic_insights, ensure_ascii=False)}
        고급 분석: {json.dumps(advanced_insights, ensure_ascii=False)}
        
        다음 형식으로 추천사항을 생성해주세요:
        [
          {{
            "type": "recommendation_type",
            "priority": "high/medium/low",
            "title": "추천사항 제목",
            "description": "상세 설명",
            "action": "구체적 실행 방안",
            "expected_impact": "예상 효과",
            "implementation_difficulty": "easy/medium/hard"
          }}
        ]
        
        최소 3개, 최대 7개의 추천사항을 생성해주세요.
        """
        
        response = llm.invoke([HumanMessage(content=recommendation_prompt)])
        recommendations = json.loads(response.content)
        
        state["recommendations"] = recommendations
        state["analysis_stage"] = "recommendations_generated"
        
    except Exception as e:
        state["error"] = f"추천사항 생성 중 오류: {str(e)}"
    
    return state

def create_final_report(state: AIInsightsState) -> AIInsightsState:
    """최종 보고서 생성"""
    try:
        # 최종 보고서 생성
        final_report = {
            "job_post_id": state["job_post_id"],
            "analysis_date": datetime.now().isoformat(),
            "analysis_summary": {
                "total_applicants": len(state["interview_data"].get("all_applicants", [])),
                "analysis_quality": "high" if not state.get("error") else "medium",
                "key_findings": len(state["recommendations"])
            },
            "insights": {
                "basic": state["basic_insights"],
                "advanced": state["advanced_insights"]
            },
            "recommendations": state["recommendations"],
            "execution_metadata": {
                "total_stages": 4,
                "completed_stages": 4,
                "execution_time": time.time() - state.get("start_time", time.time())
            }
        }
        
        state["final_report"] = final_report
        state["analysis_stage"] = "completed"
        
    except Exception as e:
        state["error"] = f"최종 보고서 생성 중 오류: {str(e)}"
    
    return state

def error_handler(state: AIInsightsState) -> AIInsightsState:
    """에러 처리"""
    if state.get("error"):
        state["analysis_stage"] = "failed"
        state["final_report"] = {
            "error": state["error"],
            "job_post_id": state["job_post_id"],
            "analysis_date": datetime.now().isoformat()
        }
    return state

# 워크플로우 그래프 생성
def create_ai_insights_workflow():
    workflow = StateGraph(AIInsightsState)
    
    # 노드 추가
    workflow.add_node("analyze_patterns", analyze_interview_patterns)
    workflow.add_node("generate_advanced", generate_advanced_insights)
    workflow.add_node("generate_recommendations", generate_recommendations)
    workflow.add_node("create_report", create_final_report)
    workflow.add_node("handle_error", error_handler)
    
    # 엣지 추가
    workflow.add_edge("analyze_patterns", "generate_advanced")
    workflow.add_edge("generate_advanced", "generate_recommendations")
    workflow.add_edge("generate_recommendations", "create_report")
    workflow.add_edge("create_report", END)
    
    # 에러 처리
    workflow.add_conditional_edges(
        "analyze_patterns",
        lambda state: "handle_error" if state.get("error") else "generate_advanced"
    )
    workflow.add_conditional_edges(
        "generate_advanced",
        lambda state: "handle_error" if state.get("error") else "generate_recommendations"
    )
    workflow.add_conditional_edges(
        "generate_recommendations",
        lambda state: "handle_error" if state.get("error") else "create_report"
    )
    workflow.add_edge("handle_error", END)
    
    return workflow.compile()

# 워크플로우 실행 함수
def run_ai_insights_analysis(job_post_id: int, interview_data: Dict[str, Any]) -> Dict[str, Any]:
    """AI 인사이트 분석 실행"""
    workflow = create_ai_insights_workflow()
    
    initial_state = AIInsightsState(
        job_post_id=job_post_id,
        interview_data=interview_data,
        analysis_stage="started",
        basic_insights={},
        advanced_insights={},
        recommendations=[],
        final_report={},
        error="",
        start_time=time.time()
    )
    
    result = workflow.invoke(initial_state)
    return result["final_report"] 