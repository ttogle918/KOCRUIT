import logging
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings
import json

logger = logging.getLogger(__name__)

class ApplicantGrowthScoringService:
    """지원자 성장 예측 서비스 (Backend - Agent API 호출용)"""
    
    def __init__(self):
        self.agent_url = settings.AGENT_URL or "http://agent:8001"
            
    async def predict_growth(self, resume_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
        """Agent에 성장 예측 분석 요청"""
        url = f"{self.agent_url}/api/v2/agent/analysis/growth-prediction"
        payload = {
            "resume_data": resume_data,
            "job_description": job_description
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=60.0) # 긴 타임아웃
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"성장 예측 분석 요청 실패: {e}")
            return {
                "overall_growth_score": 0,
                "summary": "분석 서버 연결 실패",
                "error": str(e)
            }

applicant_growth_scoring_service = ApplicantGrowthScoringService()
