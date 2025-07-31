import os
import re
import tempfile
import requests
import logging
from typing import Optional, Tuple
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

class VideoDownloader:
    """Google Drive 및 일반 URL에서 영상 파일을 다운로드하는 클래스"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="video_analysis_")
        logger.info(f"임시 디렉토리 생성: {self.temp_dir}")
    
    def extract_google_drive_file_id(self, url: str) -> Optional[str]:
        """Google Drive URL에서 파일 ID를 추출합니다."""
        patterns = [
            r'/file/d/([a-zA-Z0-9_-]+)',
            r'/d/([a-zA-Z0-9_-]+)',
            r'id=([a-zA-Z0-9_-]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def download_from_google_drive(self, url: str) -> Optional[str]:
        """Google Drive URL에서 파일을 다운로드합니다."""
        try:
            file_id = self.extract_google_drive_file_id(url)
            if not file_id:
                logger.error(f"Google Drive 파일 ID를 추출할 수 없습니다: {url}")
                return None
            
            # 방법 1: gdown 스타일 다운로드 (가장 안정적)
            logger.info("gdown 스타일 다운로드 시도...")
            download_url = f"https://drive.google.com/uc?id={file_id}&export=download"
            
            session = requests.Session()
            
            # 첫 번째 요청으로 쿠키 설정
            response = session.get(download_url, stream=True)
            
            # 대용량 파일인 경우 확인 페이지 처리
            if 'confirm=' in response.url:
                confirm_token = re.search(r'confirm=([^&]+)', response.url).group(1)
                download_url = f"https://drive.google.com/uc?id={file_id}&export=download&confirm={confirm_token}"
                response = session.get(download_url, stream=True)
            
            # 방법 2: 직접 다운로드 URL
            if response.status_code != 200 or 'text/html' in response.headers.get('content-type', ''):
                logger.info("gdown 스타일 실패, 직접 다운로드 시도...")
                direct_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                response = session.get(direct_url, stream=True)
                
                if 'confirm=' in response.url:
                    confirm_token = re.search(r'confirm=([^&]+)', response.url).group(1)
                    direct_url = f"{direct_url}&confirm={confirm_token}"
                    response = session.get(direct_url, stream=True)
            
            # 방법 3: 공개 링크 변환
            if response.status_code != 200 or 'text/html' in response.headers.get('content-type', ''):
                logger.info("직접 다운로드 실패, 공개 링크 변환 시도...")
                public_url = f"https://drive.google.com/uc?export=download&confirm=t&id={file_id}"
                response = session.get(public_url, stream=True)
            
            if response.status_code != 200:
                logger.error(f"Google Drive 다운로드 실패: {response.status_code}")
                return None
            
            # 파일 크기 확인
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) < 1000:  # 1KB 미만이면 HTML 페이지일 가능성
                logger.error("다운로드된 파일이 너무 작습니다 (HTML 페이지일 가능성)")
                return None
            
            # 파일 확장자 결정
            content_type = response.headers.get('content-type', '')
            content_disposition = response.headers.get('content-disposition', '')
            
            if 'video' in content_type:
                extension = '.mp4'
            elif 'filename=' in content_disposition:
                filename_match = re.search(r'filename="([^"]+)"', content_disposition)
                if filename_match:
                    filename = filename_match.group(1)
                    extension = os.path.splitext(filename)[1] or '.mp4'
                else:
                    extension = '.mp4'
            else:
                extension = '.mp4'
            
            # 임시 파일 생성
            temp_file_path = os.path.join(self.temp_dir, f"video_{file_id}{extension}")
            
            # 파일 다운로드 (청크 단위로)
            total_size = 0
            with open(temp_file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
            
            # 파일 크기 확인
            if total_size < 1000:  # 1KB 미만이면 실패로 간주
                logger.error(f"다운로드된 파일이 너무 작습니다: {total_size} bytes")
                os.remove(temp_file_path)
                return None
            
            # 파일 유효성 검사 (간단한 MP4 헤더 확인)
            with open(temp_file_path, 'rb') as f:
                header = f.read(8)
                if not header.startswith(b'\x00\x00\x00') and not header.startswith(b'ftyp'):
                    logger.warning("파일이 MP4 형식이 아닐 수 있습니다")
            
            logger.info(f"Google Drive 파일 다운로드 완료: {temp_file_path} ({total_size} bytes)")
            return temp_file_path
            
        except Exception as e:
            logger.error(f"Google Drive 다운로드 중 오류: {str(e)}")
            return None
    
    def download_from_url(self, url: str) -> Optional[str]:
        """일반 URL에서 파일을 다운로드합니다."""
        try:
            # URL에서 파일명 추출
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            if not filename or '.' not in filename:
                filename = f"video_{hash(url)}.mp4"
            
            temp_file_path = os.path.join(self.temp_dir, filename)
            
            # 파일 다운로드
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            total_size = 0
            with open(temp_file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
            
            logger.info(f"URL 파일 다운로드 완료: {temp_file_path} ({total_size} bytes)")
            return temp_file_path
            
        except Exception as e:
            logger.error(f"URL 다운로드 중 오류: {str(e)}")
            return None
    
    def download_video(self, url: str) -> Optional[str]:
        """URL 타입에 따라 적절한 다운로드 방법을 선택합니다."""
        if 'drive.google.com' in url:
            logger.info(f"Google Drive URL 감지: {url}")
            return self.download_from_google_drive(url)
        else:
            logger.info(f"일반 URL 감지: {url}")
            return self.download_from_url(url)
    
    def cleanup_temp_file(self, file_path: str):
        """임시 파일을 정리합니다."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"임시 파일 정리 완료: {file_path}")
        except Exception as e:
            logger.error(f"임시 파일 정리 중 오류: {str(e)}")
    
    def cleanup_all(self):
        """모든 임시 파일과 디렉토리를 정리합니다."""
        try:
            import shutil
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
                logger.info(f"임시 디렉토리 정리 완료: {self.temp_dir}")
        except Exception as e:
            logger.error(f"임시 디렉토리 정리 중 오류: {str(e)}") 