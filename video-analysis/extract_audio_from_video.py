#!/usr/bin/env python3
"""
MP4 파일에서 오디오 추출 스크립트
video-analysis 컨테이너에서 실행
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

def extract_audio_from_video(video_path: str, output_dir: str = "/tmp") -> str:
    """MP4 파일에서 오디오 추출"""
    print(f"🎵 오디오 추출 시작: {video_path}")
    
    # 출력 파일명 생성
    video_name = Path(video_path).stem
    audio_path = os.path.join(output_dir, f"{video_name}_audio.wav")
    
    try:
        # ffmpeg를 사용하여 오디오 추출
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vn",  # 비디오 스트림 제외
            "-acodec", "pcm_s16le",  # 16-bit PCM
            "-ar", "16000",  # 16kHz 샘플링 레이트 (Whisper 권장)
            "-ac", "1",  # 모노 채널
            "-y",  # 기존 파일 덮어쓰기
            audio_path
        ]
        
        print(f"🔧 명령어: {' '.join(cmd)}")
        
        # ffmpeg 실행
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ 오디오 추출 완료: {audio_path}")
            
            # 파일 크기 확인
            if os.path.exists(audio_path):
                size = os.path.getsize(audio_path)
                print(f"📊 오디오 파일 크기: {size:,} bytes ({size/1024/1024:.2f} MB)")
                return audio_path
            else:
                print("❌ 오디오 파일이 생성되지 않았습니다")
                return None
        else:
            print(f"❌ ffmpeg 실행 실패: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ 오디오 추출 오류: {str(e)}")
        return None

def main():
    """메인 함수"""
    # 비디오 파일 경로
    video_path = "/tmp/video_analysis_e4jmx965/video_18dO35QTr0cHxEX8CtMtCkzfsBRes68XB.mp4"
    
    if not os.path.exists(video_path):
        print(f"❌ 비디오 파일을 찾을 수 없습니다: {video_path}")
        return False
    
    # 오디오 추출
    audio_path = extract_audio_from_video(video_path)
    
    if audio_path:
        print(f"\n🎉 오디오 추출 성공!")
        print(f"📁 비디오: {video_path}")
        print(f"🎵 오디오: {audio_path}")
        
        # agent 컨테이너로 복사할 수 있도록 경로 출력
        print(f"\n📋 agent 컨테이너로 복사할 명령어:")
        print(f"docker cp {audio_path} kocruit_agent:/tmp/")
        
        return True
    else:
        print("\n❌ 오디오 추출 실패!")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ 스크립트 실행 완료!")
    else:
        print("\n❌ 스크립트 실행 실패!")
