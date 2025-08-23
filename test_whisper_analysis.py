#!/usr/bin/env python3
"""
Whisper 분석 테스트 스크립트 (agent 컨테이너용)
Google Drive URL에서 음성 인식 및 분석
"""

import os
import sys
import tempfile
import json
import requests
from datetime import datetime
from typing import Dict, Any, List

# agent 컨테이너의 모듈 import
from tools.speech_recognition_tool import SpeechRecognitionTool
from main import SpeakerAnalysisService

def test_whisper_analysis():
    """Whisper 분석 테스트"""
    print("🎤 Whisper 분석 테스트 시작")
    
    # Google Drive URL
    video_url = "https://drive.google.com/file/d/18dO35QTr0cHxEX8CtMtCkzfsBRes68XB/view?usp=drive_link"
    
    print(f"📁 비디오 URL: {video_url}")
    
    try:
        # 1. SpeechRecognitionTool 초기화
        print("\n1️⃣ SpeechRecognitionTool 초기화")
        speech_tool = SpeechRecognitionTool()
        print("✅ SpeechRecognitionTool 초기화 완료")
        
        # 2. Google Drive에서 비디오 다운로드
        print("\n2️⃣ Google Drive 다운로드")
        # video-analysis 컨테이너에서 다운로드한 파일 경로 사용
        video_path = "/tmp/video_analysis_e4jmx965/video_18dO35QTr0cHxEX8CtMtCkzfsBRes68XB.mp4"
        
        if not os.path.exists(video_path):
            print(f"❌ 비디오 파일을 찾을 수 없습니다: {video_path}")
            return False
            
        print(f"✅ 비디오 파일 확인: {video_path}")
        
        # 3. Whisper 음성 인식
        print("\n3️⃣ Whisper 음성 인식")
        transcription_result = speech_tool.recognize_speech(video_path)
        
        if transcription_result:
            print("✅ Whisper 음성 인식 완료")
            print(f"📝 전사 결과: {transcription_result[:200]}...")
        else:
            print("❌ Whisper 음성 인식 실패")
            return False
        
        # 4. SpeakerAnalysisService 분석
        print("\n4️⃣ SpeakerAnalysisService 분석")
        speaker_service = SpeakerAnalysisService()
        
        # 분석 실행
        analysis_result = speaker_service.analyze_speaker_performance(
            video_path=video_path,
            transcription=transcription_result
        )
        
        if analysis_result:
            print("✅ SpeakerAnalysisService 분석 완료")
            print(f"📊 분석 결과: {json.dumps(analysis_result, indent=2, ensure_ascii=False)}")
            
            # 5. 백엔드 API로 결과 전송
            print("\n5️⃣ 백엔드 API로 결과 전송")
            send_to_backend(analysis_result, 59)  # 59번 지원자
            
            return True
        else:
            print("❌ SpeakerAnalysisService 분석 실패")
            return False
            
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return False

def send_to_backend(analysis_result: Dict[str, Any], application_id: int):
    """백엔드 API로 분석 결과 전송"""
    try:
        backend_url = "http://backend:8000"
        
        # 분석 결과를 백엔드 형식으로 변환
        payload = {
            "application_id": application_id,
            "analysis_data": analysis_result,
            "created_at": datetime.now().isoformat()
        }
        
        response = requests.post(
            f"{backend_url}/api/v1/question-video-analysis/",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ 백엔드 API 전송 성공")
            return True
        else:
            print(f"❌ 백엔드 API 전송 실패: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 백엔드 API 전송 오류: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_whisper_analysis()
    if success:
        print("\n🎉 Whisper 분석 테스트 완료!")
    else:
        print("\n❌ Whisper 분석 테스트 실패!")
