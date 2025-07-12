from langgraph.graph import Graph, END
from backend.app.api.v1.company_question_rag import generate_questions
from tools.job_posting_tool import job_posting_recommend_tool

def router(state):
    """라우터: 사용자 의도에 따라 적절한 도구로 분기"""
    user_intent = state.get("user_intent", "")
    
    if "채용공고" in user_intent or "job" in user_intent.lower():
        return "job_posting_tool"
    else:
        # 기본값: 사용 가능한 데이터에 따라 결정
        if state.get("job_posting"):
            return "job_posting_tool"
        else:
            # 데이터가 없으면 기본값
            return "job_posting_tool"

def build_graph():
    """기본 그래프: 라우터를 통한 조건부 실행"""
    graph = Graph()
    
    # 노드 추가
    graph.add_node("router", router)
    graph.add_node("job_posting_tool", job_posting_recommend_tool)
    graph.add_node("generate_questions", generate_questions())

    # 라우터를 entry point로 설정
    graph.set_entry_point("router")
    graph.add_edge("extract_core_values", "generate_questions")
    graph.add_edge("generate_questions", END)

    # 조건부 엣지 추가
    graph.add_conditional_edges(
        "router",
        lambda x: x,
        {
            "job_posting_tool": "job_posting_tool"
        }
    )
    
    # finish point 설정
    graph.set_finish_point("job_posting_tool")
    
    return graph.compile()

def build_job_posting_graph():
    """채용공고 개선 전용 그래프"""
    graph = Graph()
    graph.add_node("job_posting_tool", job_posting_recommend_tool)
    graph.set_entry_point("job_posting_tool")
    graph.set_finish_point("job_posting_tool")
    return graph.compile()

####################################################
# from langgraph.graph import Graph, END
# from tools.job_posting_tool import job_posting_recommend_tool

# # Import the function directly from the backend module
# try:
#     from backend.app.api.v1.company_question_rag import generate_questions
# except ImportError:
#     # Fallback: create a dummy function if import fails
#     def generate_questions():
#         def _generate_questions(state):
#             return {"questions": ["기본 질문이 생성되었습니다."]}
#         return _generate_questions

# def router(state):
#     """라우터: 사용자 의도에 따라 적절한 도구로 분기"""
#     user_intent = state.get("user_intent", "")
    
#     if "채용공고" in user_intent or "job" in user_intent.lower():
#         return "job_posting_tool"
#     else:
#         # 기본값: 사용 가능한 데이터에 따라 결정
#         if state.get("job_posting"):
#             return "job_posting_tool"
#         else:
#             # 데이터가 없으면 기본값
#             return "job_posting_tool"

# def build_graph():
#     """기본 그래프: 라우터를 통한 조건부 실행"""
#     graph = Graph()
    
#     # 노드 추가
#     graph.add_node("router", router)
#     graph.add_node("job_posting_tool", job_posting_recommend_tool)
    
#     # generate_questions는 함수 객체로 추가 (호출하지 않음)
#     try:
#         from backend.app.api.v1.company_question_rag import generate_questions
#         graph.add_node("generate_questions", generate_questions)
#     except ImportError:
#         # Fallback: create a dummy function if import fails
#         def dummy_generate_questions(state):
#             return {"questions": ["기본 질문이 생성되었습니다."]}
#         graph.add_node("generate_questions", dummy_generate_questions)

#     # 라우터를 entry point로 설정
#     graph.set_entry_point("router")

#     # 조건부 엣지 추가
#     graph.add_conditional_edges(
#         "router",
#         lambda x: x,
#         {
#             "job_posting_tool": "job_posting_tool",
#             "generate_questions": "generate_questions"
#         }
#     )
    
#     # 각 노드에서 END로 연결
#     graph.add_edge("job_posting_tool", END)
#     graph.add_edge("generate_questions", END)
    
#     return graph.compile()

# def build_job_posting_graph():
#     """채용공고 개선 전용 그래프"""
#     graph = Graph()
#     graph.add_node("job_posting_tool", job_posting_recommend_tool)
#     graph.set_entry_point("job_posting_tool")
#     graph.set_finish_point("job_posting_tool")
#     return graph.compile()
