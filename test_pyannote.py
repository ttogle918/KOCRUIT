#!/usr/bin/env python3
"""
pyannote.audio 테스트 스크립트
"""
import sys
import os

# agent 컨테이너의 모듈 import
sys.path.append('/app')

try:
    from tools.speaker_diarization_tool import SpeakerDiarizationTool
    print("✅ pyannote.audio import 성공")
    
    # 화자 분리 도구 초기화
    tool = SpeakerDiarizationTool()
    print("✅ SpeakerDiarizationTool 인스턴스 생성 성공")
    
    # 파이프라인 초기화 테스트
    result = tool.initialize_pipeline()
    print(f"✅ pyannote.audio 파이프라인 초기화: {result}")
    
    if result:
        print("🎉 pyannote.audio 정상 작동!")
    else:
        print("⚠️ pyannote.audio 초기화 실패")
        
except Exception as e:
    print(f"❌ pyannote.audio 테스트 실패: {str(e)}")
    import traceback
    traceback.print_exc()
