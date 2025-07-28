#!/usr/bin/env python3
"""
필기 합격자 관련 테스트 실행 스크립트
"""

import subprocess
import sys
import os

def run_python_script(script_path, description):
    """Python 스크립트를 실행합니다."""
    print(f"\n{'='*50}")
    print(f"🔍 {description}")
    print(f"{'='*50}")
    
    try:
        result = subprocess.run([sys.executable, script_path], 
                              capture_output=True, text=True, cwd=os.getcwd())
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print(f"⚠️  경고/오류: {result.stderr}")
        
        if result.returncode == 0:
            print(f"✅ {description} 완료")
            return True
        else:
            print(f"❌ {description} 실패 (종료 코드: {result.returncode})")
            return False
            
    except Exception as e:
        print(f"❌ 스크립트 실행 중 오류: {e}")
        return False

def run_api_test():
    """API 테스트를 실행합니다."""
    return run_python_script("test_written_test_api.py", "API 테스트")

def run_data_test():
    """데이터 테스트를 실행합니다."""
    return run_python_script("test_written_test_data.py", "데이터 상태 확인 및 생성")

def main():
    """메인 실행 함수"""
    print("🚀 필기 합격자 관련 테스트 시작...")
    
    # 1. 데이터 상태 확인 및 생성
    print("\n1️⃣ 데이터 상태 확인 및 생성")
    data_success = run_data_test()
    
    if not data_success:
        print("❌ 데이터 테스트 실패. 백엔드 서버가 실행 중인지 확인해주세요.")
        return
    
    # 2. API 테스트
    print("\n2️⃣ API 테스트")
    api_success = run_api_test()
    
    if api_success:
        print("\n🎉 모든 테스트가 성공했습니다!")
        print("✅ 필기 합격자 명단이 정상적으로 표시될 것입니다.")
        print("\n💡 다음 단계:")
        print("   1. 프론트엔드에서 필기 합격자 명단 페이지로 이동")
        print("   2. 사이드바의 '필기 합격자 명단' 버튼 클릭")
        print("   3. 또는 직접 URL 접근: /written-test-passed/{jobpost_id}")
    else:
        print("\n❌ API 테스트 실패.")
        print("💡 해결 방법:")
        print("   1. 백엔드 서버가 실행 중인지 확인")
        print("   2. 데이터베이스 연결 상태 확인")
        print("   3. API 엔드포인트가 올바르게 등록되었는지 확인")

if __name__ == "__main__":
    main() 