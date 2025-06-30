from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from .memory_manager import ConversationMemory
from .rag_system import RAGSystem
import os

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
        
        # 시스템 프롬프트
        self.system_prompt = """당신은 친근하고 도움이 되는 AI 어시스턴트입니다. 
        사용자와의 대화를 기억하고, 제공된 컨텍스트 정보를 활용하여 정확하고 유용한 답변을 제공하세요.
        
        대화 규칙:
        1. 항상 친근하고 도움이 되는 톤을 유지하세요
        2. 이전 대화 내용을 참고하여 맥락에 맞는 답변을 제공하세요
        3. 제공된 컨텍스트 정보가 있다면 그것을 활용하세요
        4. 모르는 내용에 대해서는 솔직하게 말하고, 가능한 정보를 제공하세요
        5. 사용자가 명확하지 않은 질문을 했을 때는 구체적으로 질문하여 명확히 하세요"""
    
    def __call__(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """챗봇 노드 실행"""
        try:
            # 상태에서 필요한 정보 추출
            user_message = state.get("user_message", "")
            session_id = state.get("session_id", "default_session")
            
            if not user_message:
                return {
                    **state,
                    "ai_response": "안녕하세요! 무엇을 도와드릴까요?",
                    "context_used": ""
                }
            
            # 대화 히스토리 가져오기
            conversation_history = self.memory.get_recent_messages(session_id, limit=10)
            
            # RAG를 통한 관련 컨텍스트 검색
            context = self.rag_system.get_context_for_query(user_message, k=3)
            
            # 메시지 구성
            messages = [SystemMessage(content=self.system_prompt)]
            
            # 대화 히스토리 추가
            messages.extend(conversation_history)
            
            # 컨텍스트가 있다면 추가
            if context:
                context_message = f"관련 정보:\n{context}\n\n사용자 질문: {user_message}"
                messages.append(HumanMessage(content=context_message))
            else:
                messages.append(HumanMessage(content=user_message))
            
            # LLM 호출
            response = self.llm.invoke(messages)
            ai_response = response.content
            
            # 대화 히스토리에 메시지 추가
            self.memory.add_message(session_id, HumanMessage(content=user_message))
            self.memory.add_message(session_id, AIMessage(content=ai_response))
            
            return {
                **state,
                "ai_response": ai_response,
                "context_used": context if context else "No relevant context found",
                "conversation_history_length": len(conversation_history) + 2
            }
            
        except Exception as e:
            print(f"Error in chatbot node: {e}")
            return {
                **state,
                "ai_response": "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
                "context_used": "",
                "error": str(e)
            }
    
    def add_knowledge(self, documents: list, metadata: list = None):
        """지식 베이스에 문서 추가"""
        self.rag_system.add_documents(documents, metadata)
    
    def clear_conversation(self, session_id: str):
        """특정 세션의 대화 히스토리 삭제"""
        self.memory.clear_history(session_id)