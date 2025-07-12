from langgraph.graph import Graph, END
from tools.job_posting_tool import job_posting_recommend_tool
from agents.interview_question_node import generate_company_questions

def router(state):
    """라우터: 사용자 의도에 따라 적절한 도구로 분기"""
    user_intent = state.get("user_intent", "")
    
    if "채용공고" in user_intent or "job" in user_intent.lower():
        return "job_posting_tool"
    elif "면접질문" in user_intent or "interview" in user_intent.lower():
        return "company_question_generator"
    else:
        # 기본값: 사용 가능한 데이터에 따라 결정
        if state.get("job_posting"):
            return "job_posting_tool"
        elif state.get("company_name"):
            return "company_question_generator"
        else:
            # 데이터가 없으면 기본값
            return "job_posting_tool"

def company_question_generator(state):
    """회사명 기반 면접 질문 생성 노드 (인재상 + 뉴스 기반)"""
    company_name = state.get("company_name", "")
    if not company_name:
        return {"questions": ["회사명이 제공되지 않았습니다."]}
    
    try:
        questions = generate_company_questions(company_name)
        return {"questions": questions}
    except Exception as e:
        return {"questions": [f"질문 생성 중 오류가 발생했습니다: {str(e)}"]}

def build_graph():
    """기본 그래프: 라우터를 통한 조건부 실행"""
    graph = Graph()
    
    # 노드 추가
    graph.add_node("router", router)
    graph.add_node("job_posting_tool", job_posting_recommend_tool)
    graph.add_node("company_question_generator", company_question_generator)

    # 라우터를 entry point로 설정
    graph.set_entry_point("router")

    # 조건부 엣지 추가
    graph.add_conditional_edges(
        "router",
        lambda x: x,
        {
            "job_posting_tool": "job_posting_tool",
            "company_question_generator": "company_question_generator"
        }
    )
    
    # finish point 설정
    # graph.set_finish_point("job_posting_tool")    # TODO: test 후, 삭제
    graph.add_edge("job_posting_tool", END)
    graph.add_edge("company_question_generator", END)
    
    return graph.compile()

def build_job_posting_graph():
    """채용공고 개선 전용 그래프"""
    graph = Graph()
    graph.add_node("job_posting_tool", job_posting_recommend_tool)
    graph.set_entry_point("job_posting_tool")
    graph.set_finish_point("job_posting_tool")
    return graph.compile()

def build_company_question_graph():
    """회사 질문 생성 전용 그래프"""
    graph = Graph()
    graph.add_node("company_question_generator", company_question_generator)
    graph.set_entry_point("company_question_generator")
    graph.set_finish_point("company_question_generator")
    return graph.compile()
