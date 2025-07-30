import requests

def create_table():
    """성장가능성 예측 결과 테이블을 생성합니다."""
    try:
        url = "http://localhost:8000/api/v1/ai/growth-prediction/create-table"
        response = requests.post(url)
        
        print(f"응답 상태 코드: {response.status_code}")
        print(f"응답 내용: {response.text}")
        
        if response.status_code == 200:
            print("✅ 테이블 생성 성공!")
        else:
            print("❌ 테이블 생성 실패!")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    print("=== 테이블 생성 테스트 ===")
    create_table() 