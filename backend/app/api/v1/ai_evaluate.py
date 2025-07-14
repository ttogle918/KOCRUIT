from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db  # Depends로 연결된 세션
from models import Application, Resume, JobPost  # SQLAlchemy 모델
from ai_evaluator import evaluate_application  # AI 평가 함수

router = APIRouter()

@router.post("/api/v1/applications/{application_id}/ai-evaluate")
async def evaluate_application_api(application_id: int, db: Session = Depends(get_db)):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
    if not job_post:
        raise HTTPException(status_code=404, detail="Job posting not found")

    try:
        result = evaluate_application(
            job_posting=job_post.description or "",
            spec_data={
                "name": application.name,
                "email": application.email,
                "score": application.score
            },
            resume_data={
                "education": resume.education,
                "experience": resume.experience,
                "skills": resume.skills,
                "certifications": resume.certifications,
                "content": resume.content
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

    return {
        "ai_score": result.get("ai_score", 0.0),
        "status": result.get("status", "REJECTED"),
        "pass_reason": result.get("pass_reason", ""),
        "fail_reason": result.get("fail_reason", ""),
        "scoring_details": result.get("scoring_details", {}),
        "decision_reason": result.get("decision_reason", ""),
        "confidence": result.get("confidence", 0.0),
        "message": "Application evaluation completed successfully"
    }