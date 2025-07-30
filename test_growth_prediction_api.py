import requests
import json

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1/ai/growth-prediction"

def test_create_table():
    """테이블 생성 테스트"""
    try:
        response = requests.post(f"{BASE_URL}/create-table")
        print(f"테이블 생성 응답: {response.status_code}")
        if response.status_code == 200:
            print("✅ 테이블 생성 성공")
            print(response.json())
        else:
            print("❌ 테이블 생성 실패")
            print(response.text)
    except Exception as e:
        print(f"❌ 테이블 생성 오류: {e}")

def test_predict_growth(application_id=46):
    """성장가능성 예측 테스트"""
    try:
        data = {"application_id": application_id}
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"예측 API 응답: {response.status_code}")
        if response.status_code == 200:
            print("✅ 예측 성공")
            result = response.json()
            print(f"총점: {result.get('total_score')}")
            print(f"메시지: {result.get('message')}")
        else:
            print("❌ 예측 실패")
            print(response.text)
    except Exception as e:
        print(f"❌ 예측 오류: {e}")

def test_get_results(application_id=46):
    """저장된 결과 조회 테스트"""
    try:
        response = requests.get(f"{BASE_URL}/results/{application_id}")
        print(f"결과 조회 응답: {response.status_code}")
        if response.status_code == 200:
            print("✅ 결과 조회 성공")
            result = response.json()
            print(f"총점: {result.get('total_score')}")
        else:
            print("❌ 결과 조회 실패")
            print(response.text)
    except Exception as e:
        print(f"❌ 결과 조회 오류: {e}")

if __name__ == "__main__":
    print("=== 성장가능성 예측 API 테스트 ===")
    
    # 1. 테이블 생성
    print("\n1. 테이블 생성 테스트")
    test_create_table()
    
    # 2. 예측 실행
    print("\n2. 성장가능성 예측 테스트")
    test_predict_growth(46)
    
    # 3. 결과 조회
    print("\n3. 결과 조회 테스트")
    test_get_results(46) 