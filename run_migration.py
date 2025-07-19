#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 실행 스크립트
"""

import subprocess
import sys
import os

def run_migration():
    """마이그레이션 스크립트를 실행합니다."""
    
    print("🚀 데이터베이스 마이그레이션을 시작합니다...")
    
    # initdb 스크립트 실행
    initdb_scripts = [
        "initdb/10_add_interview_status_column.py"
    ]
    
    for script in initdb_scripts:
        if os.path.exists(script):
            print(f"📝 {script} 실행 중...")
            try:
                result = subprocess.run([sys.executable, script], 
                                      capture_output=True, text=True, check=True)
                print(f"✅ {script} 실행 완료")
                if result.stdout:
                    print(result.stdout)
            except subprocess.CalledProcessError as e:
                print(f"❌ {script} 실행 실패: {e}")
                print(f"에러 출력: {e.stderr}")
                return False
        else:
            print(f"⚠️ {script} 파일을 찾을 수 없습니다.")
    
    print("🎉 모든 마이그레이션이 완료되었습니다!")
    return True

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 