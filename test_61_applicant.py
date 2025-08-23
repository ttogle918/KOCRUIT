#!/usr/bin/env python3
"""
61번 지원자 데이터로 AI 면접 분석 테스트 스크립트
"""

import requests
import json
import time

# API 엔드포인트
BASE_URL = "http://localhost:8000"
WHISPER_API = f"{BASE_URL}/api/v1/whisper-analysis"

def test_61_applicant_analysis():
    """61번 지원자 데이터로 AI 면접 분석 테스트"""
    
    print("🧪 61번 지원자 AI 면접 분석 테스트 시작")
    print("=" * 50)
    
    try:
        # 1. 61번 지원자 QA 분석 요청 (감정/문맥 분석 포함)
        print("📡 61번 지원자 QA 분석 요청 중...")
        
        response = requests.post(
            f"{WHISPER_API}/process-qa/61",
            params={
                "run_emotion_context": "true",
                "delete_video_after": "true"
            },
            timeout=1200  # 20분 타임아웃
        )
        
        print(f"📊 응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ QA 분석 성공!")
            print(f"📋 응답 데이터: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 2. 분석 결과 확인
            if result.get("success"):
                print(f"🎯 총 질문-답변 쌍: {result.get('total_pairs', 0)}개")
                print(f"👤 지원자 화자 ID: {result.get('applicant_speaker_id', 'N/A')}")
                print(f"🗑️ 파일 정리 완료: {result.get('files_cleaned', False)}")
                
                # 3. QA 결과 상세 확인
                qa_list = result.get("qa", [])
                if qa_list:
                    print(f"\n📝 QA 분석 결과 ({len(qa_list)}개):")
                    for i, qa in enumerate(qa_list, 1):
                        print(f"  {i}. 질문: {qa.get('question', 'N/A')[:50]}...")
                        print(f"     답변: {qa.get('answer_transcription', 'N/A')[:100]}...")
                        print(f"     점수: {qa.get('score', 'N/A')}")
                        print()
                
                # 4. 감정/문맥 분석 결과 확인
                if "emotion_analysis" in result:
                    print("🎭 감정 분석 결과:")
                    print(f"  {json.dumps(result['emotion_analysis'], indent=2, ensure_ascii=False)}")
                
                if "context_analysis" in result:
                    print("🧠 문맥 분석 결과:")
                    print(f"  {json.dumps(result['context_analysis'], indent=2, ensure_ascii=False)}")
                
            else:
                print("❌ QA 분석 실패")
                print(f"오류: {result.get('error', 'Unknown error')}")
                
        else:
            print(f"❌ API 호출 실패: {response.status_code}")
            print(f"응답: {response.text}")
            
    except requests.exceptions.Timeout:
        print("⏰ 요청 타임아웃 (20분 초과)")
    except requests.exceptions.ConnectionError:
        print("🔌 서버 연결 실패 - Docker 컨테이너가 실행 중인지 확인하세요")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")

def check_analysis_status():
    """61번 지원자 분석 상태 확인"""
    
    print("\n📊 61번 지원자 분석 상태 확인 중...")
    
    try:
        response = requests.get(f"{WHISPER_API}/status/61")
        
        if response.status_code == 200:
            status = response.json()
            print(f"📋 상태 정보: {json.dumps(status, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ 상태 확인 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ 상태 확인 오류: {str(e)}")

def check_qa_analysis_result():
    """61번 지원자 QA 분석 결과 조회"""
    
    print("\n📋 61번 지원자 QA 분석 결과 조회 중...")
    
    try:
        response = requests.get(f"{WHISPER_API}/qa-analysis/61")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📊 QA 분석 결과: {json.dumps(result, indent=2, ensure_ascii=False)}")
        else:
            print(f"❌ QA 분석 결과 조회 실패: {response.status_code}")
            
    except Exception as e:
        print(f"❌ QA 분석 결과 조회 오류: {str(e)}")

if __name__ == "__main__":
    print("🚀 61번 지원자 AI 면접 분석 테스트")
    print("=" * 50)
    
    # 1. 메인 분석 테스트
    test_61_applicant_analysis()
    
    # 2. 잠시 대기 후 상태 확인
    print("\n⏳ 10초 대기 후 상태 확인...")
    time.sleep(10)
    
    # 3. 분석 상태 확인
    check_analysis_status()
    
    # 4. QA 분석 결과 조회
    check_qa_analysis_result()
    
    print("\n✅ 테스트 완료!")
