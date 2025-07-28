#!/usr/bin/env python3
"""
알림 API 테스트 스크립트
"""

import requests
import json

def test_notification_api():
    """알림 API 엔드포인트 테스트"""
    
    base_url = "http://localhost:8000"
    api_base = f"{base_url}/api/v1"
    
    print("🧪 알림 API 테스트 시작")
    print("=" * 50)
    
    # 1. 헬스체크
    try:
        response = requests.get(f"{base_url}/health")
        print(f"✅ 헬스체크: {response.status_code}")
        if response.status_code == 200:
            print(f"   응답: {response.json()}")
    except Exception as e:
        print(f"❌ 헬스체크 실패: {e}")
        return False
    
    # 2. 알림 엔드포인트 테스트 (인증 없이)
    endpoints = [
        "/notifications/",
        "/notifications/unread",
        "/notifications/unread/count"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{api_base}{endpoint}")
            print(f"✅ {endpoint}: {response.status_code}")
            if response.status_code == 401:
                print("   (401 예상됨 - 인증 필요)")
            elif response.status_code == 200:
                print(f"   응답: {response.json()}")
        except Exception as e:
            print(f"❌ {endpoint} 실패: {e}")
    
    # 3. API 라우터 구조 확인
    try:
        response = requests.get(f"{api_base}/docs")
        print(f"✅ API 문서: {response.status_code}")
    except Exception as e:
        print(f"❌ API 문서 접근 실패: {e}")
    
    print("\n" + "=" * 50)
    print("테스트 완료")
    
    return True

if __name__ == "__main__":
    test_notification_api() 