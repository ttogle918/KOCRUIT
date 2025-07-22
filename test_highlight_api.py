#!/usr/bin/env python3
"""
Highlight Resume Tool API 테스트 스크립트
"""

import asyncio
import sys
import os

# agent 디렉토리를 Python 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'agent'))

from agent.tools.highlight_resume_tool import load_application_info, get_highlight_tool

async def test_application_info():
    """application_id로부터 company_id와 jobpost_id를 가져오는 기능 테스트"""
    print("=== Application Info API 테스트 ===")
    
    # 테스트할 application_id (실제 데이터가 있는 ID로 변경 필요)
    test_application_id = 1
    
    print(f"Application ID {test_application_id}에서 정보 가져오기...")
    
    try:
        app_info = load_application_info(test_application_id)
        print(f"결과: {app_info}")
        
        if app_info.get("company_id"):
            print(f"✅ company_id 성공적으로 가져옴: {app_info['company_id']}")
        else:
            print("❌ company_id를 가져오지 못함")
            
        if app_info.get("jobpost_id"):
            print(f"✅ jobpost_id 성공적으로 가져옴: {app_info['jobpost_id']}")
        else:
            print("❌ jobpost_id를 가져오지 못함")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

async def test_highlight_functions():
    """하이라이트 함수들이 자동으로 company_id와 jobpost_id를 가져오는지 테스트"""
    print("\n=== Highlight Functions 테스트 ===")
    
    # 테스트할 application_id (실제 데이터가 있는 ID로 변경 필요)
    test_application_id = 1
    
    try:
        # HighlightResumeTool 초기화
        highlight_tool = get_highlight_tool()
        
        print(f"Application ID {test_application_id}로 하이라이트 테스트...")
        
        # 노란색 하이라이트 테스트 (company_id 자동 가져오기)
        print("\n1. 노란색 하이라이트 테스트 (company_id 자동 가져오기)...")
        yellow_results = await highlight_tool.highlight_yellow(test_application_id)
        print(f"노란색 결과: {len(yellow_results)}개 항목")
        
        # 빨간색 하이라이트 테스트 (company_id, jobpost_id 자동 가져오기)
        print("\n2. 빨간색 하이라이트 테스트 (company_id, jobpost_id 자동 가져오기)...")
        red_results = await highlight_tool.highlight_red(test_application_id)
        print(f"빨간색 결과: {len(red_results)}개 항목")
        
        # 파란색 하이라이트 테스트 (jobpost_id 자동 가져오기)
        print("\n3. 파란색 하이라이트 테스트 (jobpost_id 자동 가져오기)...")
        blue_results = await highlight_tool.highlight_blue(test_application_id)
        print(f"파란색 결과: {len(blue_results)}개 항목")
        
        # 전체 하이라이트 테스트
        print("\n4. 전체 하이라이트 테스트 (모든 ID 자동 가져오기)...")
        all_results = await highlight_tool.run_all(test_application_id)
        print(f"전체 결과: {len(all_results)}개 색상")
        
    except Exception as e:
        print(f"❌ 하이라이트 테스트 중 오류 발생: {e}")

async def main():
    """메인 테스트 함수"""
    print("Highlight Resume Tool API 테스트 시작")
    print("=" * 50)
    
    # 1. Application Info API 테스트
    await test_application_info()
    
    # 2. Highlight Functions 테스트
    await test_highlight_functions()
    
    print("\n" + "=" * 50)
    print("테스트 완료")

if __name__ == "__main__":
    asyncio.run(main()) 