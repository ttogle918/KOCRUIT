#!/usr/bin/env python3
"""
비디오 파일 유효성 검사 및 오디오 처리 문제 해결 스크립트
FFmpeg 오류와 moov atom 문제를 해결합니다.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

import logging
import requests
import tempfile
import subprocess
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 데이터베이스 연결 설정
DATABASE_URL = "postgresql://postgres:password@localhost:5432/kocruit_db"

class VideoAudioProcessor:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="video_audio_fix_")
        logger.info(f"임시 디렉토리 생성: {self.temp_dir}")
    
    def download_and_fix_video(self, url: str) -> str:
        """비디오 다운로드 및 수정"""
        try:
            logger.info(f"비디오 다운로드 시작: {url}")
            
            # 1. 비디오 다운로드
            video_path = self._download_video(url)
            if not video_path:
                logger.error("비디오 다운로드 실패")
                return None
            
            # 2. 비디오 유효성 검사
            if not self._validate_video(video_path):
                logger.warning("비디오 유효성 검사 실패, 수정 시도")
                fixed_path = self._fix_video_file(video_path)
                if fixed_path:
                    video_path = fixed_path
                else:
                    logger.error("비디오 수정 실패")
                    return None
            
            # 3. 오디오 추출 테스트
            audio_path = self._extract_audio_test(video_path)
            if audio_path:
                logger.info(f"오디오 추출 성공: {audio_path}")
            else:
                logger.error("오디오 추출 실패")
            
            return video_path
            
        except Exception as e:
            logger.error(f"비디오 처리 중 오류: {str(e)}")
            return None
    
    def _download_video(self, url: str) -> str:
        """비디오 다운로드"""
        try:
            # Google Drive URL 처리
            if 'drive.google.com' in url:
                return self._download_from_google_drive(url)
            else:
                return self._download_from_url(url)
        except Exception as e:
            logger.error(f"비디오 다운로드 실패: {str(e)}")
            return None
    
    def _download_from_google_drive(self, url: str) -> str:
        """Google Drive에서 다운로드"""
        try:
            import re
            
            # 파일 ID 추출 (개선된 패턴)
            patterns = [
                r'/file/d/([a-zA-Z0-9_-]+)',
                r'/d/([a-zA-Z0-9_-]+)',
                r'id=([a-zA-Z0-9_-]+)',
                r'/file/d/([a-zA-Z0-9_-]+)/view\?usp=drive_link',
                r'/file/d/([a-zA-Z0-9_-]+)/view\?usp=sharing',
            ]
            
            file_id = None
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    file_id = match.group(1)
                    break
            
            if not file_id:
                logger.error("파일 ID 추출 실패")
                return None
            
            logger.info(f"파일 ID: {file_id}")
            
            # 다운로드 URL 생성
            download_url = f"https://drive.google.com/uc?id={file_id}&export=download"
            
            # 다운로드
            response = requests.get(download_url, stream=True, timeout=60)
            
            # 대용량 파일 확인 페이지 처리
            if 'confirm=' in response.url:
                confirm_token = re.search(r'confirm=([^&]+)', response.url).group(1)
                download_url = f"{download_url}&confirm={confirm_token}"
                response = requests.get(download_url, stream=True, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"다운로드 실패: {response.status_code}")
                return None
            
            # 파일 저장
            video_path = os.path.join(self.temp_dir, f"video_{file_id}.mp4")
            
            total_size = 0
            with open(video_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
            
            logger.info(f"다운로드 완료: {video_path} ({total_size} bytes)")
            
            if total_size < 1000000:  # 1MB 미만
                logger.error("다운로드된 파일이 너무 작습니다")
                return None
            
            return video_path
            
        except Exception as e:
            logger.error(f"Google Drive 다운로드 실패: {str(e)}")
            return None
    
    def _download_from_url(self, url: str) -> str:
        """일반 URL에서 다운로드"""
        try:
            response = requests.get(url, stream=True, timeout=60)
            response.raise_for_status()
            
            video_path = os.path.join(self.temp_dir, "video.mp4")
            
            total_size = 0
            with open(video_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
            
            logger.info(f"다운로드 완료: {video_path} ({total_size} bytes)")
            return video_path
            
        except Exception as e:
            logger.error(f"URL 다운로드 실패: {str(e)}")
            return None
    
    def _validate_video(self, video_path: str) -> bool:
        """비디오 유효성 검사"""
        try:
            logger.info(f"비디오 유효성 검사: {video_path}")
            
            # FFprobe로 비디오 정보 확인
            cmd = [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", video_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                logger.error(f"FFprobe 실패: {result.stderr}")
                return False
            
            # JSON 파싱
            info = json.loads(result.stdout)
            
            # 비디오 스트림 확인
            video_streams = [s for s in info.get('streams', []) if s.get('codec_type') == 'video']
            audio_streams = [s for s in info.get('streams', []) if s.get('codec_type') == 'audio']
            
            if not video_streams:
                logger.error("비디오 스트림이 없습니다")
                return False
            
            # 비디오 정보 출력
            video_info = video_streams[0]
            duration = float(info.get('format', {}).get('duration', 0))
            fps = eval(video_info.get('r_frame_rate', '0/1'))
            
            logger.info(f"비디오 정보: {duration:.2f}초, {fps:.2f} FPS")
            logger.info(f"비디오 스트림: {len(video_streams)}개, 오디오 스트림: {len(audio_streams)}개")
            
            if duration <= 0 or fps <= 0:
                logger.error("유효하지 않은 비디오 정보")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"비디오 유효성 검사 실패: {str(e)}")
            return False
    
    def _fix_video_file(self, video_path: str) -> str:
        """비디오 파일 수정 (moov atom 문제 해결)"""
        try:
            logger.info("비디오 파일 수정 시작...")
            
            # 1. FFmpeg로 재인코딩 (moov atom 재생성)
            fixed_path = os.path.join(self.temp_dir, "fixed_video.mp4")
            
            cmd = [
                "ffmpeg", "-i", video_path,
                "-c:v", "libx264", "-c:a", "aac",
                "-movflags", "+faststart",  # moov atom을 파일 앞쪽으로 이동
                "-y", fixed_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                logger.error(f"비디오 수정 실패: {result.stderr}")
                return None
            
            logger.info("비디오 파일 수정 완료")
            
            # 수정된 파일 유효성 검사
            if self._validate_video(fixed_path):
                return fixed_path
            else:
                logger.error("수정된 파일도 유효하지 않음")
                return None
            
        except Exception as e:
            logger.error(f"비디오 파일 수정 실패: {str(e)}")
            return None
    
    def _extract_audio_test(self, video_path: str) -> str:
        """오디오 추출 테스트"""
        try:
            logger.info("오디오 추출 테스트 시작...")
            
            audio_path = os.path.join(self.temp_dir, "extracted_audio.wav")
            
            # FFmpeg로 오디오 추출
            cmd = [
                "ffmpeg", "-i", video_path,
                "-vn", "-acodec", "pcm_s16le",
                "-ar", "16000", "-ac", "1",
                "-y", audio_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                logger.error(f"오디오 추출 실패: {result.stderr}")
                return None
            
            # 오디오 파일 크기 확인
            if os.path.exists(audio_path):
                file_size = os.path.getsize(audio_path)
                logger.info(f"오디오 추출 완료: {audio_path} ({file_size} bytes)")
                
                if file_size > 1000:  # 1KB 이상
                    return audio_path
                else:
                    logger.error("추출된 오디오 파일이 너무 작습니다")
                    return None
            
            return None
            
        except Exception as e:
            logger.error(f"오디오 추출 테스트 실패: {str(e)}")
            return None
    
    def test_application_video(self, application_id: int) -> dict:
        """지원자의 비디오 테스트"""
        try:
            # 지원자 정보 조회
            engine = create_engine(DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = SessionLocal()
            
            result = db.execute(text("""
                SELECT ai_interview_video_url, video_url
                FROM application 
                WHERE id = :application_id
            """), {'application_id': application_id})
            
            row = result.fetchone()
            if not row:
                logger.error(f"지원자 {application_id}를 찾을 수 없습니다")
                return None
            
            video_url = row[0] or row[1]  # ai_interview_video_url 우선, 없으면 video_url
            
            if not video_url:
                logger.error(f"지원자 {application_id}의 비디오 URL이 없습니다")
                return None
            
            logger.info(f"지원자 {application_id} 비디오 URL: {video_url}")
            
            # 비디오 처리 테스트
            result = {
                'application_id': application_id,
                'original_url': video_url,
                'download_success': False,
                'validation_success': False,
                'fix_success': False,
                'audio_extraction_success': False,
                'processed_video_path': None,
                'audio_path': None,
                'errors': []
            }
            
            # 1. 다운로드
            video_path = self._download_video(video_url)
            if video_path:
                result['download_success'] = True
                result['processed_video_path'] = video_path
            else:
                result['errors'].append("다운로드 실패")
                return result
            
            # 2. 유효성 검사
            if self._validate_video(video_path):
                result['validation_success'] = True
            else:
                result['errors'].append("유효성 검사 실패")
                
                # 3. 수정 시도
                fixed_path = self._fix_video_file(video_path)
                if fixed_path:
                    result['fix_success'] = True
                    result['processed_video_path'] = fixed_path
                else:
                    result['errors'].append("비디오 수정 실패")
                    return result
            
            # 4. 오디오 추출 테스트
            audio_path = self._extract_audio_test(result['processed_video_path'])
            if audio_path:
                result['audio_extraction_success'] = True
                result['audio_path'] = audio_path
            else:
                result['errors'].append("오디오 추출 실패")
            
            return result
            
        except Exception as e:
            logger.error(f"지원자 비디오 테스트 실패: {str(e)}")
            return {'application_id': application_id, 'errors': [str(e)]}
        finally:
            db.close()
    
    def cleanup(self):
        """임시 파일 정리"""
        try:
            import shutil
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"임시 디렉토리 정리 완료: {self.temp_dir}")
        except Exception as e:
            logger.error(f"임시 디렉토리 정리 중 오류: {str(e)}")

def main():
    """메인 실행 함수"""
    logger.info("🚀 비디오 오디오 처리 문제 해결 시작")
    
    processor = VideoAudioProcessor()
    
    try:
        # 68번 지원자 테스트
        logger.info("\n1️⃣ 68번 지원자 비디오 테스트")
        result_68 = processor.test_application_video(68)
        
        if result_68:
            logger.info(f"68번 지원자 결과:")
            logger.info(f"  다운로드: {'✅' if result_68['download_success'] else '❌'}")
            logger.info(f"  유효성 검사: {'✅' if result_68['validation_success'] else '❌'}")
            logger.info(f"  수정: {'✅' if result_68['fix_success'] else '❌'}")
            logger.info(f"  오디오 추출: {'✅' if result_68['audio_extraction_success'] else '❌'}")
            
            if result_68['errors']:
                logger.error(f"  오류: {result_68['errors']}")
        
        # 61번 지원자 테스트
        logger.info("\n2️⃣ 61번 지원자 비디오 테스트")
        result_61 = processor.test_application_video(61)
        
        if result_61:
            logger.info(f"61번 지원자 결과:")
            logger.info(f"  다운로드: {'✅' if result_61['download_success'] else '❌'}")
            logger.info(f"  유효성 검사: {'✅' if result_61['validation_success'] else '❌'}")
            logger.info(f"  수정: {'✅' if result_61['fix_success'] else '❌'}")
            logger.info(f"  오디오 추출: {'✅' if result_61['audio_extraction_success'] else '❌'}")
            
            if result_61['errors']:
                logger.error(f"  오류: {result_61['errors']}")
        
        # 결과를 JSON 파일로 저장
        results = {
            'application_68': result_68,
            'application_61': result_61
        }
        
        with open('video_audio_processing_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        
        logger.info("\n📄 결과가 video_audio_processing_results.json 파일에 저장되었습니다")
        
        # 해결 방안 제시
        logger.info("\n🔧 해결 방안:")
        if result_68 and result_68['audio_extraction_success']:
            logger.info("✅ 68번 지원자 비디오 오디오 처리 성공!")
        else:
            logger.info("❌ 68번 지원자 비디오 오디오 처리 실패")
            logger.info("   해결방안:")
            logger.info("   1. Google Drive 파일 공유 설정 확인")
            logger.info("   2. 새로운 비디오 파일 업로드")
            logger.info("   3. Video Analysis 서비스 재시작")
        
    except Exception as e:
        logger.error(f"테스트 중 오류: {str(e)}")
    finally:
        processor.cleanup()

if __name__ == "__main__":
    main() 