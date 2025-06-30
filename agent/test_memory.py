import os
import sys
from dotenv import load_dotenv
import uuid

# 환경 변수 로드
load_dotenv()

# agents 폴더를 Python 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'agents'))

from memory_manager import ConversationMemory
from langchain_core.messages import HumanMessage, AIMessage

def test_conversation_memory():
    """대화 기록 저장 기능 테스트"""
    print("=== 대화 기록 저장 기능 테스트 시작 ===\n")
    
    try:
        # 1. 메모리 매니저 초기화
        print("1. 메모리 매니저 초기화...")
        memory = ConversationMemory()
        print("✅ 메모리 매니저 초기화 성공")
        
        # 2. 테스트 세션 ID 생성
        session_id = str(uuid.uuid4())
        print(f"테스트 세션 ID: {session_id}")
        
        # 3. 초기 대화 히스토리 확인 (비어있어야 함)
        print("\n2. 초기 대화 히스토리 확인...")
        initial_history = memory.get_conversation_history(session_id)
        print(f"초기 히스토리 길이: {len(initial_history)}")
        
        # 4. 대화 메시지 추가
        print("\n3. 대화 메시지 추가...")
        
        test_conversation = [
            (HumanMessage(content="안녕하세요!"), "사용자"),
            (AIMessage(content="안녕하세요! 무엇을 도와드릴까요?"), "AI"),
            (HumanMessage(content="Python에 대해 알려주세요"), "사용자"),
            (AIMessage(content="Python은 1991년 귀도 반 로섬이 개발한 프로그래밍 언어입니다."), "AI"),
            (HumanMessage(content="그럼 머신러닝은?"), "사용자"),
            (AIMessage(content="머신러닝은 데이터로부터 패턴을 학습하는 AI 기술입니다."), "AI")
        ]
        
        for message, sender in test_conversation:
            memory.add_message(session_id, message)
            print(f"✅ {sender} 메시지 추가: {message.content[:30]}...")
        
        # 5. 저장된 대화 히스토리 확인
        print("\n4. 저장된 대화 히스토리 확인...")
        saved_history = memory.get_conversation_history(session_id)
        print(f"저장된 히스토리 길이: {len(saved_history)}")
        
        for i, msg in enumerate(saved_history):
            sender = "사용자" if isinstance(msg, HumanMessage) else "AI"
            print(f"메시지 {i+1} ({sender}): {msg.content[:50]}...")
        
        # 6. 최근 메시지만 조회 테스트
        print("\n5. 최근 메시지 조회 테스트...")
        recent_messages = memory.get_recent_messages(session_id, limit=3)
        print(f"최근 3개 메시지:")
        for i, msg in enumerate(recent_messages):
            sender = "사용자" if isinstance(msg, HumanMessage) else "AI"
            print(f"  {i+1}. {sender}: {msg.content[:30]}...")
        
        # 7. 새로운 세션에서 대화 히스토리 분리 확인
        print("\n6. 세션 분리 확인...")
        new_session_id = str(uuid.uuid4())
        new_history = memory.get_conversation_history(new_session_id)
        print(f"새 세션 히스토리 길이: {len(new_history)} (비어있어야 함)")
        
        # 8. 대화 히스토리 삭제 테스트
        print("\n7. 대화 히스토리 삭제 테스트...")
        memory.clear_history(session_id)
        cleared_history = memory.get_conversation_history(session_id)
        print(f"삭제 후 히스토리 길이: {len(cleared_history)} (0이어야 함)")
        
        print("\n✅ 대화 기록 저장 기능 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 대화 기록 저장 기능 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_conversation_memory() 