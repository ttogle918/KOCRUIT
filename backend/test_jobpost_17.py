#!/usr/bin/env python3
"""
jobPostId 17번 테스트 스크립트
"""

import requests
import json

def test_jobpost_17():
    """jobPostId 17번 테스트"""
    
    jobpost_id = 17
    
    # 1. 필기합격자 API 테스트
    print(f"=== jobPostId {jobpost_id} 필기합격자 테스트 ===")
    url = f"http://localhost:8000/api/v1/written-test/passed/{jobpost_id}"
    
    try:
        print(f"API 호출: {url}")
        response = requests.get(url)
        
        print(f"상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
            print(f"필기합격자 수: {len(data)}")
            
            if len(data) > 0:
                print("✅ 필기합격자가 있습니다!")
            else:
                print("❌ 필기합격자가 없습니다.")
                return False
                
        else:
            print(f"오류 응답: {response.text}")
            
    except Exception as e:
        print(f"API 호출 실패: {e}")
    
    # 2. 직무적성평가 보고서 API 테스트
    print(f"\n=== jobPostId {jobpost_id} 직무적성평가 보고서 테스트 ===")
    url = f"http://localhost:8000/api/v1/report/job-aptitude?job_post_id={jobpost_id}"
    
    try:
        print(f"API 호출: {url}")
        response = requests.get(url)
        
        print(f"상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            passed_count = data.get('stats', {}).get('passed_applicants_count', 0)
            print(f"필기합격자 수: {passed_count}")
            
            if passed_count > 0:
                print("✅ 직무적성평가 보고서에 필기합격자가 있습니다!")
                return True
            else:
                print("❌ 직무적성평가 보고서에 필기합격자가 없습니다.")
                
        else:
            print(f"오류 응답: {response.text}")
            
    except Exception as e:
        print(f"API 호출 실패: {e}")
    
    return False

if __name__ == "__main__":
    result = test_jobpost_17()
    if result:
        print(f"\n🎉 jobPostId 17번에 필기합격자가 있습니다!")
    else:
        print(f"\n❌ jobPostId 17번에 필기합격자를 찾을 수 없습니다.") 