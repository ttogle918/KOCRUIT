import logging
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from app.models.v2.document.resume import Resume
from app.core.config import settings
import json

logger = logging.getLogger(__name__)

class ResumePlagiarismService:
    """이력서 표절 검사 서비스 (Backend - Agent API 호출용)"""
    
    def __init__(self):
        # Agent 서버 주소
        self.agent_url = settings.AGENT_URL or "http://agent:8001"
            
    async def _call_agent_api(self, endpoint: str, data: Dict[str, Any] = None, method="POST") -> Dict[str, Any]:
        """Agent API 호출 헬퍼"""
        url = f"{self.agent_url}/api/v2/agent{endpoint}"
        try:
            async with httpx.AsyncClient() as client:
                if method == "POST":
                    response = await client.post(url, json=data, timeout=30.0)
                else:
                    response = await client.get(url, timeout=10.0)
                
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Agent API 호출 실패 ({url}): {e}")
            return {"error": str(e)}

    async def embed_and_store_resume(self, db: Session, resume_id: int) -> bool:
        """이력서를 Agent DB에 등록 요청"""
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                logger.error(f"이력서를 찾을 수 없음: {resume_id}")
                return False
                
            # content 추출
            content = resume.content
            if isinstance(content, list) or (isinstance(content, str) and content.startswith("[") and content.endswith("]")):
                 try:
                    loaded = json.loads(content) if isinstance(content, str) else content
                    content = "\n".join([item.get('content', '') for item in loaded if isinstance(item, dict)])
                 except:
                    pass
            
            payload = {
                "resume_id": resume_id,
                "content": str(content)
            }
            
            result = await self._call_agent_api("/analysis/plagiarism/add", payload)
            return result.get("success", False)
            
        except Exception as e:
            logger.error(f"이력서 임베딩 요청 실패: {e}")
            return False

    async def check_plagiarism(self, resume_content: str) -> Dict[str, Any]:
        """표절 검사 요청"""
        content = resume_content
        if isinstance(content, list) or (isinstance(content, str) and content.startswith("[") and content.endswith("]")):
             try:
                loaded = json.loads(content) if isinstance(content, str) else content
                content = "\n".join([item.get('content', '') for item in loaded if isinstance(item, dict)])
             except:
                pass

        payload = {
            "content": str(content),
            "resume_id": 0
        }
        return await self._call_agent_api("/analysis/plagiarism", payload)

    async def get_health_status(self) -> Dict[str, Any]:
        """Agent 표절 검사 서비스 헬스 체크"""
        return await self._call_agent_api("/analysis/plagiarism/health", method="GET")

# 싱글톤 인스턴스
resume_plagiarism_service = ResumePlagiarismService()
