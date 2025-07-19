#!/usr/bin/env python3
"""
Interview Question DB 저장 기능 테스트 스크립트
"""

import requests
import json
import time

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1"

def test_integrated_questions_with_db_save():
    """통합 질문 생성 및 DB 저장 테스트"""
    print("=== 통합 질문 생성 및 DB 저장 테스트 ===")
    
    # 테스트 데이터
    test_data = {
        "resume_id": 1,  # 실제 존재하는 resume_id 사용
        "application_id": 41,  # 실제 존재하는 application_id 사용
        "company_name": "KOSA공공",
        "name": "홍길동"
    }
    
    try:
        # 통합 질문 생성 API 호출
        response = requests.post(
            f"{BASE_URL}/interview-questions/integrated-questions",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✓ 통합 질문 생성 성공")
            print(f"생성된 질문 개수: {len(result.get('questions', []))}")
            print(f"질문 번들 키: {list(result.get('question_bundle', {}).keys())}")
            
            # DB 저장 확인
            print("\n--- DB 저장 확인 ---")
            time.sleep(2)  # DB 저장 완료 대기
            
            # 저장된 질문 조회
            db_response = requests.get(
                f"{BASE_URL}/interview-questions/application/{test_data['application_id']}"
            )
            
            if db_response.status_code == 200:
                saved_questions = db_response.json()
                print(f"✓ DB에서 조회된 질문 개수: {len(saved_questions)}")
                
                # 유형별 분류 조회
                type_response = requests.get(
                    f"{BASE_URL}/interview-questions/application/{test_data['application_id']}/by-type"
                )
                
                if type_response.status_code == 200:
                    type_data = type_response.json()
                    print("\n유형별 질문 개수:")
                    for question_type, questions in type_data.items():
                        print(f"  {question_type}: {len(questions)}")
                else:
                    print(f"✗ 유형별 조회 실패: {type_response.status_code}")
            else:
                print(f"✗ DB 조회 실패: {db_response.status_code}")
        else:
            print(f"✗ 통합 질문 생성 실패: {response.status_code}")
            print(f"응답: {response.text}")
            
    except Exception as e:
        print(f"✗ 테스트 실행 중 오류: {e}")

def test_bulk_question_creation():
    """대량 질문 생성 테스트"""
    print("\n=== 대량 질문 생성 테스트 ===")
    
    test_data = {
        "application_id": 41,
        "questions": [
            {
                "type": "common",
                "question_text": "자기소개를 해주세요.",
                "category": "인성/동기",
                "difficulty": "easy"
            },
            {
                "type": "personal",
                "question_text": "이력서에 있는 프로젝트 경험에 대해 설명해주세요.",
                "category": "프로젝트 경험",
                "difficulty": "medium"
            },
            {
                "type": "company",
                "question_text": "우리 회사에 지원한 이유는 무엇인가요?",
                "category": "회사 관련",
                "difficulty": "medium"
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/interview-questions/bulk-create",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 대량 질문 생성 성공: {len(result)}개")
            
            for question in result:
                print(f"  - {question['type']}: {question['question_text'][:50]}...")
        else:
            print(f"✗ 대량 질문 생성 실패: {response.status_code}")
            print(f"응답: {response.text}")
            
    except Exception as e:
        print(f"✗ 테스트 실행 중 오류: {e}")

def test_question_retrieval():
    """질문 조회 테스트"""
    print("\n=== 질문 조회 테스트 ===")
    
    application_id = 41
    
    try:
        # 전체 질문 조회
        response = requests.get(f"{BASE_URL}/interview-questions/application/{application_id}")
        
        if response.status_code == 200:
            questions = response.json()
            print(f"✓ 전체 질문 조회 성공: {len(questions)}개")
            
            # 유형별 통계
            type_counts = {}
            for question in questions:
                q_type = question.get('type', 'unknown')
                type_counts[q_type] = type_counts.get(q_type, 0) + 1
            
            print("유형별 질문 개수:")
            for q_type, count in type_counts.items():
                print(f"  {q_type}: {count}")
        else:
            print(f"✗ 질문 조회 실패: {response.status_code}")
            
    except Exception as e:
        print(f"✗ 테스트 실행 중 오류: {e}")

def test_langgraph_workflow_integration():
    """LangGraph 워크플로우 통합 테스트"""
    print("\n=== LangGraph 워크플로우 통합 테스트 ===")
    
    test_data = {
        "resume_id": 1,
        "application_id": 41,
        "company_name": "KOSA공공",
        "name": "홍길동"
    }
    
    try:
        # 프로젝트 질문 생성 (LangGraph 워크플로우 사용)
        response = requests.post(
            f"{BASE_URL}/interview-questions/project-questions",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✓ LangGraph 워크플로우 질문 생성 성공")
            print(f"생성된 질문 개수: {len(result.get('questions', []))}")
            print(f"질문 번들 키: {list(result.get('question_bundle', {}).keys())}")
            
            # DB 저장 확인
            time.sleep(2)
            db_response = requests.get(
                f"{BASE_URL}/interview-questions/application/{test_data['application_id']}/by-type"
            )
            
            if db_response.status_code == 200:
                type_data = db_response.json()
                print("\nDB에 저장된 유형별 질문:")
                for question_type, questions in type_data.items():
                    if questions:
                        print(f"  {question_type}: {len(questions)}개")
            else:
                print(f"✗ DB 조회 실패: {db_response.status_code}")
        else:
            print(f"✗ LangGraph 워크플로우 실패: {response.status_code}")
            print(f"응답: {response.text}")
            
    except Exception as e:
        print(f"✗ 테스트 실행 중 오류: {e}")

def main():
    """메인 테스트 실행"""
    print("Interview Question DB 저장 기능 테스트 시작")
    print("=" * 50)
    
    # 1. 통합 질문 생성 및 DB 저장 테스트
    test_integrated_questions_with_db_save()
    
    # 2. 대량 질문 생성 테스트
    test_bulk_question_creation()
    
    # 3. 질문 조회 테스트
    test_question_retrieval()
    
    # 4. LangGraph 워크플로우 통합 테스트
    test_langgraph_workflow_integration()
    
    print("\n" + "=" * 50)
    print("테스트 완료")

if __name__ == "__main__":
    main() 