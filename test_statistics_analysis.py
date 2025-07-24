#!/usr/bin/env python3
"""
통계 분석 API 테스트 스크립트
"""

import requests
import json

# 테스트 데이터
test_data = {
    "job_post_id": 1,
    "chart_type": "trend",
    "chart_data": [
        {"date": "2025-07-05", "count": 3},
        {"date": "2025-07-06", "count": 3},
        {"date": "2025-07-07", "count": 20},
        {"date": "2025-07-08", "count": 1},
        {"date": "2025-07-09", "count": 6},
        {"date": "2025-07-11", "count": 1},
        {"date": "2025-07-12", "count": 1},
        {"date": "2025-07-20", "count": 1},
        {"date": "2025-07-27", "count": 2},
        {"date": "2025-08-01", "count": 3}
    ]
}

def test_statistics_analysis():
    """통계 분석 API 테스트"""
    try:
        # 백엔드 API 엔드포인트
        url = "http://localhost:8000/statistics/analyze"
        
        print("🔍 통계 분석 API 테스트 시작...")
        print(f"📊 차트 타입: {test_data['chart_type']}")
        print(f"📈 데이터 포인트: {len(test_data['chart_data'])}개")
        
        # API 요청
        response = requests.post(url, json=test_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ API 응답 성공!")
            print("\n📋 분석 결과:")
            print("=" * 50)
            print(result['analysis'])
            
            if result.get('insights'):
                print("\n💡 주요 인사이트:")
                for i, insight in enumerate(result['insights'], 1):
                    print(f"{i}. {insight}")
            
            if result.get('recommendations'):
                print("\n✅ 권장사항:")
                for i, recommendation in enumerate(result['recommendations'], 1):
                    print(f"{i}. {recommendation}")
                    
        else:
            print(f"❌ API 요청 실패: {response.status_code}")
            print(f"에러 메시지: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 백엔드 서버에 연결할 수 없습니다.")
        print("백엔드 서버가 실행 중인지 확인해주세요.")
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {str(e)}")

def test_different_chart_types():
    """다양한 차트 타입 테스트"""
    chart_types = [
        {
            "type": "age",
            "data": [
                {"name": "20대", "count": 15},
                {"name": "30대", "count": 25},
                {"name": "40대", "count": 10},
                {"name": "50대", "count": 5}
            ]
        },
        {
            "type": "gender",
            "data": [
                {"name": "남성", "value": 35},
                {"name": "여성", "value": 20}
            ]
        },
        {
            "type": "education",
            "data": [
                {"name": "고등학교졸업", "value": 5},
                {"name": "학사", "value": 30},
                {"name": "석사", "value": 15},
                {"name": "박사", "value": 5}
            ]
        }
    ]
    
    for chart_test in chart_types:
        print(f"\n🔍 {chart_test['type']} 차트 테스트...")
        test_data["chart_type"] = chart_test["type"]
        test_data["chart_data"] = chart_test["data"]
        
        try:
            url = "http://localhost:8000/statistics/analyze"
            response = requests.post(url, json=test_data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {chart_test['type']} 분석 성공!")
                print(f"인사이트: {len(result.get('insights', []))}개")
                print(f"권장사항: {len(result.get('recommendations', []))}개")
            else:
                print(f"❌ {chart_test['type']} 분석 실패: {response.status_code}")
                
        except Exception as e:
            print(f"❌ {chart_test['type']} 테스트 오류: {str(e)}")

if __name__ == "__main__":
    print("🚀 통계 분석 API 테스트 시작")
    print("=" * 60)
    
    # 기본 테스트
    test_statistics_analysis()
    
    # 다양한 차트 타입 테스트
    print("\n" + "=" * 60)
    print("🔄 다양한 차트 타입 테스트")
    test_different_chart_types()
    
    print("\n✅ 테스트 완료!") 