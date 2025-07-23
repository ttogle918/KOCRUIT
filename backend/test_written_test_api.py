#!/usr/bin/env python3
"""
필기합격자 API 테스트 스크립트
"""

import requests
import json

def test_written_test_passed_api():
    """필기합격자 API 테스트"""
    
    # 여러 jobpost_id를 테스트
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"http://localhost:8000/api/v1/written-test/passed/{jobpost_id}"
        
        try:
            print(f"\n=== jobpost_id: {jobpost_id} ===")
            print(f"API 호출: {url}")
            response = requests.get(url)
            
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
                print(f"필기합격자 수: {len(data)}")
                
                if len(data) > 0:
                    print("✅ 필기합격자가 있습니다!")
                    return jobpost_id
                    
            else:
                print(f"오류 응답: {response.text}")
                
        except Exception as e:
            print(f"API 호출 실패: {e}")
    
    return None

if __name__ == "__main__":
    result = test_written_test_passed_api()
    if result:
        print(f"\n🎉 필기합격자가 있는 jobpost_id: {result}")
    else:
        print("\n❌ 모든 jobpost_id에서 필기합격자를 찾을 수 없습니다.") 