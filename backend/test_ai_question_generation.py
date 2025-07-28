#!/usr/bin/env python3
"""
AI 개인 질문 생성 API 테스트 스크립트
"""

import requests
import json
import time

def test_ai_question_generation():
    """AI 개인 질문 생성 API 테스트"""
    
    base_url = "http://localhost:8000"
    
    # 테스트할 application_id들
    test_application_ids = [1, 2, 3, 4, 5]
    
    for application_id in test_application_ids:
        url = f"{base_url}/api/v1/interview-questions/job-questions"
        
        # 테스트 데이터
        test_data = {
            "application_id": application_id,
            "company_name": "KOSA공공",
            "resume_data": {
                "personal_info": {
                    "name": "테스트 지원자",
                    "email": "test@example.com",
                    "birthDate": "1990-01-01"
                },
                "education": {
                    "university": "테스트 대학교",
                    "major": "컴퓨터공학",
                    "degree": "학사",
                    "gpa": "3.5"
                },
                "experience": {
                    "companies": ["테스트 회사"],
                    "position": "개발자",
                    "duration": "2년"
                },
                "skills": {
                    "programming_languages": ["Python", "JavaScript"],
                    "frameworks": ["React", "Django"],
                    "databases": ["PostgreSQL", "MongoDB"],
                    "tools": ["Git", "Docker"]
                },
                "projects": ["웹 애플리케이션 개발", "API 설계"],
                "activities": ["개발자 커뮤니티 활동"]
            }
        }
        
        try:
            print(f"\n=== application_id: {application_id} ===")
            print(f"API 호출: {url}")
            print(f"요청 데이터: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
            
            start_time = time.time()
            response = requests.post(url, json=test_data, timeout=30)
            end_time = time.time()
            
            print(f"응답 시간: {end_time - start_time:.2f}초")
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                # 질문 수 확인
                questions = data.get("questions", [])
                question_bundle = data.get("question_bundle", {})
                
                print(f"총 질문 수: {len(questions)}")
                print(f"질문 카테고리 수: {len(question_bundle)}")
                
                if len(questions) > 0:
                    print("✅ AI 개인 질문이 성공적으로 생성되었습니다!")
                    return application_id
                else:
                    print("❌ 질문이 생성되지 않았습니다.")
                    
            else:
                print(f"오류 응답: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.")
            return None
        except requests.exceptions.Timeout:
            print("❌ 요청 시간 초과 (30초)")
        except Exception as e:
            print(f"❌ API 호출 실패: {e}")
    
    return None

def test_backend_health():
    """백엔드 서버 상태 확인"""
    
    base_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{base_url}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ 백엔드 서버가 정상적으로 실행 중입니다.")
            return True
        else:
            print(f"❌ 백엔드 서버 응답 오류: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 백엔드 서버에 연결할 수 없습니다.")
        return False
    except Exception as e:
        print(f"❌ 백엔드 서버 확인 실패: {e}")
        return False

if __name__ == "__main__":
    print("🚀 AI 개인 질문 생성 API 테스트 시작...")
    
    # 1. 백엔드 서버 상태 확인
    print("\n1️⃣ 백엔드 서버 상태 확인")
    if not test_backend_health():
        print("\n❌ 백엔드 서버가 실행되지 않았습니다.")
        print("💡 해결 방법:")
        print("   1. 백엔드 서버를 시작하세요:")
        print("      cd backend && python -m uvicorn app.main:app --reload")
        print("   2. 또는 Docker를 사용하세요:")
        print("      docker-compose up backend")
        exit(1)
    
    # 2. AI 개인 질문 생성 테스트
    print("\n2️⃣ AI 개인 질문 생성 테스트")
    successful_application_id = test_ai_question_generation()
    
    if successful_application_id:
        print(f"\n🎉 AI 개인 질문 생성 테스트 성공!")
        print(f"✅ application_id {successful_application_id}에서 질문이 정상적으로 생성되었습니다.")
        print("\n💡 프론트엔드에서 확인해보세요:")
        print("   1. 지원자 목록에서 해당 지원자 선택")
        print("   2. 'AI 개인 질문 생성' 버튼 클릭")
        print("   3. 로딩 상태와 생성된 질문 확인")
    else:
        print("\n❌ AI 개인 질문 생성 테스트 실패.")
        print("💡 해결 방법:")
        print("   1. 데이터베이스에 application 데이터가 있는지 확인")
        print("   2. agent 모듈이 정상적으로 설치되었는지 확인")
        print("   3. LangGraph 워크플로우가 정상 작동하는지 확인")
        print("   4. 로그를 확인하여 구체적인 오류 원인 파악") 