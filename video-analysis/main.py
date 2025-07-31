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

class QuestionAnalysisRequest(BaseModel):
    video_url: str
    question_logs: List[Dict]

# 분석기 인스턴스
video_analyzer = VideoAnalyzer()
video_downloader = VideoDownloader()
question_video_analyzer = QuestionVideoAnalyzer()

@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    return {"status": "healthy", "service": "video-analysis"}

@app.post("/analyze-video-url")
async def analyze_video_url(request: VideoAnalysisRequest):
    """전체 비디오 분석"""
    try:
        logger.info(f"비디오 분석 요청: {request.video_url}")
        
        # 비디오 다운로드
        video_path = video_downloader.download_video(request.video_url)
        if not video_path:
            raise HTTPException(status_code=400, detail="비디오 다운로드 실패")
        
        # 비디오 분석 수행
        analysis_result = video_analyzer.analyze_video(video_path)
        
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

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Video Analysis Service",
        "endpoints": [
            "/health",
            "/analyze-video-url",
            "/analyze-question-segments"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002) 