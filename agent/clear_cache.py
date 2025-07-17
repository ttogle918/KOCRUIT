#!/usr/bin/env python3
"""
캐시 관리 스크립트
- 특정 함수의 캐시 제거
- 함수명 변경 시 캐시 마이그레이션
- 전체 캐시 삭제
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from utils.llm_cache import clear_function_cache, migrate_function_cache, redis_client

def main():
    """메인 함수"""
    print("=== 캐시 관리 스크립트 ===")
    print("1. 특정 함수 캐시 제거")
    print("2. 함수명 변경 캐시 마이그레이션")
    print("3. 변경된 함수들의 캐시 제거")
    print("4. 전체 캐시 삭제 (FLUSHALL)")
    
    choice = input("선택하세요 (1-4): ").strip()
    
    if choice == "1":
        function_name = input("캐시를 제거할 함수명을 입력하세요: ").strip()
        if function_name:
            count = clear_function_cache(function_name)
            print(f"완료: {count}개의 캐시 항목이 제거되었습니다.")
    
    elif choice == "2":
        old_name = input("이전 함수명을 입력하세요: ").strip()
        new_name = input("새로운 함수명을 입력하세요: ").strip()
        if old_name and new_name:
            count = migrate_function_cache(old_name, new_name)
            print(f"완료: {count}개의 캐시 항목이 마이그레이션되었습니다.")
    
    elif choice == "3":
        # 변경된 함수들의 캐시 제거
        changed_functions = [
            "generate_common_question_bundle",  # 이전 함수명
            "generate_personal_questions",      # 새로운 함수명
            "generate_common_questions"         # 새로 추가된 함수명
        ]
        
        total_removed = 0
        for func_name in changed_functions:
            count = clear_function_cache(func_name)
            total_removed += count
        
        print(f"완료: 총 {total_removed}개의 캐시 항목이 제거되었습니다.")
        print("이제 새로운 함수명으로 캐시가 생성됩니다.")
    
    elif choice == "4":
        # 전체 캐시 삭제
        confirm = input("정말로 모든 Redis 캐시를 삭제하시겠습니까? (y/N): ").strip().lower()
        if confirm == 'y':
            try:
                redis_client.flushall()
                print("✅ 완료: 모든 Redis 캐시가 삭제되었습니다!")
                print("이제 새로운 캐시가 생성됩니다.")
            except Exception as e:
                print(f"❌ 오류: {e}")
        else:
            print("취소되었습니다.")
    
    else:
        print("잘못된 선택입니다.")

if __name__ == "__main__":
    main() 