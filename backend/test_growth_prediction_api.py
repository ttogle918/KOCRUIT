import requests
import json

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1"

def test_create_table():
    """테이블 생성 테스트"""
    try:
        response = requests.post(f"{BASE_URL}/ai/growth-prediction/create-table")
        print(f"테이블 생성 응답: {response.status_code}")
        if response.status_code == 200:
            print("✅ 테이블 생성 성공")
            print(response.json())
        else:
            print("❌ 테이블 생성 실패")
            print(response.text)
    except Exception as e:
        print(f"❌ 테이블 생성 오류: {e}")

def test_growth_prediction():
    """성장가능성 예측 테스트"""
    try:
        # 테스트용 application_id (실제 존재하는 ID로 변경 필요)
        test_data = {
            "application_id": 1  # 실제 존재하는 application_id로 변경
        }
        
        response = requests.post(
            f"{BASE_URL}/ai/growth-prediction/predict",
            json=test_data,
            timeout=300  # 5분 타임아웃
        )
        
        print(f"성장가능성 예측 응답: {response.status_code}")
        if response.status_code == 200:
            print("✅ 성장가능성 예측 성공")
            result = response.json()
            print(f"총점: {result.get('total_score')}")
            print(f"메시지: {result.get('message')}")
        else:
            print("❌ 성장가능성 예측 실패")
            print(response.text)
    except Exception as e:
        print(f"❌ 성장가능성 예측 오류: {e}")

def test_get_results():
    """저장된 결과 조회 테스트"""
    try:
        application_id = 1  # 실제 존재하는 application_id로 변경
        
        response = requests.get(f"{BASE_URL}/ai/growth-prediction/results/{application_id}")
        
        print(f"결과 조회 응답: {response.status_code}")
        if response.status_code == 200:
            print("✅ 결과 조회 성공")
            result = response.json()
            print(f"총점: {result.get('total_score')}")
        elif response.status_code == 404:
            print("ℹ️ 저장된 결과가 없습니다 (정상)")
        else:
            print("❌ 결과 조회 실패")
            print(response.text)
    except Exception as e:
        print(f"❌ 결과 조회 오류: {e}")

if __name__ == "__main__":
    print("=== 성장가능성 예측 API 테스트 ===")
    
    print("\n1. 테이블 생성 테스트")
    test_create_table()
    
    print("\n2. 저장된 결과 조회 테스트")
    test_get_results()
    
    print("\n3. 성장가능성 예측 테스트")
    test_growth_prediction() 