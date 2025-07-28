#!/usr/bin/env python3
"""
서버 재시작 스크립트
"""

import requests
import time
import subprocess
import sys

def check_server_status():
    """서버 상태 확인"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ 서버가 정상적으로 실행 중입니다.")
            return True
        else:
            print(f"⚠️ 서버 응답이 이상합니다: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")
        return False
    except Exception as e:
        print(f"❌ 서버 상태 확인 실패: {e}")
        return False

def restart_server():
    """서버 재시작"""
    print("🔄 서버를 재시작합니다...")
    
    try:
        # Docker 컨테이너 재시작
        subprocess.run(["docker-compose", "restart", "kocruit_fastapi"], check=True)
        print("✅ Docker 컨테이너 재시작 완료")
        
        # 서버가 완전히 시작될 때까지 대기
        print("⏳ 서버 시작 대기 중...")
        time.sleep(10)
        
        # 서버 상태 확인
        if check_server_status():
            print("🎉 서버 재시작이 완료되었습니다!")
            return True
        else:
            print("❌ 서버 재시작 후 상태 확인 실패")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Docker 재시작 실패: {e}")
        return False
    except Exception as e:
        print(f"❌ 서버 재시작 중 오류: {e}")
        return False

def test_api_endpoints():
    """API 엔드포인트 테스트"""
    print("\n=== API 엔드포인트 테스트 ===")
    
    endpoints = [
        "http://localhost:8000/api/v1/interview-panel/my-interview-schedules/",
        "http://localhost:8000/api/v1/interview-panel/my-pending-requests/",
        "http://localhost:8000/api/v1/schedules/interviews/",
        "http://localhost:8000/health"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\n테스트: {endpoint}")
            response = requests.get(endpoint, timeout=10)
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ 정상 응답")
            elif response.status_code == 404:
                print("❌ 엔드포인트를 찾을 수 없음")
            elif response.status_code == 401:
                print("🔐 인증 필요")
            else:
                print(f"⚠️ 기타 오류: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 테스트 실패: {e}")

if __name__ == "__main__":
    print("서버 재시작 및 API 테스트 시작...")
    
    # 현재 서버 상태 확인
    print("=== 현재 서버 상태 확인 ===")
    if check_server_status():
        print("서버가 이미 실행 중입니다.")
    else:
        print("서버가 실행되지 않았거나 문제가 있습니다.")
    
    # 서버 재시작
    if restart_server():
        # API 엔드포인트 테스트
        test_api_endpoints()
    else:
        print("서버 재시작에 실패했습니다.")
        sys.exit(1) 