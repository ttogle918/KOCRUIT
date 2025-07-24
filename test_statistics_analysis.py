#!/usr/bin/env python3
"""
통계시각화 AI 분석 기능 테스트 스크립트

이 스크립트는 LLM 모델이 통합된 통계 분석 API를 테스트합니다.
"""

import requests
import json
import time
from typing import Dict, List, Any

# API 설정
BASE_URL = "http://localhost:8000"
STATISTICS_ENDPOINT = f"{BASE_URL}/statistics/analyze"

# 테스트용 차트 데이터
TEST_CHART_DATA = {
    'trend': [
        {"date": "2025-07-05", "count": 3},
        {"date": "2025-07-06", "count": 3},
        {"date": "2025-07-07", "count": 20},
        {"date": "2025-07-08", "count": 1},
        {"date": "2025-07-09", "count": 5}
    ],
    'age': [
        {"name": "20대", "count": 15},
        {"name": "30대", "count": 8},
        {"name": "40대", "count": 4},
        {"name": "50대", "count": 2}
    ],
    'gender': [
        {"name": "남성", "value": 18},
        {"name": "여성", "value": 11}
    ],
    'education': [
        {"name": "학사", "value": 20},
        {"name": "석사", "value": 7},
        {"name": "박사", "value": 2}
    ],
    'province': [
        {"name": "서울특별시", "value": 12},
        {"name": "경기도", "value": 8},
        {"name": "인천광역시", "value": 3},
        {"name": "부산광역시", "value": 2},
        {"name": "기타", "value": 4}
    ],
    'certificate': [
        {"name": "0개", "count": 8},
        {"name": "1개", "count": 12},
        {"name": "2개", "count": 6},
        {"name": "3개 이상", "count": 3}
    ]
}

def test_statistics_analysis(chart_type: str, chart_data: List[Dict[str, Any]], job_post_id: int = 1) -> Dict[str, Any]:
    """통계 분석 API 테스트"""
    
    payload = {
        "job_post_id": job_post_id,
        "chart_type": chart_type,
        "chart_data": chart_data
    }
    
    print(f"\n🔍 {chart_type.upper()} 차트 분석 테스트 중...")
    print(f"📊 데이터: {len(chart_data)}개 항목")
    
    try:
        start_time = time.time()
        response = requests.post(STATISTICS_ENDPOINT, json=payload)
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            analysis_time = end_time - start_time
            
            print(f"✅ 분석 완료 (소요시간: {analysis_time:.2f}초)")
            print(f"🤖 LLM 사용 여부: {'예' if result.get('is_llm_used') else '아니오'}")
            print(f"📝 분석 결과 길이: {len(result.get('analysis', ''))}자")
            print(f"💡 인사이트 개수: {len(result.get('insights', []))}개")
            print(f"✅ 권장사항 개수: {len(result.get('recommendations', []))}개")
            
            # 분석 결과 미리보기
            analysis = result.get('analysis', '')
            if analysis:
                preview = analysis[:200] + "..." if len(analysis) > 200 else analysis
                print(f"📋 분석 미리보기: {preview}")
            
            return {
                "success": True,
                "is_llm_used": result.get('is_llm_used', False),
                "analysis_time": analysis_time,
                "result": result
            }
        else:
            print(f"❌ API 오류: {response.status_code}")
            print(f"오류 내용: {response.text}")
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}"
            }
            
    except requests.exceptions.ConnectionError:
        print("❌ 서버 연결 실패. 백엔드 서버가 실행 중인지 확인하세요.")
        return {
            "success": False,
            "error": "서버 연결 실패"
        }
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def test_all_chart_types():
    """모든 차트 타입 테스트"""
    
    print("🚀 통계시각화 AI 분석 기능 테스트 시작")
    print("=" * 60)
    
    results = {}
    total_tests = len(TEST_CHART_DATA)
    successful_tests = 0
    llm_used_count = 0
    
    for chart_type, chart_data in TEST_CHART_DATA.items():
        result = test_statistics_analysis(chart_type, chart_data)
        results[chart_type] = result
        
        if result.get("success"):
            successful_tests += 1
            if result.get("is_llm_used"):
                llm_used_count += 1
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print("=" * 60)
    print(f"총 테스트: {total_tests}개")
    print(f"성공: {successful_tests}개")
    print(f"실패: {total_tests - successful_tests}개")
    print(f"LLM 사용: {llm_used_count}개")
    print(f"규칙 기반: {successful_tests - llm_used_count}개")
    
    if successful_tests > 0:
        success_rate = (successful_tests / total_tests) * 100
        llm_rate = (llm_used_count / successful_tests) * 100 if successful_tests > 0 else 0
        print(f"성공률: {success_rate:.1f}%")
        print(f"LLM 사용률: {llm_rate:.1f}%")
    
    # 상세 결과
    print("\n📋 상세 결과:")
    for chart_type, result in results.items():
        status = "✅ 성공" if result.get("success") else "❌ 실패"
        llm_status = "🤖 LLM" if result.get("is_llm_used") else "📏 규칙"
        time_info = f"({result.get('analysis_time', 0):.2f}초)" if result.get("success") else ""
        print(f"  {chart_type:12} | {status} | {llm_status} {time_info}")
    
    return results

def test_llm_availability():
    """LLM 사용 가능 여부 테스트"""
    
    print("\n🔧 LLM 사용 가능 여부 확인")
    print("-" * 40)
    
    # 간단한 테스트로 LLM 사용 여부 확인
    test_result = test_statistics_analysis('trend', TEST_CHART_DATA['trend'])
    
    if test_result.get("success"):
        if test_result.get("is_llm_used"):
            print("✅ LLM 모델이 정상적으로 작동하고 있습니다.")
            print("💡 OpenAI API 키가 설정되어 있고 GPT-4o-mini 모델을 사용합니다.")
        else:
            print("⚠️ LLM 모델을 사용하지 않고 규칙 기반 분석을 사용합니다.")
            print("💡 OpenAI API 키가 설정되지 않았거나 LLM 호출에 실패했습니다.")
    else:
        print("❌ API 테스트에 실패했습니다.")
        print(f"오류: {test_result.get('error', '알 수 없는 오류')}")

def main():
    """메인 테스트 함수"""
    
    print("🎯 통계시각화 AI 분석 기능 테스트")
    print("이 스크립트는 LLM 모델이 통합된 통계 분석 API를 테스트합니다.")
    print()
    
    # LLM 사용 가능 여부 확인
    test_llm_availability()
    
    # 모든 차트 타입 테스트
    results = test_all_chart_types()
    
    # 성공한 테스트 중 하나의 상세 결과 출력
    successful_results = [r for r in results.values() if r.get("success")]
    if successful_results:
        print("\n📄 상세 분석 결과 예시:")
        print("-" * 40)
        example_result = successful_results[0]
        result_data = example_result.get("result", {})
        
        print(f"분석 결과:")
        print(result_data.get("analysis", ""))
        
        if result_data.get("insights"):
            print(f"\n주요 인사이트:")
            for i, insight in enumerate(result_data["insights"], 1):
                print(f"  {i}. {insight}")
        
        if result_data.get("recommendations"):
            print(f"\n권장사항:")
            for i, rec in enumerate(result_data["recommendations"], 1):
                print(f"  {i}. {rec}")
    
    print("\n✨ 테스트 완료!")

if __name__ == "__main__":
    main() 