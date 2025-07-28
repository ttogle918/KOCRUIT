#!/usr/bin/env python3
"""
필기합격자 API 테스트 스크립트
"""

import requests
import json
import time

def test_written_test_passed_api():
    """필기합격자 API 테스트"""
    
    base_url = "http://localhost:8000"
    
    # 여러 jobpost_id를 테스트
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"{base_url}/api/v1/ai-evaluate/written-test/passed/{jobpost_id}"
        
        try:
            print(f"\n=== jobpost_id: {jobpost_id} ===")
            print(f"API 호출: {url}")
            
            response = requests.get(url, timeout=10)
            
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
                print(f"필기합격자 수: {len(data)}")
                
                if len(data) > 0:
                    print("✅ 필기합격자가 있습니다!")
                    return jobpost_id
                else:
                    print("❌ 필기합격자가 없습니다.")
                    
            else:
                print(f"오류 응답: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.")
            return None
        except requests.exceptions.Timeout:
            print("❌ 요청 시간 초과")
        except Exception as e:
            print(f"❌ API 호출 실패: {e}")
    
    return None

def test_written_test_results_api():
    """필기시험 결과 API 테스트"""
    
    base_url = "http://localhost:8000"
    
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"{base_url}/api/v1/ai-evaluate/written-test/results/{jobpost_id}"
        
        try:
            print(f"\n=== 필기시험 결과 API 테스트 (jobpost_id: {jobpost_id}) ===")
            print(f"API 호출: {url}")
            
            response = requests.get(url, timeout=10)
            
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
                print(f"응시자 수: {len(data)}")
                
                if len(data) > 0:
                    print("✅ 필기시험 결과가 있습니다!")
                    return jobpost_id
                else:
                    print("❌ 필기시험 결과가 없습니다.")
                    
            else:
                print(f"오류 응답: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ 서버에 연결할 수 없습니다.")
            return None
        except Exception as e:
            print(f"❌ API 호출 실패: {e}")
    
    return None

def test_public_jobpost_api():
    """공개 jobpost API 테스트"""
    
    base_url = "http://localhost:8000"
    
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"{base_url}/api/v1/public/jobposts/{jobpost_id}"
        
        try:
            print(f"\n=== 공개 jobpost API 테스트 (jobpost_id: {jobpost_id}) ===")
            print(f"API 호출: {url}")
            
            response = requests.get(url, timeout=10)
            
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
                print("✅ 공고 정보가 있습니다!")
                return jobpost_id
            else:
                print(f"오류 응답: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ 서버에 연결할 수 없습니다.")
            return None
        except Exception as e:
            print(f"❌ API 호출 실패: {e}")
    
    return None

if __name__ == "__main__":
    print("🚀 필기합격자 API 테스트 시작...")
    
    # 1. 공개 jobpost API 테스트
    print("\n1️⃣ 공개 jobpost API 테스트")
    jobpost_id = test_public_jobpost_api()
    
    if jobpost_id:
        print(f"✅ 사용 가능한 jobpost_id: {jobpost_id}")
        
        # 2. 필기시험 결과 API 테스트
        print(f"\n2️⃣ 필기시험 결과 API 테스트 (jobpost_id: {jobpost_id})")
        test_written_test_results_api()
        
        # 3. 필기합격자 API 테스트
        print(f"\n3️⃣ 필기합격자 API 테스트 (jobpost_id: {jobpost_id})")
        passed_jobpost_id = test_written_test_passed_api()
        
        if passed_jobpost_id:
            print(f"\n🎉 필기합격자가 있는 jobpost_id: {passed_jobpost_id}")
            print("✅ 프론트엔드에서 필기합격자 명단을 확인할 수 있습니다!")
        else:
            print("\n❌ 필기합격자가 없습니다.")
            print("💡 해결 방법:")
            print("   1. 백엔드에서 테스트 데이터를 생성하세요:")
            print("      python backend/test_written_test_data.py")
            print("   2. 필기시험 자동 채점을 실행하세요:")
            print("      POST /api/v1/ai-evaluate/written-test/auto-grade/jobpost/{jobpost_id}")
    else:
        print("\n❌ 사용 가능한 jobpost가 없습니다.")
        print("💡 해결 방법:")
        print("   1. 데이터베이스에 jobpost 데이터가 있는지 확인하세요.")
        print("   2. 백엔드 서버가 실행 중인지 확인하세요.") 