import requests
import json
import time
from example_knowledge import get_example_knowledge

# 서버 URL (기본값)
BASE_URL = "http://localhost:8000"

def test_chatbot():
    """챗봇 기능 테스트"""
    print("=== 챗봇 테스트 시작 ===\n")
    
    # 1. 새로운 세션 생성
    print("1. 새로운 세션 생성...")
    response = requests.get(f"{BASE_URL}/chat/session/new")
    if response.status_code == 200:
        session_data = response.json()
        session_id = session_data["session_id"]
        print(f"세션 ID: {session_id}")
    else:
        print("세션 생성 실패")
        return
    
    # 2. 지식 베이스에 예제 문서 추가
    print("\n2. 지식 베이스에 예제 문서 추가...")
    knowledge = get_example_knowledge()
    
    response = requests.post(f"{BASE_URL}/chat/add-knowledge/", json=knowledge)
    if response.status_code == 200:
        print(f"지식 베이스에 {len(knowledge['documents'])}개 문서 추가 완료")
    else:
        print("지식 베이스 추가 실패")
    
    # 3. 대화 테스트
    print("\n3. 대화 테스트...")
    
    test_messages = [
        "안녕하세요!",
        "회사에 대해 알려주세요",
        "어떤 기술 스택을 사용하나요?",
        "연봉과 복리후생은 어떻게 되나요?",
        "Python에 대해 설명해주세요",
        "이전에 말씀해주신 회사 정보를 다시 정리해주세요"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n--- 대화 {i} ---")
        print(f"사용자: {message}")
        
        chat_data = {
            "message": message,
            "session_id": session_id
        }
        
        response = requests.post(f"{BASE_URL}/chat/", json=chat_data)
        if response.status_code == 200:
            result = response.json()
            print(f"AI: {result['ai_response']}")
            if result.get('context_used') and result['context_used'] != "No relevant context found":
                print(f"사용된 컨텍스트: {result['context_used'][:100]}...")
            print(f"대화 히스토리 길이: {result['conversation_history_length']}")
        else:
            print(f"대화 실패: {response.text}")
        
        time.sleep(1)  # 요청 간 간격
    
    # 4. 대화 히스토리 삭제 테스트
    print("\n4. 대화 히스토리 삭제...")
    response = requests.delete(f"{BASE_URL}/chat/clear/{session_id}")
    if response.status_code == 200:
        print("대화 히스토리 삭제 완료")
    else:
        print("대화 히스토리 삭제 실패")
    
    print("\n=== 챗봇 테스트 완료 ===")

if __name__ == "__main__":
    test_chatbot()