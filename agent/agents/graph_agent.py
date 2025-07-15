from langgraph.graph import Graph, END
from langchain_openai import ChatOpenAI
from tools.job_posting_tool import job_posting_recommend_tool
from agents.interview_question_node import generate_company_questions, generate_common_question_bundle
from tools.portfolio_tool import portfolio_tool
from tools.form_fill_tool import form_fill_tool, form_improve_tool
from tools.form_field_tool import form_field_update_tool, form_status_check_tool
import json
import re

def analyze_complex_command(message):
    """복합 명령을 분석하여 필요한 작업들을 추출"""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
    
    analysis_prompt = f"""
    사용자의 메시지를 분석하여 필요한 작업들을 추출해주세요.
    
    사용자 메시지: {message}
    
    분석해야 할 작업들:
    1. 폼 생성/작성 요청 (예: "백엔드 개발자 2명 뽑는 공고를 작성해줘")
    2. 특정 필드 설정 요청 (예: "부서명은 서버개발팀", "경력을 중요시했으면 좋겠어")
    3. 면접 일정 설정 요청 (예: "면접은 두개 정도로 잡으면 될거 같아")
    4. 기타 요구사항
    
    응답 형식 (JSON):
    {{
        "primary_action": "form_fill_tool 또는 form_improve_tool 또는 form_status_check_tool",
        "field_updates": [
            {{
                "field": "필드명 (title, department, qualifications, conditions, job_details, procedures, headcount, location, employment_type)",
                "value": "설정할 값",
                "reason": "설정 이유"
            }}
        ],
        "schedule_requests": [
            {{
                "type": "면접 일정 요청 타입",
                "count": "면접 횟수",
                "details": "추가 세부사항"
            }}
        ],
        "other_requirements": ["기타 요구사항들"],
        "complexity_level": "simple 또는 complex"
    }}
    
    중요:
    - 복합 요청인 경우 primary_action은 form_fill_tool로 설정
    - 단순 필드 수정인 경우 primary_action은 form_field_update_tool로 설정
    - 여러 필드가 언급된 경우 field_updates 배열에 모두 포함
    - 면접 관련 요청이 있으면 schedule_requests에 포함
    """
    
    try:
        response = llm.invoke(analysis_prompt)
        response_text = response.content.strip()
        
        # JSON 부분만 추출
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        analysis = json.loads(response_text)
        return analysis
    except Exception as e:
        print(f"복합 명령 분석 중 오류: {e}")
        return None

def info_tool(state):
    """정보성 안내/설명/FAQ 응답 도구"""
    message = state.get("message", "")
    page_context = state.get("page_context", {})
    
    print(f"🔍 info_tool 호출됨: message={message}")
    
    # LLM 프롬프트: 설명/가이드/FAQ만 반환, 행동 X
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    prompt = f"""
    사용자의 질문에 대해 실제 행동(폼 작성, 수정 등) 없이, 정보성 안내/설명/가이드/FAQ만 제공하세요.
    - 예시: '공고 작성 방법 알려줘', '지원자 관리란?', '면접 일정 등록 방법 설명해줘' 등
    - 절대 폼을 생성하거나 데이터를 변경하지 마세요.
    - 한글로, 친절하고 명확하게 안내하세요.
    - 1~2문단 이내로 간결하게 답변하세요.
    
    [질문]
    {message}
    [페이지 정보]
    {page_context}
    """
    
    try:
        response = llm.invoke(prompt)
        info_content = response.content.strip()
        print(f"📝 info_tool 응답: {info_content}")
        
        return {
            "info": info_content,
            "message": info_content  # message 키도 추가하여 호환성 확보
        }
    except Exception as e:
        print(f"❌ info_tool 오류: {e}")
        error_msg = "죄송합니다. 안내 정보를 불러오지 못했습니다."
        return {
            "info": error_msg,
            "message": error_msg
        }

