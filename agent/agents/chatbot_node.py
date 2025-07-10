from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from .memory_manager import ConversationMemory
from .rag_system import RAGSystem
import os
import redis
import json

# Redis 연결 (싱글턴)
_redis_client = None
def get_redis_client():
    global _redis_client
    if _redis_client is None:
        # 환경변수에서 Redis URL 읽기 (Docker 환경용)
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        if redis_url.startswith("redis://"):
            # redis:// 형식 파싱
            from urllib.parse import urlparse
            parsed = urlparse(redis_url)
            _redis_client = redis.Redis(
                host=parsed.hostname or 'localhost',
                port=parsed.port or 6379,
                db=0,
                decode_responses=True
            )
        else:
            # 기존 방식 (host:port)
            _redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    return _redis_client

# 세션별 대화 기록 저장
REDIS_SESSION_PREFIX = 'chat_session:'
REDIS_SESSION_TTL = 60 * 60 * 24  # 24시간

def save_message_to_history(session_id, role, message):
    client = get_redis_client()
    key = REDIS_SESSION_PREFIX + session_id
    entry = json.dumps({'role': role, 'message': message})
    client.rpush(key, entry)
    client.expire(key, REDIS_SESSION_TTL)

def get_conversation_history(session_id, limit=10):
    client = get_redis_client()
    key = REDIS_SESSION_PREFIX + session_id
    entries = client.lrange(key, -limit, -1)
    return [json.loads(e) for e in entries]

