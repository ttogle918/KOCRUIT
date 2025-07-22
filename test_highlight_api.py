#!/usr/bin/env python3
"""
하이라이트 도구 API 연결 테스트 스크립트
"""

import asyncio
import sys
import os

# agent 디렉토리를 Python 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'agent'))

from agent.tools.highlight_resume_tool import get_highlight_tool

async def test_highlight_api():
    """하이라이트 도구 API 연결 테스트"""
    print("=== 하이라이트 도구 API 연결 테스트 ===")
    
    try:
        # 하이라이트 도구 초기화
        highlight_tool = get_highlight_tool()
        print("✓ 하이라이트 도구 초기화 성공")
        
        # 지원서 ID 1로 테스트
        application_id = 1
        print(f"\n--- 지원서 ID {application_id} 테스트 ---")
        
        # 노란색 하이라이트 테스트
        print("1. 노란색 하이라이트 테스트...")
        yellow_results = await highlight_tool.highlight_yellow(application_id)
        print(f"   결과: {len(yellow_results)}개 하이라이트")
        
        # 회색 하이라이트 테스트
        print("2. 회색 하이라이트 테스트...")
        gray_results = await highlight_tool.highlight_gray(application_id)
        print(f"   결과: {len(gray_results)}개 하이라이트")
        
        # 보라색 하이라이트 테스트
        print("3. 보라색 하이라이트 테스트...")
        purple_results = await highlight_tool.highlight_purple(application_id)
        print(f"   결과: {len(purple_results)}개 하이라이트")
        
        # 전체 하이라이트 테스트
        print("4. 전체 하이라이트 테스트...")
        all_results = await highlight_tool.run_all(application_id)
        print(f"   결과: {len(all_results.get('highlights', []))}개 하이라이트")
        
        print("\n=== 테스트 완료 ===")
        return True
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_highlight_api())
    sys.exit(0 if success else 1) 