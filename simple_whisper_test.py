#!/usr/bin/env python3
"""
간단한 Whisper 테스트 스크립트 (agent 컨테이너용)
상대 import 없이 SpeechRecognitionTool만 사용
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Dict, Any

# 절대 import 사용
sys.path.append('/app')

def test_simple_whisper():
    """간단한 Whisper 테스트"""
    print("🎤 간단한 Whisper 테스트 시작")
    
    try:
        # 1. SpeechRecognitionTool만 import
        print("\n1️⃣ SpeechRecognitionTool import")
        from tools.speech_recognition_tool import SpeechRecognitionTool
        print("✅ SpeechRecognitionTool import 완료")
        
        # 2. SpeechRecognitionTool 초기화
        print("\n2️⃣ SpeechRecognitionTool 초기화")
        speech_tool = SpeechRecognitionTool()
        print("✅ SpeechRecognitionTool 초기화 완료")
        
        # 3. 오디오 파일 경로 확인
        print("\n3️⃣ 오디오 파일 확인")
        audio_path = "/tmp/video_18dO35QTr0cHxEX8CtMtCkzfsBRes68XB_audio.wav"
        
        if not os.path.exists(audio_path):
            print(f"❌ 오디오 파일을 찾을 수 없습니다: {audio_path}")
            print("📁 사용 가능한 파일들:")
            try:
                import glob
                files = glob.glob("/tmp/*.wav")
                for f in files:
                    print(f"  - {f}")
            except:
                print("  - 파일 목록을 가져올 수 없습니다")
            return False
            
        print(f"✅ 오디오 파일 확인: {audio_path}")
        
        # 4. Whisper 음성 인식
        print("\n4️⃣ Whisper 음성 인식")
        transcription_result = speech_tool.transcribe_audio(audio_path)
        
        print(f"📊 전사 결과: {transcription_result}")
        
        if transcription_result and transcription_result.get("success"):
            print("✅ Whisper 음성 인식 완료")
            print(f"📝 전사 결과: {transcription_result['text'][:200]}...")
            
            # 5. 결과를 파일로 저장
            print("\n5️⃣ 결과 저장")
            result_data = {
                "application_id": 59,
                "transcription": transcription_result["text"],
                "segments": transcription_result["segments"],
                "language": transcription_result["language"],
                "video_path": audio_path,
                "created_at": datetime.now().isoformat()
            }
            
            with open("/tmp/whisper_result.json", "w", encoding="utf-8") as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2)
            
            print("✅ 결과 저장 완료: /tmp/whisper_result.json")
            return True
        else:
            print("❌ Whisper 음성 인식 실패")
            if transcription_result:
                print(f"❌ 오류 정보: {transcription_result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_whisper()
    if success:
        print("\n🎉 간단한 Whisper 테스트 완료!")
    else:
        print("\n❌ 간단한 Whisper 테스트 실패!")
