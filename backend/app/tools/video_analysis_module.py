# === Video Analysis Module (TensorFlow 기반) ===
"""
Backend 내부에서 TensorFlow 기반 영상 분석을 처리하는 모듈
프레임워크 충돌을 방지하기 위해 별도 프로세스로 실행
"""

import subprocess
import json
import logging
import tempfile
import os
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class VideoAnalysisModule:
    """TensorFlow 기반 영상 분석 모듈"""
    
    def __init__(self):
        self.tensorflow_script = Path(__file__).parent / "tensorflow_analysis.py"
        self.python_env = self._get_tensorflow_env()
    
    def _get_tensorflow_env(self) -> str:
        """TensorFlow 전용 Python 환경 경로"""
        # 가상환경 또는 별도 Python 설치 경로
        return "python"  # 기본값, 실제 환경에 맞게 수정
    
    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """영상 분석 실행 (별도 프로세스)"""
        try:
            logger.info(f"TensorFlow 모듈로 영상 분석 시작: {video_path}")
            
            # 별도 프로세스에서 TensorFlow 분석 실행
            result = subprocess.run([
                self.python_env,
                str(self.tensorflow_script),
                "--video", video_path,
                "--output", "json"
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                analysis_result = json.loads(result.stdout)
                logger.info("TensorFlow 분석 완료")
                return analysis_result
            else:
                logger.error(f"TensorFlow 분석 실패: {result.stderr}")
                raise Exception(f"TensorFlow 분석 오류: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            logger.error("TensorFlow 분석 타임아웃")
            raise Exception("영상 분석 시간 초과")
        except Exception as e:
            logger.error(f"TensorFlow 분석 중 오류: {e}")
            raise
    
    def check_tensorflow_availability(self) -> bool:
        """TensorFlow 환경 사용 가능 여부 확인"""
        try:
            result = subprocess.run([
                self.python_env,
                str(self.tensorflow_script),
                "--check"
            ], capture_output=True, text=True, timeout=10)
            
            return result.returncode == 0
        except:
            return False

# === 사용 예시 ===
if __name__ == "__main__":
    # 테스트용
    analyzer = VideoAnalysisModule()
    
    if analyzer.check_tensorflow_availability():
        print("✅ TensorFlow 환경 사용 가능")
    else:
        print("❌ TensorFlow 환경 사용 불가") 