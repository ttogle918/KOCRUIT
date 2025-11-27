import os
import re
import tempfile
import requests
import logging
from typing import Optional, Tuple
from urllib.parse import urlparse, parse_qs
import subprocess
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import pickle

logger = logging.getLogger(__name__)

class VideoDownloader:
    """Google Drive 및 일반 URL에서 영상 파일을 다운로드하는 클래스"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="video_analysis_")
        logger.info(f"임시 디렉토리 생성: {self.temp_dir}")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_google_drive_file_id(self, url: str) -> Optional[str]:
        """Google Drive URL에서 파일 ID를 추출합니다."""
        if not url:
            return None
        
        # 개선된 패턴들 (새로운 URL 형식 지원)
        patterns = [
            # 폴더 패턴들 (우선순위 높음)
            r'/folders/([a-zA-Z0-9_-]+)',
            r'/drive/folders/([a-zA-Z0-9_-]+)',
            
            # 파일 패턴들
            r'/file/d/([a-zA-Z0-9_-]+)',
            r'/d/([a-zA-Z0-9_-]+)',
            r'id=([a-zA-Z0-9_-]+)',
            
            # 새로운 패턴들 (drive_link 등)
            r'/file/d/([a-zA-Z0-9_-]+)/view\?usp=drive_link',
            r'/file/d/([a-zA-Z0-9_-]+)/view\?usp=sharing',
            r'/file/d/([a-zA-Z0-9_-]+)/preview',
            r'/file/d/([a-zA-Z0-9_-]+)/edit',
            r'/file/d/([a-zA-Z0-9_-]+)/open',
            
            # URL 파라미터에서 추출
            r'[?&]id=([a-zA-Z0-9_-]+)',
            r'[?&]usp=drive_link.*?id=([a-zA-Z0-9_-]+)',
            r'[?&]usp=sharing.*?id=([a-zA-Z0-9_-]+)',
        ]
        
        # 1. 정규식 패턴으로 추출
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                file_id = match.group(1)
                logger.info(f"파일 ID 추출 성공: {file_id} (패턴: {pattern})")
                return file_id
        
        # 2. URL 파라미터 파싱으로 추출
        try:
            from urllib.parse import urlparse, parse_qs
            parsed_url = urlparse(url)
            query_params = parse_qs(parsed_url.query)
            
            if 'id' in query_params:
                file_id = query_params['id'][0]
                logger.info(f"URL 파라미터에서 파일 ID 추출: {file_id}")
                return file_id
        except Exception as e:
            logger.warning(f"URL 파싱 실패: {str(e)}")
        
        # 3. 수동 문자열 파싱
        try:
            if '/file/d/' in url:
                start_idx = url.find('/file/d/') + 8
                end_idx = url.find('/', start_idx)
                if end_idx == -1:
                    end_idx = url.find('?', start_idx)
                if end_idx == -1:
                    end_idx = len(url)
                
                file_id = url[start_idx:end_idx]
                if len(file_id) > 20:  # Google Drive ID는 보통 25자 이상
                    logger.info(f"수동 파싱으로 파일 ID 추출: {file_id}")
                    return file_id
        except Exception as e:
            logger.warning(f"수동 파싱 실패: {str(e)}")
        
        logger.error(f"Google Drive 파일 ID를 추출할 수 없습니다: {url}")
        return None
    
    def search_file_by_name_in_folder(self, folder_url: str, filename: str) -> Optional[str]:
        """Google Drive 폴더에서 파일명으로 파일을 검색합니다."""
        try:
            # 폴더 ID 추출
            folder_id = self.extract_google_drive_file_id(folder_url)
            if not folder_id:
                logger.error(f"폴더 ID를 추출할 수 없습니다: {folder_url}")
                return None

            # Google Drive API를 사용하여 폴더 내 파일 검색
            search_url = f"https://www.googleapis.com/drive/v3/files"
            params = {
                'q': f"'{folder_id}' in parents and name='{filename}'",
                'fields': 'files(id,name)',
                'key': os.getenv('GOOGLE_DRIVE_API_KEY', '')  # API 키 필요
            }
            
            response = self.session.get(search_url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get('files'):
                    file_id = data['files'][0]['id']
                    logger.info(f"파일명 '{filename}'으로 파일 ID 찾음: {file_id}")
                    return file_id
                else:
                    logger.warning(f"파일명 '{filename}'을 찾을 수 없습니다")
                    return None
            else:
                logger.error(f"Google Drive API 요청 실패: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"파일 검색 중 오류: {str(e)}")
            return None

    def search_file_by_pattern_in_folder(self, folder_url: str, pattern: str, application_id: int) -> Optional[str]:
        """Google Drive 폴더에서 패턴으로 파일을 검색합니다."""
        try:
            # 폴더 ID 추출
            folder_id = self.extract_google_drive_file_id(folder_url)
            if not folder_id:
                logger.error(f"폴더 ID를 추출할 수 없습니다: {folder_url}")
                return None

            # 먼저 폴더 내 모든 파일 목록 출력 (디버깅용)
            self._list_all_files_in_folder(folder_id)

            # Google Drive API를 사용하여 폴더 내 파일 검색
            search_url = f"https://www.googleapis.com/drive/v3/files"
            params = {
                'q': f"'{folder_id}' in parents and name contains 'AI면접.mp4'",
                'fields': 'files(id,name)',
                'key': os.getenv('GOOGLE_DRIVE_API_KEY', '')  # API 키 필요
            }
            
            response = self.session.get(search_url, params=params)
            if response.status_code == 200:
                data = response.json()
                files = data.get('files', [])
                
                if files:
                    # application_id와 매칭되는 파일 찾기
                    target_file = None
                    for file in files:
                        file_name = file['name']
                        # 파일명에서 application_id 추출 (예: "68_최지현_AI면접.mp4" → 68)
                        if file_name.startswith(f"{application_id}_"):
                            target_file = file
                            break
                    
                    if target_file:
                        file_id = target_file['id']
                        file_name = target_file['name']
                        logger.info(f"application_id {application_id}와 매칭되는 파일 찾음: {file_id} ({file_name})")
                        return file_id
                    else:
                        logger.warning(f"application_id {application_id}와 매칭되는 파일을 찾을 수 없습니다")
                        # 첫 번째 파일을 기본값으로 사용
                        file_id = files[0]['id']
                        file_name = files[0]['name']
                        logger.warning(f"기본값으로 첫 번째 파일 사용: {file_id} ({file_name})")
                        return file_id
                else:
                    logger.warning(f"패턴 '{pattern}'에 맞는 파일을 찾을 수 없습니다")
                    return None
            else:
                logger.error(f"Google Drive API 요청 실패: {response.status_code}")
                # API 실패 시 직접 파일 URL 시도
                logger.info("API 실패, 직접 파일 URL 시도...")
                return self._try_direct_file_url(application_id)
                
        except Exception as e:
            logger.error(f"패턴 검색 중 오류: {str(e)}")
            # 예외 발생 시 직접 파일 URL 시도
            logger.info("예외 발생, 직접 파일 URL 시도...")
            return self._try_direct_file_url(application_id)

    def _list_all_files_in_folder(self, folder_id: str) -> None:
        """폴더 내 모든 파일 목록을 출력합니다 (디버깅용)."""
        try:
            logger.info(f"=== 폴더 내 모든 파일 목록 (폴더 ID: {folder_id}) ===")
            
            # API 키가 없거나 권한이 없으면 건너뛰기
            api_key = os.getenv('GOOGLE_DRIVE_API_KEY', '')
            if not api_key:
                logger.warning("Google Drive API 키가 설정되지 않았습니다")
                return
            
            search_url = f"https://www.googleapis.com/drive/v3/files"
            params = {
                'q': f"'{folder_id}' in parents",
                'fields': 'files(id,name,mimeType,size)',
                'key': api_key
            }
            
            response = self.session.get(search_url, params=params)
            if response.status_code == 200:
                data = response.json()
                files = data.get('files', [])
                
                if files:
                    for i, file in enumerate(files, 1):
                        file_name = file.get('name', 'Unknown')
                        file_id = file.get('id', 'Unknown')
                        mime_type = file.get('mimeType', 'Unknown')
                        size = file.get('size', 'Unknown')
                        logger.info(f"{i}. {file_name} (ID: {file_id}, Type: {mime_type}, Size: {size})")
                else:
                    logger.warning("폴더가 비어있습니다")
                    
            elif response.status_code == 403:
                logger.error(f"Google Drive API 권한 오류 (403): API 키 권한을 확인하세요")
                logger.info("API 키 권한 확인 방법:")
                logger.info("1. Google Cloud Console에서 Google Drive API 활성화")
                logger.info("2. API 키에 Google Drive API 권한 추가")
                logger.info("3. 폴더 공유 설정을 '링크가 있는 모든 사용자'로 변경")
            else:
                logger.error(f"폴더 목록 조회 실패: {response.status_code}")
                
        except Exception as e:
            logger.error(f"폴더 목록 조회 중 오류: {str(e)}")

    def _try_direct_file_url(self, application_id: int) -> Optional[str]:
        """직접 파일 URL을 시도합니다."""
        try:
            # 알려진 파일 ID들 (Google Drive에서 직접 확인 필요)
            known_file_ids = {
                68: "1oIIDc7Zr0AKmKe7gvaNkZm8NRWRzwkLO",  # 68_최지현_AI면접.mp4
                59: "18dO35QTr0cHxEX8CtMtCkzfsBRes68XB",  # 59_김도원_AI면접.mp4
                61: "1BQ-p12_MISASZNeGqx91EoJjSzImOct_",  # 61_이현서_AI면접.mp4
            }
            
            if application_id in known_file_ids:
                file_id = known_file_ids[application_id]
                logger.info(f"직접 파일 ID 사용: {file_id}")
                return file_id
            else:
                logger.warning(f"알려진 파일 ID가 없습니다: {application_id}")
                return None
                
        except Exception as e:
            logger.error(f"직접 파일 URL 시도 중 오류: {str(e)}")
            return None

    def _download_individual_file(self, file_id: str) -> Optional[str]:
        """개별 파일을 위한 최적화된 다운로드"""
        try:
            # 임시 디렉토리 생성
            temp_dir = tempfile.mkdtemp(prefix="video_analysis_")
            output_path = os.path.join(temp_dir, f"video_{file_id}.mp4")

            logger.info(f"개별 파일 다운로드 시작: {file_id}")

            # 방법 1: Google Drive API 키를 사용한 다운로드 (우선 시도)
            logger.info("방법 1: Google Drive API 키를 사용한 다운로드 시도...")
            result = self._try_alternative_download(file_id, output_path)
            if result:
                return result

            # 방법 2: 공개 링크 변환 (가장 안정적)
            logger.info("방법 2: 공개 링크 변환 시도...")
            public_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            result = self._try_download_with_retry(public_url, output_path)
            if result:
                return result

            # 방법 3: gdown 스타일 다운로드
            logger.info("방법 3: gdown 스타일 다운로드 시도...")
            gdown_url = f"https://drive.google.com/uc?id={file_id}"
            result = self._try_download_with_retry(gdown_url, output_path)
            if result:
                return result

            # 방법 4: 쿠키 기반 다운로드 (대용량 파일용)
            logger.info("방법 4: 쿠키 기반 다운로드 시도...")
            result = self._try_cookie_based_download(file_id, output_path)
            if result:
                return result

            # 방법 5: gdown 라이브러리 스타일 (개선된 버전)
            logger.info("방법 5: gdown 라이브러리 스타일 (개선된 버전) 시도...")
            result = self._try_gdown_style_download(file_id, output_path)
            if result:
                return result

            logger.error("모든 개별 파일 다운로드 방법 실패")
            return None

        except Exception as e:
            logger.error(f"개별 파일 다운로드 중 오류: {str(e)}")
            return None

    def download_from_google_drive_folder(self, folder_url: str, filename: str) -> Optional[str]:
        """Google Drive 폴더에서 파일명으로 파일을 다운로드합니다."""
        try:
            # 파일 ID 검색
            file_id = self.search_file_by_name_in_folder(folder_url, filename)
            if not file_id:
                logger.error(f"파일을 찾을 수 없습니다: {filename}")
                return None

            # 파일 다운로드
            download_url = f"https://drive.google.com/uc?id={file_id}"
            return self.download_file(download_url, filename)
            
        except Exception as e:
            logger.error(f"폴더에서 파일 다운로드 중 오류: {str(e)}")
            return None

    def download_from_google_drive_folder_by_pattern(self, folder_url: str, pattern: str, application_id: int) -> Optional[str]:
        """Google Drive 폴더에서 패턴으로 파일을 다운로드합니다."""
        try:
            # 파일 ID 검색
            file_id = self.search_file_by_pattern_in_folder(folder_url, pattern, application_id)
            if not file_id:
                logger.error(f"패턴에 맞는 파일을 찾을 수 없습니다: {pattern}")
                return None

            # 파일 다운로드
            download_url = f"https://drive.google.com/uc?id={file_id}"
            filename = f"{application_id}_AI면접.mp4"
            return self.download_file(download_url, filename)
            
        except Exception as e:
            logger.error(f"폴더에서 패턴 파일 다운로드 중 오류: {str(e)}")
            return None

    def download_from_google_drive(self, url: str) -> Optional[str]:
        """Google Drive에서 파일을 다운로드합니다."""
        if not url:
            return None

        logger.info(f"Google Drive URL 감지: {url}")
        
        # 파일 ID 추출
        file_id = self.extract_google_drive_file_id(url)
        if not file_id:
            logger.error("Google Drive 파일 ID를 추출할 수 없습니다")
            return None

        logger.info(f"파일 ID 추출 성공: {file_id}")
        
        # 개별 파일 URL인 경우 더 안정적인 다운로드 시도
        if '/file/d/' in url:
            logger.info("개별 파일 URL - 직접 다운로드 시도")
            return self._download_individual_file(file_id)
        
        # 다운로드 시도
        return self.download_file_by_id(file_id)

    def download_file_by_id(self, file_id: str) -> Optional[str]:
        """파일 ID로 Google Drive 파일을 다운로드합니다."""
        try:
            # 임시 디렉토리 생성
            temp_dir = tempfile.mkdtemp(prefix="video_analysis_")
            output_path = os.path.join(temp_dir, f"video_{file_id}.mp4")

            # 방법 1: Google Drive API 키를 사용한 다운로드 (우선 시도)
            logger.info("방법 1: Google Drive API 키를 사용한 다운로드 시도...")
            result = self._try_alternative_download(file_id, output_path)
            if result:
                return result

            # 방법 2: gdown 스타일 다운로드 시도
            logger.info("방법 2: gdown 스타일 다운로드 시도...")
            gdown_url = f"https://drive.google.com/uc?id={file_id}"
            result = self._try_download_with_retry(gdown_url, output_path)
            if result:
                return result

            # 방법 3: 공개 링크 변환 시도
            logger.info("방법 3: 공개 링크 변환 시도...")
            public_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            result = self._try_download_with_retry(public_url, output_path)
            if result:
                return result

            # 방법 4: 직접 다운로드 시도
            logger.info("방법 4: 직접 다운로드 시도...")
            direct_url = f"https://drive.google.com/file/d/{file_id}/view?usp=drive_link"
            result = self._try_direct_download(direct_url, output_path)
            if result:
                return result

            # 방법 5: 새로운 다운로드 URL 시도
            logger.info("방법 5: 새로운 다운로드 URL 시도...")
            new_url = f"https://drive.google.com/file/d/{file_id}/preview"
            result = self._try_download_with_retry(new_url, output_path)
            if result:
                return result

            # 방법 6: gdown 라이브러리 스타일 다운로드
            logger.info("방법 6: gdown 라이브러리 스타일 다운로드 시도...")
            gdown_url = f"https://drive.google.com/uc?export=download&confirm=t&id={file_id}"
            result = self._try_download_with_retry(gdown_url, output_path)
            if result:
                return result

            # 방법 7: 직접 파일 URL 시도
            logger.info("방법 7: 직접 파일 URL 시도...")
            direct_file_url = f"https://drive.google.com/file/d/{file_id}/view"
            result = self._try_direct_download(direct_file_url, output_path)
            if result:
                return result

            # 방법 8: 쿠키 기반 다운로드 시도
            logger.info("방법 8: 쿠키 기반 다운로드 시도...")
            result = self._try_cookie_based_download(file_id, output_path)
            if result:
                return result

            # 방법 9: gdown 라이브러리 스타일 (개선된 버전)
            logger.info("방법 9: gdown 라이브러리 스타일 (개선된 버전) 시도...")
            result = self._try_gdown_style_download(file_id, output_path)
            if result:
                return result

            # 방법 10: 직접 파일 다운로드 URL 시도
            logger.info("방법 10: 직접 파일 다운로드 URL 시도...")
            direct_download_url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t&uuid=random"
            result = self._try_download_with_retry(direct_download_url, output_path)
            if result:
                return result

            logger.error("모든 다운로드 방법 실패")
            return None

        except Exception as e:
            logger.error(f"Google Drive 다운로드 중 오류: {str(e)}")
            return None

    def _try_download_with_retry(self, url: str, output_path: str) -> Optional[str]:
        """재시도 로직이 포함된 다운로드 시도"""
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                logger.info(f"다운로드 시도 {attempt + 1}/{max_retries}: {url}")
                response = self.session.get(url, stream=True, timeout=30)
                
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    file_size = os.path.getsize(output_path)
                    logger.info(f"다운로드 성공: {output_path} ({file_size} bytes)")
                    
                    # 파일 크기 검증 (HTML 페이지 감지)
                    if file_size > 1000000:  # 1MB 이상 (실제 비디오 파일)
                        logger.info(f"실제 비디오 파일 확인됨 ({file_size} bytes)")
                        return output_path
                    elif file_size > 10000:  # 10KB 이상 (중간 크기 파일)
                        # 파일 내용 확인하여 HTML 페이지인지 검사
                        with open(output_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read(1000)
                            if '<html' in content.lower() or '<!doctype' in content.lower():
                                logger.warning(f"HTML 페이지 감지됨 ({file_size} bytes)")
                                logger.warning(f"HTML 내용: {content[:200]}...")
                                return None
                            else:
                                logger.info(f"중간 크기 파일 확인됨 ({file_size} bytes)")
                                return output_path
                    elif file_size > 1000:  # 1KB 이상 (임시로 허용)
                        # 파일 내용 확인
                        with open(output_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read(1000)
                            if '<html' in content.lower() or '<!doctype' in content.lower():
                                logger.warning(f"HTML 페이지 감지됨 ({file_size} bytes)")
                                logger.warning(f"HTML 내용: {content[:200]}...")
                                return None
                            else:
                                logger.warning(f"작은 파일이지만 HTML이 아님 ({file_size} bytes)")
                                return output_path
                    else:
                        logger.warning(f"파일이 너무 작습니다 ({file_size} bytes)")
                        # 파일 내용 확인 (더 자세히)
                        with open(output_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read(2000)  # 더 많은 내용 읽기
                            logger.warning(f"파일 내용 (처음 2000자): {content}")
                            
                            # HTML 페이지인지 확인
                            if '<html' in content.lower() or '<!doctype' in content.lower():
                                logger.error("HTML 페이지가 다운로드되었습니다!")
                                logger.error("Google Drive 공유 설정을 확인하세요:")
                                logger.error("1. 파일을 우클릭 → '공유' → '링크가 있는 모든 사용자'")
                                logger.error("2. 권한을 '편집자'로 설정")
                                logger.error("3. '링크 복사' 후 새로운 URL 사용")
                            else:
                                logger.warning("HTML이 아닌 다른 형식의 파일입니다")
                        return None
                
                elif response.status_code == 503:
                    logger.warning(f"503 Service Unavailable (시도 {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        logger.info(f"{retry_delay}초 후 재시도...")
                        import time
                        time.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                else:
                    logger.error(f"다운로드 실패: {response.status_code}")
                    break
                    
            except Exception as e:
                logger.error(f"다운로드 오류 (시도 {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"{retry_delay}초 후 재시도...")
                    import time
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
        
        return None

    def _try_direct_download(self, url: str, output_path: str) -> Optional[str]:
        """직접 다운로드 시도 (HTML 파싱)"""
        try:
            response = self.session.get(url, timeout=30)
            if response.status_code == 200:
                content = response.text
                # 다양한 다운로드 URL 패턴 시도
                patterns = [
                    r'"([^"]*drive\.google\.com[^"]*export=download[^"]*)"',
                    r'"([^"]*drive\.google\.com[^"]*uc[^"]*)"',
                    r'https://drive\.google\.com/uc\?[^"]*'
                ]
                
                for pattern in patterns:
                    download_match = re.search(pattern, content)
                    if download_match:
                        download_url = download_match.group(1).replace('\\u003d', '=').replace('\\u0026', '&')
                        logger.info(f"추출된 다운로드 URL: {download_url}")
                        
                        result = self._try_download_with_retry(download_url, output_path)
                        if result:
                            return result
                
                logger.warning("HTML에서 다운로드 URL을 찾을 수 없습니다")
            else:
                logger.error(f"직접 다운로드 페이지 접근 실패: {response.status_code}")
                
        except Exception as e:
            logger.error(f"직접 다운로드 중 오류: {str(e)}")
        
        return None

    def _try_cookie_based_download(self, file_id: str, output_path: str) -> Optional[str]:
        """쿠키 기반 다운로드 시도 (Google Drive 대용량 파일용)"""
        try:
            # 1단계: 초기 페이지 접근하여 쿠키 획득
            initial_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            logger.info(f"쿠키 획득을 위한 초기 페이지 접근: {initial_url}")
            
            response = self.session.get(initial_url, timeout=30)
            if response.status_code != 200:
                logger.error(f"초기 페이지 접근 실패: {response.status_code}")
                return None
            
            # 2단계: HTML에서 confirm 토큰 추출
            content = response.text
            confirm_match = re.search(r'name="confirm" value="([^"]+)"', content)
            if not confirm_match:
                logger.warning("confirm 토큰을 찾을 수 없습니다")
                return None
            
            confirm_token = confirm_match.group(1)
            logger.info(f"confirm 토큰 추출: {confirm_token}")
            
            # 3단계: confirm 토큰으로 실제 다운로드
            download_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={file_id}"
            logger.info(f"쿠키 기반 다운로드 URL: {download_url}")
            
            result = self._try_download_with_retry(download_url, output_path)
            return result
            
        except Exception as e:
            logger.error(f"쿠키 기반 다운로드 중 오류: {str(e)}")
            return None

    def _try_gdown_style_download(self, file_id: str, output_path: str) -> Optional[str]:
        """gdown 라이브러리 스타일 다운로드 (개선된 버전)"""
        try:
            # 1단계: 초기 페이지 접근
            initial_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            logger.info(f"gdown 스타일 초기 페이지 접근: {initial_url}")
            
            response = self.session.get(initial_url, timeout=30)
            if response.status_code != 200:
                logger.error(f"gdown 초기 페이지 접근 실패: {response.status_code}")
                return None
            
            content = response.text
            
            # 2단계: confirm 토큰 추출 (여러 패턴 시도)
            confirm_patterns = [
                r'name="confirm" value="([^"]+)"',
                r'confirm=([^&"]+)',
                r'confirm=([a-zA-Z0-9_-]+)',
                r'value="([a-zA-Z0-9_-]+)"[^>]*name="confirm"',
            ]
            
            confirm_token = None
            for pattern in confirm_patterns:
                match = re.search(pattern, content)
                if match:
                    confirm_token = match.group(1)
                    logger.info(f"confirm 토큰 추출 (패턴: {pattern}): {confirm_token}")
                    break
            
            if not confirm_token:
                logger.warning("confirm 토큰을 찾을 수 없습니다")
                # 토큰 없이 시도
                download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
            else:
                # 3단계: confirm 토큰으로 다운로드
                download_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={file_id}"
            
            logger.info(f"gdown 스타일 다운로드 URL: {download_url}")
            
            # 4단계: 실제 다운로드 시도
            result = self._try_download_with_retry(download_url, output_path)
            
            # 5단계: HTML 페이지 감지 시 대체 방법 시도
            if result and os.path.exists(result):
                file_size = os.path.getsize(result)
                if file_size < 10000:  # 10KB 미만이면 HTML 페이지일 가능성
                    with open(result, 'r', encoding='utf-8') as f:
                        content_check = f.read(1000)
                        if '<html' in content_check.lower() or 'virus scan' in content_check.lower():
                            logger.warning("HTML 페이지 감지됨, 대체 방법 시도...")
                            os.remove(result)  # HTML 파일 삭제
                            
                            # 대체 방법: 직접 다운로드 URL 시도
                            direct_url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
                            logger.info(f"대체 다운로드 URL 시도: {direct_url}")
                            
                            # User-Agent 변경
                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Accept-Encoding': 'gzip, deflate',
                                'Connection': 'keep-alive',
                                'Upgrade-Insecure-Requests': '1',
                            }
                            
                            response = self.session.get(direct_url, headers=headers, timeout=30, stream=True)
                            if response.status_code == 200:
                                with open(output_path, 'wb') as f:
                                    for chunk in response.iter_content(chunk_size=8192):
                                        f.write(chunk)
                                
                                # 다시 HTML 체크
                                if os.path.exists(output_path):
                                    file_size = os.path.getsize(output_path)
                                    if file_size > 10000:  # 10KB 이상이면 성공
                                        logger.info(f"대체 방법으로 다운로드 성공: {output_path} ({file_size} bytes)")
                                        return output_path
                                    else:
                                        logger.error("대체 방법도 HTML 페이지 반환")
                                        os.remove(output_path)
                                        return None
            
            return result
            
        except Exception as e:
            logger.error(f"gdown 스타일 다운로드 중 오류: {str(e)}")
            return None

    def _try_alternative_download(self, file_id: str, output_path: str) -> Optional[str]:
        """대체 다운로드 방법 (Google Drive API 키 사용)"""
        try:
            logger.info(f"Google Drive API 키를 사용한 다운로드 시도: {file_id}")
            
            # Google Drive API 키 확인
            api_key = os.getenv('GOOGLE_DRIVE_API_KEY', '')
            if not api_key:
                logger.warning("Google Drive API 키가 설정되지 않았습니다")
                return self._try_fallback_download(file_id, output_path)
            
            # 방법 1: Google Drive API를 사용한 직접 다운로드
            try:
                logger.info("방법 1: Google Drive API 직접 다운로드 시도...")
                api_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&key={api_key}"
                
                response = self.session.get(api_url, timeout=30, stream=True)
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    file_size = os.path.getsize(output_path)
                    if file_size > 100000:  # 100KB 이상이면 성공
                        logger.info(f"Google Drive API 다운로드 성공: {output_path} ({file_size} bytes)")
                        return output_path
                    else:
                        logger.warning(f"API 다운로드 파일이 너무 작음: {file_size} bytes")
                        os.remove(output_path)
                else:
                    logger.warning(f"Google Drive API 요청 실패: {response.status_code}")
                    
            except Exception as e:
                logger.warning(f"Google Drive API 다운로드 실패: {str(e)}")
            
            # 방법 2: 파일 정보 조회 후 다운로드
            try:
                logger.info("방법 2: 파일 정보 조회 후 다운로드 시도...")
                info_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?key={api_key}"
                response = self.session.get(info_url, timeout=30)
                
                if response.status_code == 200:
                    file_info = response.json()
                    logger.info(f"파일 정보: {file_info.get('name', 'Unknown')} ({file_info.get('size', 'Unknown')} bytes)")
                    
                    # 파일이 공개되어 있는지 확인
                    if file_info.get('shared', False) or file_info.get('permissions'):
                        # 공개 링크로 다운로드 시도
                        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                        response = self.session.get(download_url, timeout=30, stream=True)
                        
                        if response.status_code == 200:
                            with open(output_path, 'wb') as f:
                                for chunk in response.iter_content(chunk_size=8192):
                                    f.write(chunk)
                            
                            file_size = os.path.getsize(output_path)
                            if file_size > 100000:
                                logger.info(f"공개 링크 다운로드 성공: {output_path} ({file_size} bytes)")
                                return output_path
                            else:
                                os.remove(output_path)
                else:
                    logger.warning(f"파일 정보 조회 실패: {response.status_code}")
                    
            except Exception as e:
                logger.warning(f"파일 정보 조회 실패: {str(e)}")
            
            # 방법 3: 폴백 다운로드 (기존 방법들)
            logger.info("방법 3: 폴백 다운로드 시도...")
            return self._try_fallback_download(file_id, output_path)
            
        except Exception as e:
            logger.error(f"대체 다운로드 중 오류: {str(e)}")
            return None

    def _try_fallback_download(self, file_id: str, output_path: str) -> Optional[str]:
        """폴백 다운로드 방법 (기존 방법들)"""
        try:
            logger.info(f"폴백 다운로드 방법 시도: {file_id}")
            
            # 강화된 User-Agent 및 헤더
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
            
            # 여러 대체 URL 시도
            alternative_urls = [
                f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t",
                f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t&uuid=random",
                f"https://drive.google.com/file/d/{file_id}/view?usp=sharing",
                f"https://drive.google.com/file/d/{file_id}/preview",
                f"https://drive.google.com/open?id={file_id}",
            ]
            
            for url in alternative_urls:
                try:
                    logger.info(f"폴백 URL 시도: {url}")
                    response = self.session.get(url, headers=headers, timeout=30, stream=True)
                    
                    if response.status_code == 200:
                        with open(output_path, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                f.write(chunk)
                        
                        # 파일 크기 확인
                        if os.path.exists(output_path):
                            file_size = os.path.getsize(output_path)
                            if file_size > 100000:  # 100KB 이상이면 성공
                                logger.info(f"폴백 다운로드 성공: {output_path} ({file_size} bytes)")
                                return output_path
                            else:
                                # HTML 페이지인지 확인
                                try:
                                    with open(output_path, 'r', encoding='utf-8', errors='ignore') as f:
                                        content = f.read(1000)
                                        if '<html' in content.lower() or 'virus scan' in content.lower():
                                            logger.warning(f"HTML 페이지 감지됨: {url}")
                                            os.remove(output_path)
                                            continue
                                except:
                                    pass
                                
                                logger.warning(f"파일이 너무 작음: {file_size} bytes")
                                os.remove(output_path)
                                continue
                    
                except Exception as e:
                    logger.warning(f"폴백 URL 실패: {url} - {str(e)}")
                    continue
            
            logger.error("모든 폴백 다운로드 방법 실패")
            return None
            
        except Exception as e:
            logger.error(f"폴백 다운로드 중 오류: {str(e)}")
            return None

    def download_file(self, url: str, filename: str = None) -> Optional[str]:
        """일반 URL에서 파일을 다운로드합니다."""
        max_retries = 3
        retry_delay = 2  # 초
        
        for attempt in range(max_retries):
            try:
                # 임시 디렉토리 생성
                temp_dir = tempfile.mkdtemp(prefix="video_analysis_")
                if not filename:
                    filename = f"video_{hash(url)}.mp4"
                output_path = os.path.join(temp_dir, filename)

                logger.info(f"파일 다운로드 시도 {attempt + 1}/{max_retries}: {url}")
                response = self.session.get(url, stream=True, timeout=30)
                
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    file_size = os.path.getsize(output_path)
                    logger.info(f"파일 다운로드 완료: {output_path} ({file_size} bytes)")
                    return output_path
                elif response.status_code == 503:
                    logger.warning(f"503 Service Unavailable (시도 {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        logger.info(f"{retry_delay}초 후 재시도...")
                        import time
                        time.sleep(retry_delay)
                        retry_delay *= 2  # 지수 백오프
                        continue
                    else:
                        logger.error("최대 재시도 횟수 초과")
                        return None
                else:
                    logger.error(f"파일 다운로드 실패: {response.status_code}")
                    return None

            except Exception as e:
                logger.error(f"파일 다운로드 중 오류 (시도 {attempt + 1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    logger.info(f"{retry_delay}초 후 재시도...")
                    import time
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    return None
        
        return None

    def download_video(self, url: str, application_id: int = None, max_duration: int = 300) -> Optional[str]:
        """
        비디오 다운로드 및 자르기
        
        Args:
            url: 비디오 URL
            application_id: 지원자 ID (폴더 검색용)
            max_duration: 최대 길이 (초), 기본값 5분
            
        Returns:
            다운로드된 비디오 파일 경로 또는 None
        """
        try:
            # 기존 다운로드 로직
            video_path = self._download_video_internal(url, application_id)
            if not video_path:
                return None
            
            # 비디오 길이 확인 및 자르기
            trimmed_path = self._trim_video_if_needed(video_path, max_duration)
            
            return trimmed_path
            
        except Exception as e:
            logger.error(f"비디오 다운로드 오류: {str(e)}")
            return None
    
    def _trim_video_if_needed(self, video_path: str, max_duration: int) -> str:
        """
        비디오가 너무 길면 자르기
        
        Args:
            video_path: 원본 비디오 경로
            max_duration: 최대 길이 (초)
            
        Returns:
            자른 비디오 경로 (원본과 같을 수 있음)
        """
        try:
            # 비디오 정보 확인
            probe_cmd = f'ffprobe -v quiet -show_entries format=duration -of csv=p=0 "{video_path}"'
            result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.warning("비디오 길이 확인 실패, 원본 사용")
                return video_path
            
            duration = float(result.stdout.strip())
            logger.info(f"비디오 길이: {duration:.2f}초")
            
            # 최대 길이보다 짧으면 원본 사용
            if duration <= max_duration:
                logger.info("비디오가 최대 길이보다 짧음, 원본 사용")
                return video_path
            
            # 비디오 자르기
            logger.info(f"비디오를 {max_duration}초로 자르기")
            trimmed_path = tempfile.mktemp(suffix='.mp4', dir=self.temp_dir)
            
            # 처음부터 max_duration초까지 자르기
            trim_cmd = f'ffmpeg -i "{video_path}" -t {max_duration} -c copy "{trimmed_path}" -y'
            result = subprocess.run(trim_cmd, shell=True, capture_output=True)
            
            if result.returncode == 0:
                logger.info(f"비디오 자르기 완료: {trimmed_path}")
                # 원본 파일 삭제
                os.remove(video_path)
                return trimmed_path
            else:
                logger.error(f"비디오 자르기 실패: {result.stderr.decode()}")
                return video_path
                
        except Exception as e:
            logger.error(f"비디오 자르기 오류: {str(e)}")
            return video_path

    def _download_video_internal(self, url: str, application_id: int = None) -> Optional[str]:
        """다운로드 로직 (Google Drive, 일반 URL, 로컬 파일 경로 지원)"""
        
        # 로컬 파일 경로인 경우
        if os.path.exists(url) and not url.startswith(('http://', 'https://')):
            logger.info(f"로컬 파일 경로 감지: {url}")
            # 파일을 임시 디렉토리로 복사
            import shutil
            filename = os.path.basename(url)
            temp_path = os.path.join(self.temp_dir, filename)
            shutil.copy2(url, temp_path)
            logger.info(f"로컬 파일 복사 완료: {temp_path}")
            return temp_path
        
        # Google Drive URL인 경우
        elif 'drive.google.com' in url:
            logger.info(f"Google Drive URL 감지: {url}")
            # 개별 파일 URL인 경우 직접 다운로드
            if '/file/d/' in url:
                logger.info(f"개별 파일 URL 감지: {url}")
                return self.download_from_google_drive(url)
            # 폴더 URL인 경우 패턴으로 검색
            elif '/folders/' in url and application_id:
                # application_id를 폴더명으로 사용하여 검색
                logger.info(f"폴더 기반 검색: application_id={application_id}")
                pattern = f"*_AI면접.mp4"  # 폴더 내 모든 AI면접.mp4 파일
                return self.download_from_google_drive_folder_by_pattern(url, pattern, application_id)
            else:
                return self.download_from_google_drive(url)
        
        # 일반 URL인 경우
        else:
            logger.info(f"일반 URL 감지: {url}")
            return self.download_file(url)
    
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
    
    def upload_to_google_drive(self, file_path: str, filename: str = None, folder_id: str = None) -> Optional[str]:
        """
        파일을 Google Drive에 업로드합니다.
        
        Args:
            file_path: 업로드할 파일 경로
            filename: Google Drive에 저장할 파일명 (None이면 원본 파일명 사용)
            folder_id: 업로드할 폴더 ID (None이면 루트에 업로드)
            
        Returns:
            업로드된 파일의 Google Drive ID 또는 None
        """
        try:
            # Google Drive API 키 확인
            api_key = os.getenv('GOOGLE_DRIVE_API_KEY')
            if not api_key:
                logger.error("GOOGLE_DRIVE_API_KEY 환경 변수가 설정되지 않았습니다.")
                return None
            
            # 파일명 설정
            if not filename:
                filename = os.path.basename(file_path)
            
            # Google Drive API 서비스 생성
            service = build('drive', 'v3', developerKey=api_key)
            
            # 파일 메타데이터 설정
            file_metadata = {
                'name': filename
            }
            
            # 폴더 ID가 있으면 부모 폴더 설정
            if folder_id:
                file_metadata['parents'] = [folder_id]
            
            # 파일 업로드
            media = MediaFileUpload(file_path, resumable=True)
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,webViewLink'
            ).execute()
            
            logger.info(f"Google Drive 업로드 성공: {filename} (ID: {file.get('id')})")
            return file.get('id')
            
        except Exception as e:
            logger.error(f"Google Drive 업로드 오류: {str(e)}")
            return None
    
    def upload_trimmed_videos(self, video_segments: list, original_filename: str, folder_id: str = None) -> list:
        """
        분리된 비디오 세그먼트들을 Google Drive에 업로드합니다.
        
        Args:
            video_segments: 비디오 세그먼트 리스트 (각 세그먼트는 file_path, start_time, end_time 포함)
            original_filename: 원본 파일명
            folder_id: 업로드할 폴더 ID
            
        Returns:
            업로드된 파일들의 정보 리스트
        """
        uploaded_files = []
        
        for i, segment in enumerate(video_segments):
            try:
                file_path = segment.get('file_path')
                start_time = segment.get('start_time', 0)
                end_time = segment.get('end_time', 0)
                
                if not file_path or not os.path.exists(file_path):
                    logger.warning(f"세그먼트 파일이 존재하지 않습니다: {file_path}")
                    continue
                
                # 파일명 생성 (예: 68_최지현_AI면접_세그먼트1_0-30초.mp4)
                base_name = os.path.splitext(original_filename)[0]
                segment_filename = f"{base_name}_세그먼트{i+1}_{start_time:.0f}-{end_time:.0f}초.mp4"
                
                # Google Drive에 업로드
                file_id = self.upload_to_google_drive(file_path, segment_filename, folder_id)
                
                if file_id:
                    uploaded_files.append({
                        'segment_index': i + 1,
                        'filename': segment_filename,
                        'file_id': file_id,
                        'start_time': start_time,
                        'end_time': end_time,
                        'duration': end_time - start_time,
                        'file_path': file_path
                    })
                    logger.info(f"세그먼트 {i+1} 업로드 완료: {segment_filename}")
                
            except Exception as e:
                logger.error(f"세그먼트 {i+1} 업로드 오류: {str(e)}")
        
        return uploaded_files 