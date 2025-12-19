from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

# 서비스 및 도구 import
from agent.services.resume_plagiarism_service import ResumePlagiarismService
from agent.services.applicant_growth_service import ApplicantGrowthScoringService
from agent.tools.spell_check_tool import spell_check_text
from agent.tools.company_rag_tool import company_rag_tool
from agent.tools.report_tool import report_tool
from agent.tools.written_test_generation_tool import generate_written_test_questions
from agent.tools.answer_grading_tool import grade_written_test_answer
from agent.tools.pass_reason_tool import pass_reason_tool

router = APIRouter()
logger = logging.getLogger(__name__)

# 서비스 인스턴스
plagiarism_service = ResumePlagiarismService()
growth_service = ApplicantGrowthScoringService()

# --- DTO ---
class PlagiarismRequest(BaseModel):
    content: str
    resume_id: int

class GrowthPredictionRequest(BaseModel):
    resume_data: Dict[str, Any]
    job_description: str

class GrowthReasonsRequest(BaseModel):
    comparison_data: str

class ScoreNarrativeRequest(BaseModel):
    table_str: str

class SpellCheckRequest(BaseModel):
    text: str

class CompanyRagRequest(BaseModel):
    company_name: str
    company_context: Optional[str] = ""

class RejectionReasonRequest(BaseModel):
    reasons: List[str]

class PassSummaryRequest(BaseModel):
    reasons: List[str]

class StatsAnalysisRequest(BaseModel):
    chart_data: List[Dict[str, Any]]
    chart_type: str
    job_title: str

class InterviewPrepRequest(BaseModel):
    job_post: Dict[str, Any]
    resume_data: Dict[str, Any]
    interview_type: str = "PRACTICAL"

class WrittenTestGenRequest(BaseModel):
    job_post: Dict[str, Any]

class WrittenTestGradeRequest(BaseModel):
    question: str
    answer: str

class PassReasonToolRequest(BaseModel):
    state: Dict[str, Any]

# --- Endpoints ---

@router.post("/analysis/plagiarism")
async def check_plagiarism(req: PlagiarismRequest):
    return plagiarism_service.check_plagiarism(req.content)

@router.post("/analysis/plagiarism/add")
async def add_resume_to_plagiarism_db(req: PlagiarismRequest):
    success = plagiarism_service.add_resume(req.resume_id, req.content)
    return {"success": success}

@router.get("/analysis/plagiarism/health")
async def plagiarism_health_check():
    """표절 검사 서비스 상태 확인"""
    try:
        # 임베딩 모델 테스트
        plagiarism_service.embeddings.embed_query("test")
        return {
            "status": "healthy",
            "openai_api_valid": True,
            "chromadb_connected": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@router.post("/analysis/growth-prediction")
async def predict_growth(req: GrowthPredictionRequest):
    return growth_service.predict_growth(req.resume_data, req.job_description)

@router.post("/analysis/growth-reasons")
async def generate_growth_reasons(req: GrowthReasonsRequest):
    """성장 가능성 근거 생성"""
    reasons = growth_service.generate_growth_reasons(req.comparison_data)
    return {"reasons": reasons}

@router.post("/analysis/score-narrative")
async def generate_score_narrative(req: ScoreNarrativeRequest):
    """점수 설명 생성"""
    narrative = growth_service.generate_score_narrative(req.table_str)
    return {"narrative": narrative}

@router.post("/tools/spell-check")
async def spell_check(req: SpellCheckRequest):
    return spell_check_text(req.text)

@router.post("/tools/company-rag")
async def generate_company_questions(req: CompanyRagRequest):
    return await company_rag_tool.generate_questions(req.company_name, req.company_context)

@router.post("/tools/report/rejection-reasons")
async def extract_rejection_reasons(req: RejectionReasonRequest):
    top3 = report_tool.extract_top3_rejection_reasons(req.reasons)
    return {"top_reasons": top3}

@router.post("/tools/report/passed-summary")
async def extract_passed_summary(req: PassSummaryRequest):
    summary = report_tool.extract_passed_summary(req.reasons)
    return {"summary": summary}

@router.post("/tools/report/stats-analysis")
async def analyze_statistics(req: StatsAnalysisRequest):
    """통계 분석"""
    return report_tool.analyze_statistics(req.chart_data, req.chart_type, req.job_title)

# @router.post("/tools/interview-prep")
# async def generate_interview_prep(req: InterviewPrepRequest):
#     return await interview_prep_tool.generate_tools(req.job_post, req.resume_data, req.interview_type)

@router.post("/tools/written-test/generate")
async def generate_written_test(req: WrittenTestGenRequest):
    """필기시험 문제 생성"""
    # Tool이 dict를 받도록 되어있으므로, 내부에서 'jobpost' 키로 감싸서 전달하거나 그대로 전달
    # generate_written_test_questions 함수 정의에 따라 다름
    # 여기서는 req.job_post를 그대로 전달 (이미 dict)
    return generate_written_test_questions({"jobpost": req.job_post})

@router.post("/tools/written-test/grade")
async def grade_written_test(req: WrittenTestGradeRequest):
    """필기시험 답안 채점"""
    return grade_written_test_answer(req.question, req.answer)

@router.post("/tools/pass-reason")
async def generate_pass_reason(req: PassReasonToolRequest):
    """합격 사유 생성"""
    result = pass_reason_tool(req.state)
    return {"pass_reason": result.get("pass_reason", "")}
