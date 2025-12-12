from fastapi import APIRouter

# --- Auth ---
from app.api.v1.auth import auth, users

# --- Recruitment ---
from app.api.v1.recruitment import company_jobs, public_jobs, companies, job_status

# --- Application ---
from app.api.v1.application import applications, resumes, schedules

# --- Interview ---
from app.api.v1.interview import (
    interview_evaluation,
    interview_question,
    interview_panel,
    ai_evaluate,
    written_test,
    executive_interview,
    realtime_interview,
    ai_interview_questions,
    video_analysis,
    question_media_analysis,
    whisper_analysis
)

# --- Analysis ---
from app.api.v1.analysis import reports, resume_plagiarism, statistics_analysis

# --- Root Level (Not moved yet) ---
from app.api.v1 import notifications, job_aptitude_reports
from app.api.v1 import highlight_api
from app.api.v1 import growth_prediction
from app.api.v1 import analysis_results
from app.api.v1 import background_analysis


api_router = APIRouter()

# Auth
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Recruitment
api_router.include_router(company_jobs.router, prefix="/company/jobposts", tags=["company-jobs"])
api_router.include_router(public_jobs.router, prefix="/public/jobposts", tags=["public-jobs"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(job_status.router, prefix="/job-status", tags=["job-status"])

# Application
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])

# Interview
api_router.include_router(interview_evaluation.router, prefix="/interview-evaluation", tags=["interview-evaluation"])
api_router.include_router(interview_question.router, prefix="/interview-questions", tags=["interview-questions"])
api_router.include_router(interview_panel.router, prefix="/interview-panel", tags=["interview-panel"])
api_router.include_router(ai_evaluate.router, prefix="/ai-evaluate", tags=["ai-evaluate"])
api_router.include_router(written_test.router, prefix="/written-test", tags=["written-test"])
api_router.include_router(executive_interview.router, prefix="/executive-interview", tags=["executive-interview"])
api_router.include_router(realtime_interview.router, prefix="/realtime-interview", tags=["realtime-interview"])
api_router.include_router(ai_interview_questions.router, prefix="/ai-interview", tags=["ai-interview"])
api_router.include_router(video_analysis.router, prefix="/video-analysis", tags=["video-analysis"])
api_router.include_router(
    question_media_analysis.router,
    prefix="/question-media-analysis",
    tags=["Question Media Analysis"]
)
api_router.include_router(
    whisper_analysis.router,
    prefix="/whisper-analysis",
    tags=["Whisper Analysis"]
)

# Analysis
api_router.include_router(reports.router, prefix="/report", tags=["reports"])
api_router.include_router(resume_plagiarism.router, prefix="/resume-plagiarism", tags=["resume-plagiarism"])
api_router.include_router(statistics_analysis.router, prefix="/statistics", tags=["statistics-analysis"])

# Others (Root Level)
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(highlight_api.router, prefix="/ai", tags=["AI Highlight"])
api_router.include_router(growth_prediction.router, prefix="/ai/growth-prediction", tags=["growth-prediction"])
api_router.include_router(analysis_results.router, prefix="/analysis-results", tags=["analysis-results"])
api_router.include_router(background_analysis.router, prefix="/background-analysis", tags=["background-analysis"])
