#!/usr/bin/env python3
"""
테스트용 오디오 파일 생성 스크립트
간단한 면접 답변을 포함한 테스트 오디오를 생성합니다.
"""

import os
import tempfile
from gtts import gTTS
import numpy as np
from scipy.io import wavfile

def create_test_audio():
    """테스트용 오디오 파일 생성"""
    
    # 테스트 면접 답변 텍스트
    test_text = """
    안녕하세요. 저는 소프트웨어 개발자 지원자입니다.
    주로 웹 개발과 모바일 앱 개발을 담당했으며,
    React와 Node.js를 주로 사용합니다.
    팀 프로젝트에서 프론트엔드 개발을 담당했고,
    사용자 경험을 개선하는 것에 관심이 많습니다.
    새로운 기술을 배우는 것을 좋아하며,
    지속적으로 성장하고 싶습니다.
    """
    
    try:
        # gTTS를 사용하여 한국어 음성 생성
        print("🎤 테스트 오디오 생성 중...")
        tts = gTTS(text=test_text, lang='ko', slow=False)
        
        # interview_videos 디렉토리에 저장
        output_dir = "interview_videos"
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, "test_interview_answer.mp3")
        tts.save(output_file)
        
        print(f"✅ 테스트 오디오 생성 완료: {output_file}")
        print(f"📁 파일 크기: {os.path.getsize(output_file)} bytes")
        
        return output_file
        
    except Exception as e:
        print(f"❌ 테스트 오디오 생성 실패: {e}")
        return None

def create_simple_wav():
    """간단한 WAV 파일 생성 (gTTS가 실패할 경우 대체)"""
    
    try:
        # 1초 길이의 440Hz 사인파 생성
        sample_rate = 44100
        duration = 3  # 3초
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        
        # 간단한 멜로디 생성
        frequency = 440
        audio = np.sin(2 * np.pi * frequency * t) * 0.3
        
        # 16비트 정수로 변환
        audio = (audio * 32767).astype(np.int16)
        
        # interview_videos 디렉토리에 저장
        output_dir = "interview_videos"
        os.makedirs(output_dir, exist_ok=True)
        
        output_file = os.path.join(output_dir, "test_interview_answer.wav")
        wavfile.write(output_file, sample_rate, audio)
        
        print(f"✅ 테스트 WAV 파일 생성 완료: {output_file}")
        print(f"📁 파일 크기: {os.path.getsize(output_file)} bytes")
        
        return output_file
        
    except Exception as e:
        print(f"❌ 테스트 WAV 파일 생성 실패: {e}")
        return None

if __name__ == "__main__":
    print("🎵 테스트 오디오 파일 생성 시작")
    print("=" * 50)
    
    # 먼저 gTTS로 시도
    audio_file = create_test_audio()
    
    if not audio_file:
        print("⚠️ gTTS 실패, 대체 방법으로 WAV 파일 생성...")
        audio_file = create_simple_wav()
    
    if audio_file:
        print(f"\n🎉 테스트 완료!")
        print(f"📂 생성된 파일: {audio_file}")
        print(f"🔗 정적 파일 URL: /static/interview_videos/{os.path.basename(audio_file)}")
        print("\n💡 이제 프론트엔드에서 녹음/분석 기능을 테스트할 수 있습니다!")
    else:
        print("❌ 모든 방법이 실패했습니다.")
        print("💡 필요한 패키지를 설치해주세요:")
        print("   pip install gtts scipy")
