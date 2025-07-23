#!/usr/bin/env python3
"""
API 테스트 스크립트
"""

import requests
import json

def test_job_aptitude_api():
    """직무적성평가 보고서 API 테스트"""
    
    url = "http://localhost:8000/api/v1/report/job-aptitude"
    params = {"job_post_id": 1}
    
    try:
        print(f"API 호출: {url}?job_post_id=1")
        response = requests.get(url, params=params)
        
        print(f"상태 코드: {response.status_code}")
        print(f"응답 헤더: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"응답 데이터: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            # 필기합격자 수 확인
            passed_count = data.get('stats', {}).get('passed_applicants_count', 0)
            print(f"필기합격자 수: {passed_count}")
            
        else:
            print(f"오류 응답: {response.text}")
            
    except Exception as e:
        print(f"API 호출 실패: {e}")

if __name__ == "__main__":
    test_job_aptitude_api() 