class ChatbotNode:
    def __init__(self):
        """챗봇 노드 초기화"""
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.memory = ConversationMemory()
        self.rag_system = RAGSystem()
        
        # 페이지별 시스템 프롬프트
        self.page_prompts = {
            '/': "메인 홈페이지입니다. 코크루트 서비스 소개와 주요 기능을 안내해주세요.",
            '/login': "로그인 페이지입니다. 로그인 방법과 계정 관련 도움을 제공해주세요.",
            '/signup': "회원가입 페이지입니다. 가입 절차와 필요한 정보를 안내해주세요.",
            '/joblist': "채용공고 목록 페이지입니다. 채용공고 검색과 필터링 방법을 도와주세요.",
            '/mypage': "마이페이지입니다. 개인정보 관리와 설정 변경을 도와주세요.",
            '/corporatehome': "기업 홈페이지입니다. 기업용 기능과 채용 관리 도구를 안내해주세요.",
            '/applicantlist': "지원자 목록 페이지입니다. 지원자 관리와 이력서 검토를 도와주세요.",
            '/postrecruitment': "채용공고 등록 페이지입니다. 공고 작성과 등록 방법을 안내해주세요.",
            '/editpost': "채용공고 수정 페이지입니다. 기존 공고 내용 수정과 업데이트 방법을 안내해주세요.",
            '/viewpost': "채용공고 상세보기 페이지입니다. 공고 내용 확인과 지원 관련 정보를 제공해주세요.",
            '/email': "이메일 발송 페이지입니다. 지원자에게 이메일 발송 방법을 도와주세요.",
            '/managerschedule': "매니저 일정 관리 페이지입니다. 면접 일정 관리와 조율을 도와주세요.",
            '/memberschedule': "멤버 일정 관리 페이지입니다. 개인 일정 관리와 확인을 도와주세요.",
            '/passedapplicants': "합격자 목록 페이지입니다. 합격자 관리와 다음 단계 진행을 도와주세요.",
            '/rejectedapplicants': "불합격자 목록 페이지입니다. 불합격자 관리와 피드백 제공을 도와주세요.",
            '/interview-progress': "면접 진행 상황 페이지입니다. 면접 일정과 진행 상태를 확인하고 관리해주세요.",
            '/common/company': "파트너사 목록 페이지입니다. 협력 기업 정보와 채용공고를 확인해주세요.",
            '/common/company/:id': "파트너사 상세 페이지입니다. 특정 기업의 상세 정보와 채용공고를 확인해주세요.",
            '/common/jobposts/:id': "공개 채용공고 상세 페이지입니다. 공개된 채용공고 내용을 확인하고 지원 방법을 안내해주세요.",
            '/company/jobposts/:id': "기업 채용공고 상세 페이지입니다. 내 기업의 채용공고를 확인하고 관리해주세요.",
            '/applicantlist/:jobPostId': "특정 채용공고의 지원자 목록 페이지입니다. 해당 공고에 지원한 지원자들을 관리해주세요.",
            '/role-test': "역할 테스트 페이지입니다. 사용자 역할과 권한을 확인해주세요.",
            '/test-connection': "연결 테스트 페이지입니다. 시스템 연결 상태를 확인해주세요."
        }
        
        # 기본 시스템 프롬프트
        self.base_system_prompt = """당신은 친근하고 도움이 되는 AI 어시스턴트입니다. 
        사용자와의 대화를 기억하고, 제공된 컨텍스트 정보를 활용하여 정확하고 유용한 답변을 제공하세요.
        
        페이지 컨텍스트 처리 규칙:
        1. 페이지의 전체 내용을 읽고 이해하세요
        2. 제목(heading)과 입력 필드의 라벨(label)을 정확히 구별하세요
        3. placeholder는 입력 힌트일 뿐, 제목으로 사용하지 마세요
        4. 관련된 요소들을 그룹으로 묶어서 이해하세요
        5. 폼 구조와 입력 필드의 관계를 파악하세요
        6. 테이블 데이터와 링크 정보를 활용하세요
        
        대화 규칙:
        1. 항상 친근하고 도움이 되는 톤을 유지하세요
        2. 이전 대화 내용을 참고하여 맥락에 맞는 답변을 제공하세요
        3. 제공된 컨텍스트 정보가 있다면 그것을 활용하세요
        4. 모르는 내용에 대해서는 솔직하게 말하고, 가능한 정보를 제공하세요
        5. 사용자가 명확하지 않은 질문을 했을 때는 구체적으로 질문하여 명확히 하세요
        6. 현재 페이지 정보를 활용하여 페이지별 맞춤 도움을 제공하세요
        7. 입력 필드의 실제 라벨과 현재 값을 정확히 파악하여 도움을 제공하세요"""
    
    def __call__(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """챗봇 노드 실행"""
        try:
            # 상태에서 필요한 정보 추출
            user_message = state.get("user_message", "")
            session_id = state.get("session_id", "default_session")
            page_context = state.get("page_context", {})
            
            if not user_message:
                return {
                    **state,
                    "ai_response": "안녕하세요! 무엇을 도와드릴까요?",
                    "context_used": ""
                }
            
            # 1. 이전 대화 기록 불러오기
            history = get_conversation_history(session_id, limit=10)
            history_prompt = ''
            for h in history:
                if h['role'] == 'user':
                    history_prompt += f"User: {h['message']}\n"
                else:
                    history_prompt += f"AI: {h['message']}\n"
            
            # 2. 이번 메시지 저장
            save_message_to_history(session_id, 'user', user_message)
            
            # 3. 프롬프트 생성 (이전 대화 + 현재 메시지 + 페이지 컨텍스트)
            prompt = f"{history_prompt}User: {user_message}\n"
            if page_context:
                prompt += f"[PageContext: {json.dumps(page_context, ensure_ascii=False)}]\n"
            prompt += "AI: "
            
            # 4. LLM 호출
            response = self.llm.invoke(prompt)
            ai_response = response.content
            
            # 5. AI 응답 저장
            save_message_to_history(session_id, 'ai', ai_response)
            
            # 페이지별 제안사항 생성
            page_suggestions = self._generate_page_suggestions(page_context, user_message)
            
            # DOM 액션 생성 (필요한 경우)
            dom_actions = self._generate_dom_actions(page_context, user_message)
            
            return {
                **state,
                "ai_response": ai_response,
                "context_used": prompt,
                "conversation_history_length": len(history) + 1,
                "page_suggestions": page_suggestions,
                "dom_actions": dom_actions
            }
            
        except Exception as e:
            print(f"Error in chatbot node: {e}")
            return {
                **state,
                "ai_response": "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
                "context_used": "",
                "error": str(e),
                "page_suggestions": [],
                "dom_actions": []
            }
    
    def _generate_system_prompt(self, page_context: Dict[str, Any]) -> str:
        """페이지 컨텍스트를 기반으로 시스템 프롬프트 생성"""
        pathname = page_context.get("pathname", "")
        page_prompt = self.page_prompts.get(pathname, "")
        
        if page_prompt:
            return f"{self.base_system_prompt}\n\n{page_prompt}"
        else:
            return self.base_system_prompt
    
    def _format_page_context(self, page_context: Dict[str, Any]) -> str:
        """페이지 컨텍스트를 포맷팅 - 전체 페이지 내용을 읽고 구조화"""
        pathname = page_context.get("pathname", "")
        page_title = page_context.get("pageTitle", "")
        dom_elements = page_context.get("domElements", {})
        page_structure = page_context.get("pageStructure", {})
        
        context_parts = [
            f"현재 페이지: {pathname}",
            f"페이지 제목: {page_title}"
        ]
        
        # 페이지 구조 정보 추가
        if page_structure:
            structure_info = self._analyze_page_structure(page_structure)
            if structure_info:
                context_parts.append(f"페이지 구조:\n{structure_info}")
        
        # DOM 요소 정보를 구조화하여 분석
        if dom_elements:
            # 전체 페이지 텍스트 내용 수집
            page_text_content = self._extract_page_text_content(dom_elements)
            if page_text_content:
                context_parts.append(f"페이지 내용:\n{page_text_content}")
            
            # 제목 구조 분석
            headings = dom_elements.get("headings", [])
            if headings:
                heading_info = self._analyze_headings(headings)
                context_parts.append(f"제목 구조:\n{heading_info}")
            
            # 구조화된 폼 정보
            forms = dom_elements.get("forms", [])
            if forms:
                form_info = self._analyze_forms(forms, dom_elements)
                context_parts.append(f"폼 구조:\n{form_info}")
            
            # 입력 필드 그룹화 분석
            inputs = dom_elements.get("inputs", [])
            if inputs:
                input_groups = self._group_related_inputs(inputs, dom_elements)
                context_parts.append(f"입력 필드 그룹:\n{input_groups}")
            
            # 버튼 및 액션 요소
            buttons = dom_elements.get("buttons", [])
            if buttons:
                button_info = self._analyze_buttons(buttons)
                context_parts.append(f"액션 버튼:\n{button_info}")
            
            # 링크 분석
            links = dom_elements.get("links", [])
            if links:
                link_info = self._analyze_links(links)
                context_parts.append(f"링크:\n{link_info}")
            
            # 테이블 데이터 분석
            tables = dom_elements.get("tables", [])
            if tables:
                table_info = self._analyze_tables(tables)
                context_parts.append(f"테이블 데이터:\n{table_info}")
        
        return "\n\n".join(context_parts)
    
    def _extract_page_text_content(self, dom_elements: Dict[str, Any]) -> str:
        """페이지의 모든 텍스트 내용을 추출"""
        all_text = []
        
        # 입력 필드의 실제 값과 라벨 정보
        inputs = dom_elements.get("inputs", [])
        for input_elem in inputs:
            input_info = []
            
            # 입력 필드 타입과 이름
            input_type = input_elem.get("type", "text")
            input_name = input_elem.get("name", "")
            if input_name:
                input_info.append(f"필드명: {input_name}")
            
            # 실제 입력된 값
            input_value = input_elem.get("value", "")
            if input_value:
                input_info.append(f"입력값: {input_value}")
            
            # placeholder는 힌트로만 사용
            placeholder = input_elem.get("placeholder", "")
            if placeholder:
                input_info.append(f"힌트: {placeholder}")
            
            if input_info:
                all_text.append(f"[{input_type} 입력필드] {' | '.join(input_info)}")
        
        # 버튼 텍스트
        buttons = dom_elements.get("buttons", [])
        for button in buttons:
            button_text = button.get("text", "")
            if button_text:
                all_text.append(f"[버튼] {button_text}")
        
        return "\n".join(all_text) if all_text else "텍스트 내용 없음"
    
    def _analyze_forms(self, forms: list, dom_elements: Dict[str, Any]) -> str:
        """폼 구조를 분석하여 관련 요소들을 그룹화"""
        form_analysis = []
        
        for i, form in enumerate(forms):
            form_info = [f"폼 {i+1}:"]
            
            # 폼의 기본 정보
            if form.get("id"):
                form_info.append(f"  ID: {form['id']}")
            if form.get("className"):
                form_info.append(f"  클래스: {form['className']}")
            if form.get("action"):
                form_info.append(f"  액션: {form['action']}")
            
            # 해당 폼과 관련된 입력 필드들 찾기
            inputs = dom_elements.get("inputs", [])
            form_inputs = []
            for input_elem in inputs:
                # 폼 내부의 입력 필드인지 확인 (간단한 추정)
                if input_elem.get("name") or input_elem.get("id"):
                    form_inputs.append(input_elem)
            
            if form_inputs:
                form_info.append("  관련 입력 필드:")
                for input_elem in form_inputs[:5]:  # 최대 5개만
                    input_desc = []
                    if input_elem.get("name"):
                        input_desc.append(f"이름: {input_elem['name']}")
                    if input_elem.get("type"):
                        input_desc.append(f"타입: {input_elem['type']}")
                    if input_elem.get("value"):
                        input_desc.append(f"값: {input_elem['value']}")
                    if input_desc:
                        form_info.append(f"    - {' | '.join(input_desc)}")
            
            form_analysis.append("\n".join(form_info))
        
        return "\n\n".join(form_analysis) if form_analysis else "폼 정보 없음"
    
    def _group_related_inputs(self, inputs: list, dom_elements: Dict[str, Any]) -> str:
        """관련된 입력 필드들을 그룹화하여 분석"""
        if not inputs:
            return "입력 필드 없음"
        
        # 입력 필드들을 타입별로 그룹화
        input_groups = {}
        for input_elem in inputs:
            input_type = input_elem.get("type", "text")
            if input_type not in input_groups:
                input_groups[input_type] = []
            input_groups[input_type].append(input_elem)
        
        group_analysis = []
        for input_type, type_inputs in input_groups.items():
            group_info = [f"[{input_type} 타입 입력 필드들]"]
            
            for input_elem in type_inputs:
                input_desc = []
                
                # 라벨 정보 (실제 제목)
                field_label = input_elem.get("label", "")
                if field_label:
                    input_desc.append(f"제목: {field_label}")
                
                # 필드 이름
                field_name = input_elem.get("name", "")
                if field_name:
                    input_desc.append(f"필드명: {field_name}")
                
                # ID 정보
                field_id = input_elem.get("id", "")
                if field_id:
                    input_desc.append(f"ID: {field_id}")
                
                # 실제 입력된 값
                field_value = input_elem.get("value", "")
                if field_value:
                    input_desc.append(f"현재값: {field_value}")
                
                # 필수 여부
                if input_elem.get("required", False):
                    input_desc.append("필수")
                
                # 비활성화 여부
                if input_elem.get("disabled", False):
                    input_desc.append("비활성화")
                
                # placeholder는 참고용 힌트 (제목이 아닌 힌트로만 사용)
                placeholder = input_elem.get("placeholder", "")
                if placeholder and not field_label:  # 라벨이 없을 때만 placeholder를 참고
                    input_desc.append(f"힌트: {placeholder}")
                
                if input_desc:
                    group_info.append(f"  - {' | '.join(input_desc)}")
            
            group_analysis.append("\n".join(group_info))
        
        # 관련 필드 그룹화 (이름 패턴 기반)
        related_groups = self._find_related_field_groups(inputs)
        if related_groups:
            group_analysis.append("\n[관련 필드 그룹]")
            for group_name, group_fields in related_groups.items():
                group_analysis.append(f"  {group_name}:")
                for field in group_fields:
                    field_info = []
                    if field.get("label"):
                        field_info.append(field["label"])
                    if field.get("name"):
                        field_info.append(f"({field['name']})")
                    if field_info:
                        group_analysis.append(f"    - {' | '.join(field_info)}")
        
        return "\n\n".join(group_analysis)
    
    def _find_related_field_groups(self, inputs: list) -> Dict[str, list]:
        """이름 패턴을 기반으로 관련 필드들을 그룹화"""
        related_groups = {}
        
        # 일반적인 필드 그룹 패턴
        group_patterns = {
            "개인정보": ["name", "email", "phone", "address", "birth", "gender"],
            "회사정보": ["company", "department", "position", "employee"],
            "계정정보": ["username", "password", "confirm", "login"],
            "주소정보": ["address", "city", "state", "zip", "country"],
            "날짜시간": ["date", "time", "start", "end", "schedule"],
            "금액정보": ["salary", "price", "amount", "cost", "budget"]
        }
        
        for pattern_name, keywords in group_patterns.items():
            matching_fields = []
            for input_elem in inputs:
                field_name = input_elem.get("name", "").lower()
                field_label = input_elem.get("label", "").lower()
                
                # 키워드와 매칭되는지 확인
                for keyword in keywords:
                    if keyword in field_name or keyword in field_label:
                        matching_fields.append(input_elem)
                        break
            
            if matching_fields:
                related_groups[pattern_name] = matching_fields
        
        return related_groups
    
    def _analyze_buttons(self, buttons: list) -> str:
        """버튼과 액션 요소들을 분석"""
        if not buttons:
            return "버튼 없음"
        
        button_analysis = []
        for i, button in enumerate(buttons):
            button_info = [f"버튼 {i+1}:"]
            
            # 버튼 텍스트 (실제 라벨)
            button_text = button.get("text", "")
            if button_text:
                button_info.append(f"  텍스트: {button_text}")
            
            # 버튼 ID
            button_id = button.get("id", "")
            if button_id:
                button_info.append(f"  ID: {button_id}")
            
            # 버튼 클래스
            button_class = button.get("className", "")
            if button_class:
                button_info.append(f"  클래스: {button_class}")
            
            button_analysis.append("\n".join(button_info))
        
        return "\n\n".join(button_analysis)
    
    def _generate_page_suggestions(self, page_context: Dict[str, Any], user_message: str) -> list:
        """페이지별 제안사항 생성"""
        pathname = page_context.get("pathname", "")
        suggestions = []
        
        # 페이지별 기본 제안사항
        if pathname == "/postrecruitment":
            suggestions.append("채용공고 작성 가이드")
            suggestions.append("자격요건 작성 팁")
        elif pathname == "/applicantlist":
            suggestions.append("지원자 필터링 방법")
            suggestions.append("이력서 검토 체크리스트")
        elif pathname == "/managerschedule":
            suggestions.append("면접 일정 등록")
            suggestions.append("면접관 배정 방법")
        
        return suggestions
    
    def _generate_dom_actions(self, page_context: Dict[str, Any], user_message: str) -> list:
        """DOM 액션 생성"""
        actions = []
        dom_elements = page_context.get("domElements", {})
        inputs = dom_elements.get("inputs", [])
        
        # 사용자 메시지에서 입력 관련 키워드가 있으면 DOM 액션 생성
        input_keywords = ["입력", "작성", "쓰기", "기입", "적기"]
        if any(keyword in user_message for keyword in input_keywords):
            for input_elem in inputs:
                if input_elem.get("placeholder"):
                    actions.append({
                        "action_type": "focus",
                        "selector": f"#{input_elem['id']}" if input_elem.get('id') else f"[name='{input_elem['name']}']",
                        "description": f"{input_elem['placeholder']} 필드에 포커스"
                    })
        
        return actions
    
    def add_knowledge(self, documents: list, metadata: list = None):
        """지식 베이스에 문서 추가"""
        self.rag_system.add_documents(documents, metadata)
    
    def clear_conversation(self, session_id: str):
        """특정 세션의 대화 히스토리 삭제"""
        self.memory.clear_history(session_id)
    
    def update_page_context(self, session_id: str, page_context: Dict[str, Any]):
        """페이지 컨텍스트 업데이트 (향후 확장용)"""
        # 현재는 단순히 로그만 출력
        print(f"Page context updated for session {session_id}: {page_context.get('pathname', 'unknown')}")
    
    def _analyze_page_structure(self, page_structure: Dict[str, Any]) -> str:
        """페이지 구조 정보 분석"""
        structure_parts = []
        
        # 주요 제목
        main_heading = page_structure.get("mainHeading")
        if main_heading:
            structure_parts.append(f"메인 제목: {main_heading}")
        
        # 하위 제목들
        sub_headings = page_structure.get("subHeadings", [])
        if sub_headings:
            structure_parts.append(f"하위 제목들: {', '.join(sub_headings)}")
        
        # 페이지 구성 요소
        components = []
        if page_structure.get("hasForms"):
            components.append("폼")
        if page_structure.get("hasInputs"):
            components.append("입력 필드")
        if page_structure.get("hasButtons"):
            components.append("버튼")
        if page_structure.get("hasTables"):
            components.append("테이블")
        
        if components:
            structure_parts.append(f"페이지 구성: {', '.join(components)}")
        
        return "\n".join(structure_parts)
    
    def _analyze_headings(self, headings: list) -> str:
        """제목 구조 분석"""
        if not headings:
            return "제목 없음"
        
        heading_analysis = []
        for heading in headings:
            level = heading.get("level", "h1")
            text = heading.get("text", "")
            heading_id = heading.get("id", "")
            
            if text:
                heading_info = f"[{level.upper()}] {text}"
                if heading_id:
                    heading_info += f" (ID: {heading_id})"
                heading_analysis.append(heading_info)
        
        return "\n".join(heading_analysis) if heading_analysis else "제목 없음"
    
    def _analyze_links(self, links: list) -> str:
        """링크 분석"""
        if not links:
            return "링크 없음"
        
        link_analysis = []
        for i, link in enumerate(links):
            link_text = link.get("text", "")
            link_href = link.get("href", "")
            
            if link_text:
                link_info = f"링크 {i+1}: {link_text}"
                if link_href:
                    link_info += f" -> {link_href}"
                link_analysis.append(link_info)
        
        return "\n".join(link_analysis) if link_analysis else "링크 없음"
    
    def _analyze_tables(self, tables: list) -> str:
        """테이블 데이터 분석"""
        if not tables:
            return "테이블 없음"
        
        table_analysis = []
        for i, table in enumerate(tables):
            table_info = [f"테이블 {i+1}:"]
            
            rows = table.get("rows", [])
            if rows:
                for j, row in enumerate(rows[:5]):  # 최대 5행만
                    row_data = []
                    for cell in row:
                        cell_text = cell.get("text", "")
                        is_header = cell.get("isHeader", False)
                        if cell_text:
                            prefix = "[헤더]" if is_header else "[데이터]"
                            row_data.append(f"{prefix} {cell_text}")
                    
                    if row_data:
                        table_info.append(f"  행 {j+1}: {' | '.join(row_data)}")
            
            table_analysis.append("\n".join(table_info))
        
        return "\n\n".join(table_analysis) if table_analysis else "테이블 없음"