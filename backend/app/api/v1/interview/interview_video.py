from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

router = APIRouter()

VIDEO_DIR = os.path.join(os.path.dirname(__file__), '../../scripts/interview_videos')

@router.get('/interview-videos/{applicant_id}')
async def get_interview_video(applicant_id: str):
    # 파일명 패턴: interview_{applicant_id}.mp4 또는 interview_{i}_{name}.mp4
    # 우선적으로 interview_{applicant_id}.mp4 시도, 없으면 폴더 내 mp4 중 applicant_id 포함된 첫 파일 반환
    
    # 1. 정확한 파일명 시도
    file_path = os.path.join(VIDEO_DIR, f'interview_{applicant_id}.mp4')
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='video/mp4', filename=os.path.basename(file_path))
    
    # 2. 폴더 내 applicant_id 포함된 mp4 탐색
    if os.path.exists(VIDEO_DIR):
        for fname in os.listdir(VIDEO_DIR):
            if fname.endswith('.mp4') and applicant_id in fname:
                return FileResponse(os.path.join(VIDEO_DIR, fname), media_type='video/mp4', filename=fname)
    
    raise HTTPException(status_code=404, detail='Interview video not found') 