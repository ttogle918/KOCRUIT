#!/usr/bin/env python3
"""
비디오 분석 테스트 스크립트
일회용으로 비디오 파일을 분석하고 DB에 저장
Google Drive URL 지원
"""

import os
import sys
import tempfile
import subprocess
import base64
import json
from datetime import datetime
from typing import Dict, Any, List

# 프로젝트 루트 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 백엔드 모델 import
from app.models.media_analysis import MediaAnalysis
from app.models.question_video_analysis import QuestionMediaAnalysis
from app.core.database import get_db
from sqlalchemy.orm import Session

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
    
    # 4. DB 저장 테스트
    print("\n4️⃣ DB 저장 테스트")
    test_db_save(whisper_result, video_url)
    
    print("\n✅ 비디오 분석 테스트 완료")

def test_video_download(video_url: str) -> str:
    """비디오 다운로드 테스트"""
    try:
        # Google Drive URL인 경우
        if 'drive.google.com' in video_url:
            print("🔗 Google Drive URL 감지, 다운로드 시작...")
            
            # video-analysis 서비스의 VideoDownloader 사용
            from video_analysis.video_downloader import VideoDownloader
            
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

def test_db_save(whisper_result: Dict[str, Any], original_video_url: str):
    """DB 저장 테스트"""
    try:
        db = next(get_db())
        
        # 테스트용 application_id (실제로는 존재하는 ID 사용)
        test_application_id = 59  # 실제 존재하는 application_id로 변경
        
        # 1. 전체 비디오 분석 결과 저장
        print("💾 전체 비디오 분석 결과 저장 중...")
        
        media_analysis = MediaAnalysis(
            application_id=test_application_id,
            video_path=original_video_url,  # Google Drive URL 저장
            video_url=original_video_url,
            analysis_timestamp=datetime.now(),
            status="completed",
            
            # Whisper 분석 결과
            transcription=whisper_result["transcription"],
            speech_rate=whisper_result["word_count"] // 2,  # 간단한 계산
            
            # 더미 데이터 (실제로는 분석 결과)
            smile_frequency=0.8,
            eye_contact_ratio=0.85,
            confidence_score=0.75,
            posture_score=0.8,
            clarity_score=0.9,
            overall_score=4.2,
            
            # 상세 분석 데이터
            detailed_analysis=json.dumps(whisper_result)
        )
        
        db.add(media_analysis)
        db.commit()
        db.refresh(media_analysis)
        
        print(f"✅ 전체 비디오 분석 저장 완료 (ID: {media_analysis.id})")
        
        # 2. 질문별 분석 결과 저장 (더미 데이터)
        print("💾 질문별 분석 결과 저장 중...")
        
        # 질문별 분석 결과 (더미 데이터)
        question_analyses = [
            {
                "question_text": "자기소개를 해주세요",
                "transcription": "안녕하세요, 저는 개발자 김철수입니다.",
                "question_score": 4.5
            },
            {
                "question_text": "프로젝트 경험에 대해 설명해주세요",
                "transcription": "웹 개발 프로젝트를 진행한 경험이 있습니다.",
                "question_score": 4.0
            }
        ]
        
        for i, qa in enumerate(question_analyses):
            question_analysis = QuestionMediaAnalysis(
                application_id=test_application_id,
                question_log_id=i + 1,  # 실제 question_log_id 사용
                question_text=qa["question_text"],
                transcription=qa["transcription"],
                question_score=qa["question_score"],
                analysis_timestamp=datetime.now(),
                status="completed"
            )
            
            db.add(question_analysis)
        
        db.commit()
        print("✅ 질문별 분석 결과 저장 완료")
        
        return True
        
    except Exception as e:
        print(f"❌ DB 저장 오류: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

def clear_test_data():
    """테스트 데이터 정리"""
    try:
        db = next(get_db())
        
        # 테스트용 application_id
        test_application_id = 59
        
        # 기존 데이터 삭제
        video_deleted = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == test_application_id
        ).delete()
        
        question_deleted = db.query(QuestionMediaAnalysis).filter(
            QuestionMediaAnalysis.application_id == test_application_id
        ).delete()
        
        db.commit()
        
        print(f"🗑️ 테스트 데이터 정리 완료")
        print(f"📹 삭제된 전체 분석: {video_deleted}개")
        print(f"❓ 삭제된 질문별 분석: {question_deleted}개")
        
        db.close()
        
    except Exception as e:
        print(f"❌ 데이터 정리 오류: {str(e)}")
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="비디오 분석 테스트")
    parser.add_argument("--clear", action="store_true", help="테스트 데이터 정리")
    parser.add_argument("--url", type=str, help="테스트할 비디오 URL (Google Drive 또는 로컬 파일)")
    
    args = parser.parse_args()
    
    if args.clear:
        clear_test_data()
    else:
        if args.url:
            # URL을 전역 변수로 설정
            video_url = args.url
        test_video_analysis()
