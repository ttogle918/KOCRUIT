import os
import sys
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# agents 폴더를 Python 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'agents'))

from rag_system import RAGSystem

def test_rag_system():
    """RAG 시스템 테스트"""
    print("=== RAG 시스템 테스트 시작 ===\n")
    
    try:
        # 1. RAG 시스템 초기화
        print("1. RAG 시스템 초기화...")
        rag = RAGSystem()
        print("✅ RAG 시스템 초기화 성공")
        
        # 2. 테스트 문서 추가
        print("\n2. 테스트 문서 추가...")
        test_documents = [
            "Python은 1991년 귀도 반 로섬이 개발한 프로그래밍 언어입니다. 간결하고 읽기 쉬운 문법이 특징입니다.",
            "머신러닝은 데이터로부터 패턴을 학습하여 예측이나 분류를 수행하는 인공지능의 한 분야입니다.",
            "딥러닝은 인공신경망을 기반으로 한 머신러닝 기법으로, 복잡한 패턴을 학습할 수 있습니다."
        ]
        
        test_metadata = [
            {"source": "python_intro", "topic": "programming"},
            {"source": "ml_intro", "topic": "machine_learning"},
            {"source": "dl_intro", "topic": "deep_learning"}
        ]
        
        rag.add_documents(test_documents, test_metadata)
        print("✅ 테스트 문서 추가 성공")
        
        # 3. 검색 테스트
        print("\n3. 검색 테스트...")
        
        test_queries = [
            "Python에 대해 알려주세요",
            "머신러닝이 무엇인가요?",
            "딥러닝과 머신러닝의 차이점"
        ]
        
        for query in test_queries:
            print(f"\n--- 쿼리: '{query}' ---")
            
            # 유사도 검색
            similar_docs = rag.search_similar(query, k=2)
            print(f"검색된 문서 수: {len(similar_docs)}")
            
            for i, doc in enumerate(similar_docs):
                print(f"문서 {i+1}: {doc.page_content[:100]}...")
                print(f"메타데이터: {doc.metadata}")
            
            # 컨텍스트 생성
            context = rag.get_context_for_query(query, k=2)
            print(f"생성된 컨텍스트 길이: {len(context)} 문자")
        
        # 4. 유사도 점수 테스트
        print("\n4. 유사도 점수 테스트...")
        results_with_score = rag.search_with_score("Python 프로그래밍", k=2)
        for doc, score in results_with_score:
            print(f"점수: {score:.4f} - {doc.page_content[:50]}...")
        
        print("\n✅ RAG 시스템 테스트 완료!")
        
    except Exception as e:
        print(f"❌ RAG 시스템 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_rag_system() 