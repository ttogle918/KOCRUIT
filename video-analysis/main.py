# === Video Analysis Service Main ===
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import json
import os
from video_analyzer import VideoAnalyzer
from video_downloader import VideoDownloader
from question_video_analyzer import QuestionVideoAnalyzer

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Video Analysis Service", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 요청 모델
class VideoAnalysisRequest(BaseModel):
    video_url: str
    application_id: Optional[int] = None

class QuestionAnalysisRequest(BaseModel):
    video_url: str
    question_logs: List[Dict]

class AudioExtractionRequest(BaseModel):
    video_path: str
    output_path: Optional[str] = None
    max_duration_seconds: Optional[int] = None  # 앞부분 N초만 추출 (옵션)

class FileDeleteRequest(BaseModel):
    file_path: str

# 분석기 인스턴스
video_analyzer = VideoAnalyzer()
video_downloader = VideoDownloader()
question_video_analyzer = QuestionVideoAnalyzer()

@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "video-analysis"}

@app.post("/download-video")
async def download_video(request: VideoAnalysisRequest):
    """비디오 다운로드만 수행"""
    try:
        logger.info(f"비디오 다운로드 요청: {request.video_url}")
        
        # 비디오 다운로드
        video_path = video_downloader.download_video(request.video_url, request.application_id)
        if not video_path:
            raise HTTPException(status_code=400, detail="비디오 다운로드 실패")
        
        logger.info(f"비디오 다운로드 완료: {video_path}")
        return {"video_path": video_path, "success": True}
        
    except Exception as e:
        logger.error(f"비디오 다운로드 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"비디오 다운로드 중 오류가 발생했습니다: {str(e)}")

@app.post("/extract-audio")
async def extract_audio(request: AudioExtractionRequest):
    """비디오에서 오디오 추출"""
    try:
        logger.info(f"오디오 추출 요청: {request.video_path}")
        
        # ffmpeg를 사용하여 오디오 추출
        import subprocess
        
        if not request.output_path:
            # 기본 출력 경로 설정
            base_name = os.path.splitext(request.video_path)[0]
            request.output_path = f"{base_name}.wav"
        
        # ffmpeg 명령어 실행
        cmd = [
            "ffmpeg", "-ss", "0", "-i", request.video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
        ]

        # 앞부분 N초만 추출 옵션
        if request.max_duration_seconds and request.max_duration_seconds > 0:
            cmd.extend(["-t", str(request.max_duration_seconds)])

        cmd.extend([request.output_path, "-y"])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"ffmpeg 오류: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"오디오 추출 실패: {result.stderr}")
        
        if not os.path.exists(request.output_path):
            raise HTTPException(status_code=500, detail="오디오 파일이 생성되지 않았습니다")
        
        logger.info(f"오디오 추출 완료: {request.output_path}")
        return {"audio_path": request.output_path, "success": True}
        
    except Exception as e:
        logger.error(f"오디오 추출 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"오디오 추출 중 오류가 발생했습니다: {str(e)}")

@app.post("/analyze-video-url")
async def analyze_video_url(request: VideoAnalysisRequest):
    """전체 비디오 분석"""
    try:
        logger.info(f"비디오 분석 요청: {request.video_url}")
        
        # 비디오 다운로드
        video_path = video_downloader.download_video(request.video_url, request.application_id)
        if not video_path:
            raise HTTPException(status_code=400, detail="비디오 다운로드 실패")
        
        # 비디오 분석 수행
        analysis_result = video_analyzer.analyze_video(video_path, request.application_id)
        
        # 임시 파일 정리
        if os.path.exists(video_path):
            os.remove(video_path)
        
        logger.info("비디오 분석 완료")
        return analysis_result
        
    except Exception as e:
        logger.error(f"비디오 분석 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")

@app.post("/analyze-question-segments")
async def analyze_question_segments(request: QuestionAnalysisRequest):
    """질문별 구간 분석"""
    try:
        logger.info(f"질문별 분석 요청: {len(request.question_logs)}개 질문")
        
        # 질문별 분석 수행
        analysis_result = question_video_analyzer.analyze_question_segments(
            request.video_url, request.question_logs
        )
        
        logger.info("질문별 분석 완료")
        return analysis_result
        
    except Exception as e:
        logger.error(f"질문별 분석 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"질문별 분석 중 오류가 발생했습니다: {str(e)}")

@app.post("/delete-file")
async def delete_file(request: FileDeleteRequest):
    """파일 삭제 (임시 파일 정리용)"""
    try:
        logger.info(f"파일 삭제 요청: {request.file_path}")
        
        if not os.path.exists(request.file_path):
            logger.warning(f"파일이 존재하지 않음: {request.file_path}")
            return {"success": True, "message": "파일이 이미 존재하지 않습니다"}
        
        # 파일 삭제
        os.remove(request.file_path)
        logger.info(f"파일 삭제 완료: {request.file_path}")
        
        return {"success": True, "message": "파일이 성공적으로 삭제되었습니다"}
        
    except Exception as e:
        logger.error(f"파일 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 삭제 중 오류가 발생했습니다: {str(e)}")

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Video Analysis Service",
        "endpoints": [
            "/health",
            "/download-video",
            "/extract-audio",
            "/analyze-video-url",
            "/analyze-question-segments",
            "/delete-file"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002) 