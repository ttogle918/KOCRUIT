from fastapi import APIRouter

# --- Auth ---
from app.api.v2.auth import auth, users

# --- Recruitment ---
from app.api.v2.recruitment import company_jobs, public_jobs, companies, job_status

# --- Analysis (Pre-screening) ---
from app.api.v2.analysis import (
    highlight_api,
    resume_plagiarism,
    growth_prediction,
    background_analysis
)

# --- Document (Application Phase) ---
from app.api.v2.document import applications, resumes, schedules

# --- Test (Aptitude/Coding Test) ---
from app.api.v2.test import written_test, job_aptitude_reports

# --- Interview (Interview Phase) ---
from app.api.v2.interview import (
    interview_evaluation,
    interview_question,
    interview_before_helper,
    interview_panel,
    ai_evaluate,
    executive_interview,
    realtime_interview,
    ai_interview_questions,
    video_analysis,
    question_media_analysis,
    whisper_analysis
)

# --- Report (Final Report & Stats) ---
from app.api.v2.report import reports, statistics_analysis, analysis_results

# --- Common ---
from app.api.v2.common import notifications


api_router = APIRouter()

# Auth
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Recruitment
api_router.include_router(company_jobs.router, prefix="/company/jobposts", tags=["company-jobs"])
api_router.include_router(public_jobs.router, prefix="/public/jobposts", tags=["public-jobs"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(job_status.router, prefix="/job-status", tags=["job-status"])

# Analysis (Pre-screening)
api_router.include_router(highlight_api.router, prefix="/ai", tags=["AI Highlight"])
api_router.include_router(resume_plagiarism.router, prefix="/resume-plagiarism", tags=["resume-plagiarism"])
api_router.include_router(growth_prediction.router, prefix="/ai/growth-prediction", tags=["growth-prediction"])
api_router.include_router(background_analysis.router, prefix="/background-analysis", tags=["background-analysis"])

# Document
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])

# Test
api_router.include_router(written_test.router, prefix="/written-test", tags=["written-test"])
if hasattr(job_aptitude_reports, 'router'):
    api_router.include_router(job_aptitude_reports.router, prefix="/job-aptitude", tags=["job-aptitude"])

# Interview
api_router.include_router(interview_evaluation.router, prefix="/interview-evaluation", tags=["interview-evaluation"])
api_router.include_router(interview_question.router, prefix="/interview-questions", tags=["interview-questions"])
api_router.include_router(interview_before_helper.router, prefix="/before-interview", tags=["before-interview-helper-data"])
api_router.include_router(interview_panel.router, prefix="/interview-panel", tags=["interview-panel"])
api_router.include_router(ai_evaluate.router, prefix="/ai-evaluate", tags=["ai-evaluate"])
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

# Report
api_router.include_router(reports.router, prefix="/report", tags=["reports"])
api_router.include_router(statistics_analysis.router, prefix="/statistics", tags=["statistics-analysis"])
api_router.include_router(analysis_results.router, prefix="/analysis-results", tags=["analysis-results"])

# Common
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

