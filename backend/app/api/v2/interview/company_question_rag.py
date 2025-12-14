from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any
import httpx
from app.core.config import settings
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# 응답 모델
class CompanyQuestionRagResponse(BaseModel):
    values_summary: str
    news_summary: str
    values_questions: List[str]
    tech_questions: List[str]

@router.get("/company/questions/rag", response_model=CompanyQuestionRagResponse)
async def generate_company_questions_rag(company_name: str = Query(...)):
    """
    기업 정보 RAG 기반 질문 생성 (Agent API 호출)
    """
    agent_url = settings.AGENT_URL or "http://agent:8001"
    url = f"{agent_url}/api/v2/agent/tools/company-rag"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, 
                json={"company_name": company_name, "company_context": ""},
                timeout=60.0 # RAG 작업이므로 타임아웃 넉넉히
            )
            response.raise_for_status()
            result = response.json()
            
            return CompanyQuestionRagResponse(
                values_summary=result.get("values_summary", ""),
                news_summary=result.get("news_summary", ""),
                values_questions=result.get("values_questions", []),
                tech_questions=result.get("tech_questions", [])
            )
            
    except Exception as e:
        logger.error(f"기업 질문 생성 요청 실패: {e}")
        raise HTTPException(status_code=500, detail=f"질문 생성 중 오류가 발생했습니다: {str(e)}")

# LangGraph 노드용 함수 (필요 시 유지하되 API 호출로 변경)
async def generate_questions(company_name: str, company_context: str = ""):
    """Agent API를 통해 질문 생성"""
    agent_url = settings.AGENT_URL or "http://agent:8001"
    url = f"{agent_url}/api/v2/agent/tools/company-rag"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, 
                json={"company_name": company_name, "company_context": company_context},
                timeout=60.0
            )
            if response.status_code == 200:
                result = response.json()
                all_questions = []
                all_questions.extend(result.get("values_questions", []))
                all_questions.extend(result.get("tech_questions", []))
                return {"text": all_questions}
            else:
                return {"text": [f"질문 생성 실패: {response.status_code}"]}
    except Exception as e:
        return {"text": [f"질문 생성 중 오류가 발생했습니다: {str(e)}"]}
