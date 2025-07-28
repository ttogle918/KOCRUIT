#!/usr/bin/env python3
"""
형광펜 분석 캐시 삭제 스크립트
김도원 지원자의 형광펜 분석을 다시 하기 위해 캐시를 삭제합니다.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent.utils.llm_cache import clear_function_cache, redis_client

def clear_highlight_cache():
    """형광펜 분석 관련 캐시를 모두 삭제합니다."""
    
    if redis_client is None:
        print("❌ Redis에 연결할 수 없습니다.")
        return
    
    # 형광펜 분석 관련 함수들의 캐시 삭제
    functions_to_clear = [
        "highlight_resume_content",
        "highlight_resume_by_application_id",
        "process_highlight_workflow"
    ]
    
    total_removed = 0
    for func_name in functions_to_clear:
        removed = clear_function_cache(func_name)
        total_removed += removed
        print(f"🗑️ {func_name}: {removed}개 캐시 삭제")
    
    print(f"\n✅ 총 {total_removed}개의 형광펜 분석 캐시가 삭제되었습니다.")
    print("🎯 이제 김도원 지원자의 형광펜 분석을 다시 실행하면 새로운 gpt-4o 모델로 분석됩니다!")

def clear_all_llm_cache():
    """모든 LLM 캐시를 삭제합니다."""
    
    if redis_client is None:
        print("❌ Redis에 연결할 수 없습니다.")
        return
    
    try:
        # 모든 llm: 패턴의 키 삭제
        pattern = "llm:*"
        keys = redis_client.keys(pattern)
        
        if keys:
            redis_client.delete(*keys)
            print(f"🗑️ 모든 LLM 캐시 삭제 완료: {len(keys)}개")
        else:
            print("ℹ️ 삭제할 LLM 캐시가 없습니다.")
            
    except Exception as e:
        print(f"❌ 캐시 삭제 중 오류 발생: {e}")

if __name__ == "__main__":
    print("🔍 형광펜 분석 캐시 삭제 도구")
    print("=" * 50)
    
    choice = input("1. 형광펜 분석 캐시만 삭제\n2. 모든 LLM 캐시 삭제\n선택하세요 (1 또는 2): ").strip()
    
    if choice == "1":
        clear_highlight_cache()
    elif choice == "2":
        clear_all_llm_cache()
    else:
        print("❌ 잘못된 선택입니다.") 