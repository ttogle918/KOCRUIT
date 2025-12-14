import logging
from typing import Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

async def spell_check_text(text: str) -> Dict[str, Any]:
    """Agent에 맞춤법 검사 요청"""
    agent_url = settings.AGENT_URL or "http://agent:8001"
    url = f"{agent_url}/api/v2/agent/tools/spell-check"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"text": text}, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"맞춤법 검사 요청 실패: {e}")
        return {
            "original_text": text,
            "corrected_text": text,
            "errors": [],
            "summary": "맞춤법 검사 서버 연결 실패"
        }

