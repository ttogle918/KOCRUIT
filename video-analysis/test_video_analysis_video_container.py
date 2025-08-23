#!/usr/bin/env python3
"""
비디오 분석 테스트 스크립트 (video-analysis 컨테이너용)
일회용으로 비디오 파일을 분석하고 DB에 저장
Google Drive URL 지원
"""

import os
import sys
import tempfile
import subprocess
import base64
import json
import requests
from datetime import datetime
from typing import Dict, Any, List

# video-analysis 컨테이너의 모듈 import
from video_downloader import VideoDownloader
from video_analyzer import VideoAnalyzer

def test_video_analysis():
    """비디오 분석 테스트"""
    print("🎬 비디오 분석 테스트 시작")
    
    # Google Drive URL 또는 로컬 파일 경로
    video_url = "https://drive.google.com/file/d/18dO35QTr0cHxEX8CtMtCkzfsBRes68XB/view?usp=drive_link"  # 실제 Google Drive URL로 변경
    
    print(f"📁 비디오 URL: {video_url}")
    
    # 1. 비디오 다운로드 테스트
    print("\n1️⃣ 비디오 다운로드 테스트")
    downloaded_video_path = test_video_download(video_url)
    
    if not downloaded_video_path:
        print("❌ 비디오 다운로드 실패")
        return
    
    # 2. 비디오 자르기 테스트
    print("\n2️⃣ 비디오 자르기 테스트")
    trimmed_video_path = test_video_trimming(downloaded_video_path)
    
    if not trimmed_video_path:
        print("❌ 비디오 자르기 실패")
        return
    
    # 3. Whisper 분석 테스트
    print("\n3️⃣ Whisper 분석 테스트")
    whisper_result = test_whisper_analysis(trimmed_video_path)
    
    if not whisper_result:
        print("❌ Whisper 분석 실패")
        return
    
    # 4. 비디오 분석 테스트
    print("\n4️⃣ 비디오 분석 테스트")
    video_analysis_result = test_video_analysis_full(trimmed_video_path)
    
    # 5. 백엔드 API로 결과 전송
    print("\n5️⃣ 백엔드 API로 결과 전송")
    test_send_to_backend(whisper_result, video_analysis_result, video_url)
    
    print("\n✅ 비디오 분석 테스트 완료")

def test_video_download(video_url: str) -> str:
    """비디오 다운로드 테스트"""
    try:
        # Google Drive URL인 경우
        if 'drive.google.com' in video_url:
            print("🔗 Google Drive URL 감지, 다운로드 시작...")
            
            downloader = VideoDownloader()
            downloaded_path = downloader.download_from_google_drive(video_url)
            
            if downloaded_path and os.path.exists(downloaded_path):
                print(f"✅ Google Drive 다운로드 완료: {downloaded_path}")
                return downloaded_path
            else:
                print("❌ Google Drive 다운로드 실패")
                return None
        
        # 로컬 파일 경로인 경우
        elif os.path.exists(video_url):
            print(f"✅ 로컬 파일 확인: {video_url}")
            return video_url
        
        else:
            print("❌ 지원하지 않는 URL 형식")
            return None
            
    except Exception as e:
        print(f"❌ 비디오 다운로드 오류: {str(e)}")
        return None

def test_video_trimming(video_path: str) -> str:
    """비디오 자르기 테스트"""
    try:
        # 비디오 길이 확인
        probe_cmd = f'ffprobe -v quiet -show_entries format=duration -of csv=p=0 "{video_path}"'
        result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("❌ 비디오 길이 확인 실패")
            return video_path
        
        duration = float(result.stdout.strip())
        print(f"📊 원본 비디오 길이: {duration:.2f}초")
        
        # 5분(300초) 이상이면 자르기
        if duration > 300:
            print("✂️ 비디오 자르기 시작 (5분 이상)")
            
            trimmed_path = tempfile.mktemp(suffix='.mp4')
            trim_cmd = f'ffmpeg -i "{video_path}" -t 300 -c copy "{trimmed_path}" -y'
            
            result = subprocess.run(trim_cmd, shell=True, capture_output=True)
            
            if result.returncode == 0:
                print(f"✅ 비디오 자르기 완료: {trimmed_path}")
                return trimmed_path
            else:
                print("❌ 비디오 자르기 실패")
                return video_path
        else:
            print("✅ 비디오가 이미 적절한 길이입니다")
            return video_path
            
    except Exception as e:
        print(f"❌ 비디오 자르기 오류: {str(e)}")
        return video_path

