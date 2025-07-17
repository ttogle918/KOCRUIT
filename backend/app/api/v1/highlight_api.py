from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.resume import Resume
from agent.tools.highlight_resume_tool import HighlightResumeTool

router = APIRouter()

@router.get("/highlight/{resume_id}")
def highlight_resume_by_id(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    text = resume.self_introduction  # 또는 실제 자기소개서 필드명
    tool = HighlightResumeTool()
    result = tool.analyze_text(text)
    return result

# === 아래 엔드포인트 추가 ===
@router.post("/highlight-resume")
def highlight_resume_by_text(
    text: str = Body(..., embed=True),
    job_description: str = Body("", embed=True),
    company_values: str = Body("", embed=True),
    qualifications: str = Body("", embed=True)
):
    tool = HighlightResumeTool()
    result = tool.analyze_text(text, job_description, company_values, qualifications)
    return result 