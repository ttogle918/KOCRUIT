#!/usr/bin/env python3
"""
통계 분석 DB 저장 기능 테스트 스크립트
"""

import requests
import json

# 테스트용 데이터
test_data = {
    "job_post_id": 1,
    "chart_type": "trend",
    "chart_data": [
        {"date": "2024-01-01", "count": 5},
        {"date": "2024-01-02", "count": 8},
        {"date": "2024-01-03", "count": 12},
        {"date": "2024-01-04", "count": 6},
        {"date": "2024-01-05", "count": 15}
    ]
}

def test_statistics_analysis():
    """통계 분석 API 테스트"""
    base_url = "http://localhost:8000"
    
    print("🔄 통계 분석 DB 저장 기능 테스트 시작...")
    
    try:
        # 1. 새로운 분석 실행 및 저장
        print("\n1️⃣ 새로운 분석 실행 및 저장 테스트")
        response = requests.post(f"{base_url}/api/v1/statistics/analyze", json=test_data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 분석 성공: ID={result.get('id')}")
            print(f"   분석 결과: {result.get('analysis')[:100]}...")
            print(f"   LLM 사용: {result.get('is_llm_used')}")
            print(f"   생성 시간: {result.get('created_at')}")
            
            analysis_id = result.get('id')
        else:
            print(f"❌ 분석 실패: {response.status_code} - {response.text}")
            return
        
        # 2. 저장된 분석 결과 조회
        print("\n2️⃣ 저장된 분석 결과 조회 테스트")
        response = requests.get(f"{base_url}/api/v1/statistics/job/{test_data['job_post_id']}/analysis/{test_data['chart_type']}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 조회 성공: ID={result.get('id')}")
            print(f"   분석 결과: {result.get('analysis')[:100]}...")
        else:
            print(f"❌ 조회 실패: {response.status_code} - {response.text}")
        
        # 3. 모든 분석 결과 조회
        print("\n3️⃣ 모든 분석 결과 조회 테스트")
        response = requests.get(f"{base_url}/api/v1/statistics/job/{test_data['job_post_id']}/analyses")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 전체 조회 성공: 총 {result.get('total_count')}개")
            for analysis in result.get('analyses', [])[:3]:  # 처음 3개만 출력
                print(f"   - ID: {analysis.get('id')}, 타입: {analysis.get('chart_type')}")
        else:
            print(f"❌ 전체 조회 실패: {response.status_code} - {response.text}")
        
        # 4. ID로 특정 분석 조회
        print("\n4️⃣ ID로 특정 분석 조회 테스트")
        response = requests.get(f"{base_url}/api/v1/statistics/analysis/{analysis_id}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ ID 조회 성공: ID={result.get('id')}")
        else:
            print(f"❌ ID 조회 실패: {response.status_code} - {response.text}")
        
        print("\n🎉 모든 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")

if __name__ == "__main__":
    test_statistics_analysis() 