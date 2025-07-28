#!/usr/bin/env python3
"""
Docker 환경에서 실행하는 필기합격자 데이터 생성 스크립트
"""

import requests
import json
import time

def create_written_test_data():
    """필기합격자 데이터를 생성합니다."""
    
    # 1. 먼저 현재 상태 확인
    print("=== 현재 필기합격자 상태 확인 ===")
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"http://localhost:8000/api/v1/ai-evaluate/written-test/passed/{jobpost_id}"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                print(f"jobpost_id {jobpost_id}: {len(data)}명의 필기합격자")
                if len(data) > 0:
                    print(f"  - 첫 번째 합격자: {data[0]}")
            else:
                print(f"jobpost_id {jobpost_id}: API 오류 ({response.status_code})")
        except Exception as e:
            print(f"jobpost_id {jobpost_id}: 연결 실패 - {e}")
    
    # 2. 테스트 데이터 생성 API 호출
    print("\n=== 테스트 데이터 생성 ===")
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"http://localhost:8000/api/v1/ai-evaluate/written-test/auto-grade/jobpost/{jobpost_id}"
        try:
            print(f"jobpost_id {jobpost_id} 자동 채점 시작...")
            response = requests.post(url)
            if response.status_code == 200:
                data = response.json()
                print(f"  - 채점 완료: {data.get('graded_count', 0)}개 답안 채점")
                print(f"  - 결과: {len(data.get('results', []))}명 처리")
            else:
                print(f"  - 오류: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"  - 실패: {e}")
    
    # 3. 생성 후 상태 재확인
    print("\n=== 데이터 생성 후 상태 확인 ===")
    time.sleep(2)  # 잠시 대기
    
    for jobpost_id in [1, 2, 3, 4, 5]:
        url = f"http://localhost:8000/api/v1/ai-evaluate/written-test/passed/{jobpost_id}"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                print(f"jobpost_id {jobpost_id}: {len(data)}명의 필기합격자")
                if len(data) > 0:
                    print(f"  ✅ 필기합격자가 생성되었습니다!")
                    return jobpost_id
            else:
                print(f"jobpost_id {jobpost_id}: API 오류 ({response.status_code})")
        except Exception as e:
            print(f"jobpost_id {jobpost_id}: 연결 실패 - {e}")
    
    return None

if __name__ == "__main__":
    print("필기합격자 데이터 생성 스크립트 시작...")
    result = create_written_test_data()
    
    if result:
        print(f"\n🎉 성공! jobpost_id {result}에 필기합격자 데이터가 생성되었습니다.")
        print(f"이제 프론트엔드에서 /written-test-passed/{result} 페이지를 확인해보세요.")
    else:
        print("\n❌ 필기합격자 데이터 생성에 실패했습니다.")
        print("데이터베이스에 지원자 데이터가 있는지 확인해주세요.") 