def router(state):
    """라우터: LLM을 사용하여 사용자 의도를 분석하고 적절한 도구로 분기"""
    # state가 문자열인 경우 처리
    if isinstance(state, str):
        message = state
        user_intent = ""
    else:
        message = state.get("message", "")
        user_intent = state.get("user_intent", "")
    
    print(f"라우터 호출: message={message}, user_intent={user_intent}")
    
    # 복합 명령 분석
    complex_analysis = analyze_complex_command(message)
    
    if complex_analysis and complex_analysis.get("complexity_level") == "complex":
        print(f"복합 명령 감지: {complex_analysis}")
        # 복합 명령의 경우 form_fill_tool로 라우팅하고 분석 결과를 state에 포함
        return {
            "next": "form_fill_tool", 
            **state,
            "complex_analysis": complex_analysis
        }
    
    # 정보성 안내/설명/FAQ/기능 안내 패턴 우선 분기
    info_patterns = [
        "할 수 있나요", "할 수 있어", "가능해", "가능한가요", "방법", "어떻게 해", "어떻게 하면", "어떻게 변경", "어떻게 조정", "어떻게 수정", "어떻게 추가", "어떻게 삭제", "어떻게 바꿔", "어떻게 설정"
    ]
    # 명확한 값 지정 패턴 (예: '정규직으로 변경해줘', '3명으로 바꿔줘')
    value_change_patterns = [
        r"(을|를)?\s*([\w가-힣]+)\s*(으로|로)\s*(변경|바꿔|수정|설정)",
        r"(을|를)?\s*([\w가-힣]+)\s*로\s*조정"
    ]
    is_info_pattern = any(p in message for p in info_patterns)
    is_value_change = any(re.search(p, message) for p in value_change_patterns)
    print(f"🔍 패턴 분석: info_pattern={is_info_pattern}, value_change={is_value_change}")
    if is_info_pattern and not is_value_change:
        print(f"✅ 기능 안내/설명 패턴 감지: {message}")
        return {"next": "info_tool", **state}
    
    # LLM을 사용한 의도 분석
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
    
    intent_analysis_prompt = f"""
    사용자의 메시지를 분석하여 어떤 도구를 사용해야 하는지 결정해주세요.
    
    사용자 메시지: {message}
    사용자 의도: {user_intent}
    
    사용 가능한 도구들:
    1. form_fill_tool - 폼 전체를 채우거나 생성하는 요청
    2. form_improve_tool - 폼 개선이나 조언을 요청하는 경우
    3. form_status_check_tool - 현재 폼 상태를 확인하는 요청
    4. form_field_update_tool - 특정 필드를 수정하거나 변경하는 요청
    5. job_posting_tool - 채용공고 관련 조언이나 추천
    6. company_question_generator - 회사 관련 면접 질문 생성
    7. project_question_generator - 프로젝트 기반 면접 질문 생성
    8. info_tool - 정보성 안내/설명/FAQ 요청 (실제 행동 없이 설명만)
    
    분석 기준:
    - 폼 채우기/생성: "작성", "채워줘", "생성", "만들어줘", "공고 작성" 등의 키워드
    - 폼 개선: "개선", "조언", "제안", "어떻게" 등의 키워드
    - 상태 확인: "현재", "상태", "확인", "어떻게 되어있어" 등의 키워드
    - 필드 수정: "변경", "수정", "바꿔줘", "고쳐줘", "~로 바꿔달라", "~로 변경" + 특정 필드명
    - 면접 질문: "면접", "질문", "인터뷰" 등의 키워드
    - 채용공고: "채용", "공고", "job" 등의 키워드
    - 정보성 안내: "방법", "설명", "알려줘", "어떻게", "란?", "무엇인가" 등 (실제 행동 없이)
    
    중요: 
    - 정보성 안내 요청의 경우 info_tool을 선택하세요 (실제 폼 작성/수정 없이 설명만)
    - 필드 수정 요청의 경우, 사용자가 특정 필드명(제목, 부서, 부서명, 지원자격 등)과 새로운 값을 명시한 경우에만 form_field_update_tool을 선택하세요.
    
    응답은 정확히 다음 중 하나만 반환하세요:
    form_fill_tool, form_improve_tool, form_status_check_tool, form_field_update_tool, job_posting_tool, company_question_generator, project_question_generator, info_tool
    """
    
    try:
        # 먼저 키워드 기반으로 빠른 판단
        message_lower = message.lower()
        
        # AI 개선 요청 키워드 체크 (먼저 확인)
        ai_improve_keywords = ["더 상세하게", "더 구체적으로", "개선해줘", "보완해줘", "완성해줘", "작성해줘", "어떻게", "조언"]
        field_names = ["제목", "부서", "부서명", "지원자격", "근무조건", "모집분야", "전형절차", "모집인원", "근무지역", "고용형태"]
        
        # AI 개선 요청인지 확인 (특정 필드 + AI 개선 키워드)
        is_ai_improve = any(field in message for field in field_names) and any(keyword in message for keyword in ai_improve_keywords)
        
        if (is_ai_improve):
            print(f"키워드 기반 AI 개선 감지: {message}")
            return {"next": "form_improve_tool", **state}
        
        # 구체적인 필드 수정 키워드 체크
        field_update_keywords = ["바꿔달라", "변경", "수정", "고쳐줘", "바꿔줘", "로 변경", "으로 변경"]
        
        is_field_update = any(keyword in message for keyword in field_update_keywords) and any(field in message for field in field_names)
        
        if is_field_update:
            print(f"키워드 기반 필드 수정 감지: {message}")
            return {"next": "form_field_update_tool", **state}
        
        # 폼 작성 키워드 체크
        form_fill_keywords = ["작성", "채워줘", "생성", "만들어줘", "공고 작성"]
        if any(keyword in message for keyword in form_fill_keywords):
            print(f"키워드 기반 폼 작성 감지: {message}")
            return {"next": "form_fill_tool", **state}
        
        # 상태 확인 키워드 체크
        status_keywords = ["현재", "상태", "확인", "어떻게 되어있어"]
        if any(keyword in message for keyword in status_keywords):
            print(f"키워드 기반 상태 확인 감지: {message}")
            return {"next": "form_status_check_tool", **state}
        
        # LLM 기반 분석 (키워드로 판단되지 않은 경우)
        response = llm.invoke(intent_analysis_prompt)
        tool_choice = response.content.strip()
        print(f"LLM이 선택한 도구: {tool_choice}")
        
        # 응답 검증
        valid_tools = [
            "form_fill_tool", "form_improve_tool", "form_status_check_tool", 
            "form_field_update_tool", "job_posting_tool", "company_question_generator", 
            "project_question_generator", "info_tool"
        ]
        
        if tool_choice in valid_tools:
            print(f"유효한 도구 선택됨: {tool_choice}")
            return {"next": tool_choice, **state}
        else:
            print(f"유효하지 않은 도구 선택됨: {tool_choice}, 기본값 사용")
            # 기본값: 사용 가능한 데이터에 따라 결정
            if state.get("resume_text"):
                return {"next": "project_question_generator", **state}
            elif state.get("job_posting"):
                return {"next": "job_posting_tool", **state}
            elif state.get("company_name"):
                return {"next": "company_question_generator", **state}
            else:
                return {"next": "form_fill_tool", **state}  # 폼 관련 요청이므로 기본값을 form_fill_tool로 변경
                
    except Exception as e:
        print(f"의도 분석 중 오류: {e}")
        # 오류 시 기본값 반환
        if state.get("resume_text"):
            return {"next": "project_question_generator", **state}
        elif state.get("job_posting"):
            return {"next": "job_posting_tool", **state}
        elif state.get("company_name"):
            return {"next": "company_question_generator", **state}
        else:
            return {"next": "form_fill_tool", **state}  # 폼 관련 요청이므로 기본값을 form_fill_tool로 변경

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
    graph.add_node("form_fill_tool", form_fill_tool)
    graph.add_node("form_improve_tool", form_improve_tool)
    graph.add_node("form_status_check_tool", form_status_check_tool)
    graph.add_node("form_field_update_tool", form_field_update_tool)
    graph.add_node("info_tool", info_tool)

    # 라우터를 entry point로 설정
    graph.set_entry_point("router")

    # 조건부 엣지 추가
    graph.add_conditional_edges(
        "router",
        lambda x: x["next"],
        {
            "job_posting_tool": "job_posting_tool",
            "company_question_generator": "company_question_generator",
            "project_question_generator": "project_question_generator",
            "form_fill_tool": "form_fill_tool",
            "form_improve_tool": "form_improve_tool",
            "form_status_check_tool": "form_status_check_tool",
            "form_field_update_tool": "form_field_update_tool",
            "info_tool": "info_tool"
        }
    )
    
    # 모든 노드에서 END로 연결
    graph.add_edge("project_question_generator", END)
    graph.add_edge("job_posting_tool", END)
    graph.add_edge("company_question_generator", END)
    graph.add_edge("form_fill_tool", END)
    graph.add_edge("form_improve_tool", END)
    graph.add_edge("form_status_check_tool", END)
    graph.add_edge("form_field_update_tool", END)
    graph.add_edge("info_tool", END)
    
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

def build_form_graph():
    """폼 관련 작업 전용 그래프"""
    graph = Graph()
    graph.add_node("form_fill_tool", form_fill_tool)
    graph.add_node("form_improve_tool", form_improve_tool)
    graph.add_node("form_status_check_tool", form_status_check_tool)
    graph.add_node("form_field_update_tool", form_field_update_tool)
    graph.set_entry_point("form_fill_tool")
    graph.add_edge("form_fill_tool", "form_improve_tool")
    graph.add_edge("form_improve_tool", "form_status_check_tool")
    graph.add_edge("form_status_check_tool", "form_field_update_tool")
    graph.set_finish_point("form_field_update_tool")
    return graph.compile()
