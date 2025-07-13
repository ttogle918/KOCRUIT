from langgraph.graph import Graph, END
from tools.job_posting_tool import job_posting_recommend_tool
from agents.interview_question_node import generate_company_questions, generate_common_question_bundle
from tools.portfolio_tool import portfolio_tool

def router(state):
    """라우터: 사용자 의도에 따라 적절한 도구로 분기"""
    user_intent = state.get("user_intent", "")
    
    if "채용공고" in user_intent or "job" in user_intent.lower():
        return "job_posting_tool"
    elif "면접질문" in user_intent or "interview" in user_intent.lower():
        if state.get("resume_text"):
            return "project_question_generator"
        elif state.get("company_name"):
            return "company_question_generator"
        else:
            return "company_question_generator"
    else:
        # 기본값: 사용 가능한 데이터에 따라 결정
        if state.get("resume_text"):
            return "project_question_generator"
        elif state.get("job_posting"):
            return "job_posting_tool"
        elif state.get("company_name"):
            return "company_question_generator"
        else:
            # 데이터가 없으면 기본값
            return "job_posting_tool"

def portfolio_analyzer(state):
    """포트폴리오 링크 수집 및 분석 노드"""
    resume_text = state.get("resume_text", "")
    name = state.get("name", "")
    
    if not resume_text:
        return {"portfolio_info": "이력서 정보가 없습니다."}
    
    try:
        # 포트폴리오 링크 수집
        links = portfolio_tool.extract_portfolio_links(resume_text, name)
        
        # 포트폴리오 내용 분석
        portfolio_info = portfolio_tool.analyze_portfolio_content(links)
        
        return {
            "portfolio_info": portfolio_info,
            "portfolio_links": links
        }
    except Exception as e:
        return {"portfolio_info": f"포트폴리오 분석 중 오류: {str(e)}"}

def project_question_generator(state):
    """프로젝트 기반 면접 질문 생성 노드"""
    resume_text = state.get("resume_text", "")
    company_name = state.get("company_name", "")
    portfolio_info = state.get("portfolio_info", "")
    
    if not resume_text:
        return {"questions": ["이력서 정보가 제공되지 않았습니다."]}
    
    try:
        # 포트폴리오 정보가 없으면 수집
        if not portfolio_info or portfolio_info == "이력서 정보가 없습니다.":
            portfolio_result = portfolio_analyzer(state)
            portfolio_info = portfolio_result.get("portfolio_info", "")
        
        # 통합 질문 생성
        question_bundle = generate_common_question_bundle(
            resume_text=resume_text,
            company_name=company_name,
            portfolio_info=portfolio_info
        )
        
        # 모든 질문을 하나의 리스트로 통합
        all_questions = []
        all_questions.extend(question_bundle.get("인성/동기", []))
        all_questions.extend(question_bundle.get("프로젝트 경험", []))
        all_questions.extend(question_bundle.get("회사 관련", []))
        all_questions.extend(question_bundle.get("상황 대처", []))
        
        return {
            "questions": all_questions,
            "question_bundle": question_bundle,
            "portfolio_info": portfolio_info
        }
    except Exception as e:
        return {"questions": [f"질문 생성 중 오류가 발생했습니다: {str(e)}"]}

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
    graph.add_node("portfolio_analyzer", portfolio_analyzer)
    graph.add_node("project_question_generator", project_question_generator)

    # 라우터를 entry point로 설정
    graph.set_entry_point("router")

    # 조건부 엣지 추가
    graph.add_conditional_edges(
        "router",
        lambda x: x,
        {
            "job_posting_tool": "job_posting_tool",
            "company_question_generator": "company_question_generator",
            "project_question_generator": "project_question_generator"
        }
    )
    
    # 프로젝트 질문 생성 시 포트폴리오 분석 포함
    graph.add_edge("project_question_generator", END)
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

def build_project_question_graph():
    """프로젝트 질문 생성 전용 그래프"""
    graph = Graph()
    graph.add_node("portfolio_analyzer", portfolio_analyzer)
    graph.add_node("project_question_generator", project_question_generator)
    graph.set_entry_point("portfolio_analyzer")
    graph.add_edge("portfolio_analyzer", "project_question_generator")
    graph.set_finish_point("project_question_generator")
    return graph.compile()
