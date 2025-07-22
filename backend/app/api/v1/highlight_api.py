from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import requests
import json
from pydantic import BaseModel

from app.core.database import get_db
from app.models.application import Application
from app.models.job import JobPost
from app.models.company import Company

router = APIRouter()

class HighlightRequest(BaseModel):
    application_id: int
    jobpost_id: Optional[int] = None
    company_id: Optional[int] = None

@router.post("/highlight-resume-by-application")
async def highlight_resume_by_application(
    request: HighlightRequest,
    db: Session = Depends(get_db)
):
    """
    application_id를 기반으로 이력서 하이라이팅 분석을 수행합니다.
    """
    try:
        print(f"🔍 하이라이팅 요청 시작: application_id={request.application_id}")
        
        # 지원서 정보 가져오기
        application = db.query(Application).filter(Application.id == request.application_id).first()
        if not application:
            print(f"❌ Application not found: {request.application_id}")
            raise HTTPException(status_code=404, detail="Application not found")
        
        print(f"✅ Application found: {application.id}")
        
        # 이력서 내용 가져오기
        resume_content = application.resume.content if application.resume else ""
        if not resume_content:
            print(f"❌ Resume content not found for application: {request.application_id}")
            raise HTTPException(status_code=404, detail="Resume content not found")
        
        print(f"✅ Resume content found: {len(resume_content)} characters")
        
        # AI Agent 서버로 요청 (Docker 네트워크에서는 컨테이너 이름 사용)
        agent_url = "http://kocruit_agent:8001/highlight-resume"
        payload = {
            "application_id": request.application_id,
            "jobpost_id": request.jobpost_id,
            "company_id": request.company_id,
            "resume_content": resume_content  # 이력서 내용을 직접 전달
        }
        
        print(f"🚀 AI Agent 서버로 요청: {agent_url}")
        print(f"📦 Payload: {payload}")
        
        # 타임아웃을 2분으로 단축 (AI 분석 시간 최적화)
        response = requests.post(agent_url, json=payload, timeout=120)
        print(f"📡 AI Agent 응답 상태: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ AI Agent 오류 응답: {response.text}")
            raise HTTPException(status_code=500, detail=f"AI Agent 서버 오류: {response.text}")
        
        result = response.json()
        print(f"✅ 하이라이팅 분석 완료: {len(result.get('highlights', []))} highlights")
        
        return result
        
    except requests.exceptions.Timeout as e:
        print(f"❌ AI Agent 서버 타임아웃: {str(e)}")
        raise HTTPException(status_code=408, detail="하이라이팅 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")
    except requests.exceptions.RequestException as e:
        print(f"❌ AI Agent 서버 연결 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Agent 서버 오류: {str(e)}")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        import traceback
        print(f"📋 상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

