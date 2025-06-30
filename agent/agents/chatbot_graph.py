from langgraph.graph import Graph, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, Any, TypedDict
from .chatbot_node import ChatbotNode
import uuid

# 상태 타입 정의
class ChatState(TypedDict):
    user_message: str
    session_id: str
    ai_response: str
    context_used: str
    conversation_history_length: int
    error: str

def create_chatbot_graph():
    """대화 기억과 RAG를 활용하는 챗봇 그래프 생성"""
    
    # 상태 그래프 생성
    workflow = StateGraph(ChatState)
    
    # 챗봇 노드 생성
    chatbot_node = ChatbotNode()
    
    # 노드 추가
    workflow.add_node("chatbot", chatbot_node)
    
    # 엔트리 포인트 설정
    workflow.set_entry_point("chatbot")
    
    # 종료 포인트 설정
    workflow.set_finish_point("chatbot")
    
    # 메모리 저장소 설정 (대화 상태 유지)
    memory = MemorySaver()
    
    return workflow.compile(checkpointer=memory)

def create_session_id() -> str:
    """새로운 세션 ID 생성"""
    return str(uuid.uuid4())

def initialize_chat_state(user_message: str, session_id: str = None) -> ChatState:
    """챗봇 상태 초기화"""
    if not session_id:
        session_id = create_session_id()
    
    return ChatState(
        user_message=user_message,
        session_id=session_id,
        ai_response="",
        context_used="",
        conversation_history_length=0,
        error=""
    )