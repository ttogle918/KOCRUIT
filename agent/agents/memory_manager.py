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
        
    def get_conversation_history(self, session_id: str, user_id: str = None) -> List[BaseMessage]:
        """세션 ID 또는 사용자 ID로 대화 히스토리 조회"""
        try:
            # 사용자 ID가 있으면 사용자 기반, 없으면 세션 기반
            if user_id:
                key = f"user_conversation:{user_id}"
                ttl = 86400 * 7  # 사용자 대화는 7일 보존
            else:
                key = f"conversation:{session_id}"
                ttl = 86400  # 세션 대화는 24시간 보존
            
            history_data = self.redis_client.get(key)
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
    
    def add_message(self, session_id: str, message: BaseMessage, user_id: str = None):
        """대화 히스토리에 메시지 추가 (세션 및 사용자 기반)"""
        try:
            # 세션 기반 저장
            self._add_message_to_key(f"conversation:{session_id}", message, 86400)
            
            # 사용자 ID가 있으면 사용자 기반도 저장
            if user_id:
                self._add_message_to_key(f"user_conversation:{user_id}", message, 86400 * 7)
                
        except Exception as e:
            print(f"Error adding message to history: {e}")
    
    def _add_message_to_key(self, key: str, message: BaseMessage, ttl: int):
        """특정 키에 메시지 추가"""
        try:
            history = self._get_messages_from_key(key)
            history.append(message)
            
            # Redis에 저장할 수 있는 형태로 변환
            history_data = []
            for msg in history:
                if isinstance(msg, HumanMessage):
                    history_data.append({"type": "human", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    history_data.append({"type": "ai", "content": msg.content})
            
            # Redis에 저장
            self.redis_client.setex(key, ttl, json.dumps(history_data))
        except Exception as e:
            print(f"Error adding message to key {key}: {e}")
    
    def _get_messages_from_key(self, key: str) -> List[BaseMessage]:
        """특정 키에서 메시지 조회"""
        try:
            history_data = self.redis_client.get(key)
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
            print(f"Error retrieving messages from key {key}: {e}")
            return []
    
    def clear_history(self, session_id: str, user_id: str = None):
        """세션 또는 사용자의 대화 히스토리 삭제"""
        try:
            # 세션 기반 삭제
            self.redis_client.delete(f"conversation:{session_id}")
            
            # 사용자 ID가 있으면 사용자 기반도 삭제
            if user_id:
                self.redis_client.delete(f"user_conversation:{user_id}")
        except Exception as e:
            print(f"Error clearing conversation history: {e}")
    
    def get_recent_messages(self, session_id: str, limit: int = 10, user_id: str = None) -> List[BaseMessage]:
        """최근 N개의 메시지만 조회"""
        history = self.get_conversation_history(session_id, user_id)
        return history[-limit:] if len(history) > limit else history
    
    def get_user_conversation_summary(self, user_id: str) -> Dict:
        """사용자의 대화 요약 정보"""
        try:
            key = f"user_conversation:{user_id}"
            history_data = self.redis_client.get(key)
            if history_data:
                history = json.loads(history_data)
                return {
                    "total_messages": len(history),
                    "last_conversation": history[-1]["content"][:100] + "..." if history else "",
                    "conversation_count": len([msg for msg in history if msg["type"] == "human"])
                }
            return {"total_messages": 0, "last_conversation": "", "conversation_count": 0}
        except Exception as e:
            print(f"Error getting user conversation summary: {e}")
            return {"total_messages": 0, "last_conversation": "", "conversation_count": 0}