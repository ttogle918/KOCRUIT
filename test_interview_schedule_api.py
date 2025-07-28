#!/usr/bin/env python3
"""
면접 일정 API 테스트 스크립트
"""

import requests
import json

def test_interview_schedule_api():
    """면접 일정 API 테스트"""
    
    # 1. 인증 토큰이 필요한지 확인
    print("=== 면접 일정 API 테스트 ===")
    
    # 2. 인증 없이 API 호출 시도
    url = "http://localhost:8000/api/v1/interview-panel/my-interview-schedules/"
    
    try:
        print(f"API 호출: {url}")
        response = requests.get(url)
        
        print(f"상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
            print(f"면접 일정 수: {len(data)}")
            
            if len(data) > 0:
                print("✅ 면접 일정이 있습니다!")
                return True
            else:
                print("❌ 면접 일정이 없습니다.")
                return False
                
        elif response.status_code == 401:
            print("🔐 인증이 필요합니다. 로그인이 필요할 수 있습니다.")
            return False
            
        elif response.status_code == 404:
            print("❌ API 엔드포인트를 찾을 수 없습니다.")
            return False
            
        else:
            print(f"❌ 오류 응답: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ API 호출 실패: {e}")
        return False

def test_alternative_endpoints():
    """대안 엔드포인트 테스트"""
    
    print("\n=== 대안 엔드포인트 테스트 ===")
    
    # 1. schedules 엔드포인트 테스트
    url1 = "http://localhost:8000/api/v1/schedules/interviews/"
    try:
        print(f"1. schedules/interviews/ 호출: {url1}")
        response = requests.get(url1)
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   응답 데이터: {len(data)}개")
        else:
            print(f"   오류: {response.text}")
    except Exception as e:
        print(f"   실패: {e}")
    
    # 2. interview-panel 엔드포인트 테스트
    url2 = "http://localhost:8000/api/v1/interview-panel/my-pending-requests/"
    try:
        print(f"2. interview-panel/my-pending-requests/ 호출: {url2}")
        response = requests.get(url2)
        print(f"   상태 코드: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   응답 데이터: {len(data)}개")
        else:
            print(f"   오류: {response.text}")
    except Exception as e:
        print(f"   실패: {e}")

if __name__ == "__main__":
    print("면접 일정 API 테스트 시작...")
    
    # 메인 API 테스트
    result = test_interview_schedule_api()
    
    # 대안 엔드포인트 테스트
    test_alternative_endpoints()
    
    if result:
        print("\n🎉 면접 일정 API가 정상 작동합니다!")
    else:
        print("\n❌ 면접 일정 API에 문제가 있습니다.")
        print("다음 사항들을 확인해주세요:")
        print("1. 로그인이 되어 있는지 확인")
        print("2. 면접관으로 배정되어 있는지 확인")
        print("3. 면접 일정이 생성되어 있는지 확인") 