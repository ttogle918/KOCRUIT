import httpx
from typing import Dict, Any, List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

AGENT_URL = settings.AGENT_URL or "http://agent:8001"

async def call_agent_api(endpoint: str, data: Dict[str, Any], method: str = "POST", timeout: float = 30.0) -> Dict[str, Any]:
    url = f"{AGENT_URL}/api/v2/agent{endpoint}"
    try:
        async with httpx.AsyncClient() as client:
            if method == "POST":
                response = await client.post(url, json=data, timeout=timeout)
            else:
                response = await client.get(url, timeout=timeout)
            
            if response.status_code != 200:
                logger.error(f"Agent API Error: {response.text}")
                return {"error": f"API Error: {response.status_code}"}
                
            return response.json()
    except Exception as e:
        logger.error(f"Agent API 호출 실패 ({url}): {e}")
        return {"error": str(e)}

async def generate_written_test_questions(job_post: Dict[str, Any]) -> List[str]:
    """Agent에 필기시험 문제 생성 요청"""
    result = await call_agent_api("/tools/written-test/generate", {"job_post": job_post}, timeout=60.0)
    return result if isinstance(result, list) else result.get("questions", [])

async def grade_written_test_answer(question: str, answer: str) -> Dict[str, Any]:
    """Agent에 필기시험 답안 채점 요청"""
    return await call_agent_api("/tools/written-test/grade", {"question": question, "answer": answer}, timeout=60.0)

async def analyze_statistics(chart_data: List[Dict[str, Any]], chart_type: str, job_title: str) -> Dict[str, Any]:
    """Agent에 통계 데이터 분석 요청"""
    return await call_agent_api("/tools/report/stats-analysis", {
        "chart_data": chart_data,
        "chart_type": chart_type,
        "job_title": job_title
    }, timeout=45.0)

async def generate_growth_reasons(comparison_data: str) -> List[str]:
    """Agent에 성장 가능성 근거 생성 요청"""
    result = await call_agent_api("/analysis/growth-reasons", {"comparison_data": comparison_data}, timeout=45.0)
    return result.get("reasons", [])

async def generate_score_narrative(table_str: str) -> str:
    """Agent에 점수 설명 생성 요청"""
    result = await call_agent_api("/analysis/score-narrative", {"table_str": table_str}, timeout=45.0)
    return result.get("narrative", "")

async def summarize_pass_reason(pass_reason: str) -> str:
    """Agent에 합격 사유 요약 요청"""
    # Tool은 state를 받도록 설계되어 있으므로 맞춤
    state = {
        "ai_score": 100, # 점수가 있어야 실행됨 (Tool 로직 참조)
        "scoring_details": {},
        "job_posting": "",
        "spec_data": {},
        "resume_data": {},
        # 실제 요약할 텍스트가 pass_reason이라면 Tool 로직을 수정하거나
        # Tool이 기대하는 데이터 구조를 맞춰줘야 함.
        # pass_reason_tool은 state의 데이터를 기반으로 '새로운' pass_reason을 생성하는 도구임.
        # 하지만 여기서 원하는 것은 '기존 pass_reason의 요약'일 수 있음.
        # ai_evaluate.py의 사용처를 확인해보니:
        # summarize_pass_reason(req.pass_reason)
        # 즉, 텍스트 요약을 원함.
        # pass_reason_tool은 '생성' 도구이지 '요약' 도구가 아닐 수 있음.
    }
    # 일단 Tool을 호출하지 않고 ReportTool의 요약 기능을 사용하거나
    # ReportTool에 텍스트 요약 기능이 있는지 확인 필요.
    
    # report_tool.extract_passed_summary는 List[str]을 받아 요약함.
    # 단일 문자열 요약이 필요하다면 새로운 엔드포인트를 쓰거나 기존 것을 활용.
    
    # 여기서는 report_tool.extract_passed_summary를 활용
    result = await call_agent_api("/tools/report/passed-summary", {"reasons": [pass_reason]}, timeout=45.0)
    return result.get("summary", "")