def test_whisper_analysis(video_path: str) -> Dict[str, Any]:
    """Whisper 분석 테스트"""
    try:
        # Whisper 모델 로드
        import whisper
        model = whisper.load_model("base")
        
        print("🎤 Whisper 모델 로드 완료")
        
        # 음성 인식 수행
        print("🔍 음성 인식 중...")
        result = model.transcribe(video_path, word_timestamps=True)
        
        # 분석 결과 정리
        analysis_result = {
            "transcription": result["text"],
            "segments": result.get("segments", []),
            "language": result.get("language", "ko"),
            "duration": len(result.get("segments", [])) * 2 if result.get("segments") else 0,
            "word_count": len(result["text"].split()),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        print(f"✅ Whisper 분석 완료")
        print(f"📝 전사 결과: {analysis_result['transcription'][:100]}...")
        print(f"🔢 단어 수: {analysis_result['word_count']}")
        print(f"⏱️ 세그먼트 수: {len(analysis_result['segments'])}")
        
        return analysis_result
        
    except Exception as e:
        print(f"❌ Whisper 분석 오류: {str(e)}")
        return None

def test_video_analysis_full(video_path: str) -> Dict[str, Any]:
    """전체 비디오 분석 테스트"""
    try:
        print("🎬 전체 비디오 분석 시작...")
        
        analyzer = VideoAnalyzer()
        analysis_result = analyzer.analyze_video(video_path, application_id=59)
        
        print(f"✅ 전체 비디오 분석 완료")
        print(f"📊 분석 결과 키: {list(analysis_result.keys())}")
        
        return analysis_result
        
    except Exception as e:
        print(f"❌ 전체 비디오 분석 오류: {str(e)}")
        return {}

def test_send_to_backend(whisper_result: Dict[str, Any], video_analysis_result: Dict[str, Any], video_url: str):
    """백엔드 API로 결과 전송"""
    try:
        print("📡 백엔드 API로 결과 전송 중...")
        
        # 백엔드 API 엔드포인트
        backend_url = "http://kocruit_fastapi:8000/api/v1/question-video-analysis/test-results"
        
        # 전송할 데이터
        payload = {
            "application_id": 59,
            "video_url": video_url,
            "whisper_analysis": whisper_result,
            "video_analysis": video_analysis_result,
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        # POST 요청
        response = requests.post(backend_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 백엔드 전송 성공: {result}")
        else:
            print(f"❌ 백엔드 전송 실패: {response.status_code}")
            print(f"응답: {response.text}")
        
    except Exception as e:
        print(f"❌ 백엔드 전송 오류: {str(e)}")

def test_google_drive_download_only():
    """Google Drive 다운로드만 테스트"""
    print("🔗 Google Drive 다운로드 테스트")
    
    video_url = "https://drive.google.com/file/d/18dO35QTr0cHxEX8CtMtCkzfsBRes68XB/view?usp=drive_link"
    
    try:
        downloader = VideoDownloader()
        downloaded_path = downloader.download_from_google_drive(video_url)
        
        if downloaded_path and os.path.exists(downloaded_path):
            print(f"✅ Google Drive 다운로드 성공: {downloaded_path}")
            
            # 파일 크기 확인
            file_size = os.path.getsize(downloaded_path)
            print(f"📊 파일 크기: {file_size / (1024*1024):.2f} MB")
            
            return downloaded_path
        else:
            print("❌ Google Drive 다운로드 실패")
            return None
            
    except Exception as e:
        print(f"❌ Google Drive 다운로드 오류: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="비디오 분석 테스트 (video-analysis 컨테이너용)")
    parser.add_argument("--download-only", action="store_true", help="Google Drive 다운로드만 테스트")
    parser.add_argument("--url", type=str, help="테스트할 비디오 URL (Google Drive 또는 로컬 파일)")
    
    args = parser.parse_args()
    
    if args.download_only:
        test_google_drive_download_only()
    else:
        if args.url:
            # URL을 전역 변수로 설정
            video_url = args.url
        test_video_analysis()
