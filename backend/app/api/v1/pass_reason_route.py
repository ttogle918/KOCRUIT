from fastapi import APIRouter, HTTPException
from db import get_resume_by_id  # 너희 DB 코드에 맞춰 수정
from ai.pass_reason import generate_pass_reason

router = APIRouter()

@router.get("/ai/pass-reason/{resume_id}")
async def get_ai_pass_reason(resume_id: int):
    resume = get_resume_by_id(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    reason = generate_pass_reason(resume)
    return {"passReason": reason}
