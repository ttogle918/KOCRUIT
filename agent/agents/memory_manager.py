from typing import Dict, List, Optional
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
import json
import redis
import os
from datetime import datetime

class ConversationMemory:
    def __init__(self, redis_url: str = None):
        """대화 메모리 관리자 초기화"""
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = redis.from_url(self.redis_url)
        
    def get_conversation_history(self, session_id: str) -> List[BaseMessage]:
        """세션 ID로 대화 히스토리 조회"""
        try:
            history_data = self.redis_client.get(f"conversation:{session_id}")
            if history_data:
                history = json.loads(history_data)
                messages = []
                for msg in history:
                    if msg["type"] == "human":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["type"] == "ai":
                        messages.append(AIMessage(content=msg["content"]))
                return messages
            return []
        except Exception as e:
            print(f"Error retrieving conversation history: {e}")
            return []
    
    def add_message(self, session_id: str, message: BaseMessage):
        """대화 히스토리에 메시지 추가"""
        try:
            history = self.get_conversation_history(session_id)
            history.append(message)
            
            # Redis에 저장할 수 있는 형태로 변환
            history_data = []
            for msg in history:
                if isinstance(msg, HumanMessage):
                    history_data.append({"type": "human", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    history_data.append({"type": "ai", "content": msg.content})
            
            # Redis에 저장 (24시간 만료)
            self.redis_client.setex(
                f"conversation:{session_id}",
                86400,  # 24시간
                json.dumps(history_data)
            )
        except Exception as e:
            print(f"Error adding message to history: {e}")
    
    def clear_history(self, session_id: str):
        """세션의 대화 히스토리 삭제"""
        try:
            self.redis_client.delete(f"conversation:{session_id}")
        except Exception as e:
            print(f"Error clearing conversation history: {e}")
    
    def get_recent_messages(self, session_id: str, limit: int = 10) -> List[BaseMessage]:
        """최근 N개의 메시지만 조회"""
        history = self.get_conversation_history(session_id)
        return history[-limit:] if len(history) > limit else history