from fastapi import APIRouter
from app.api.v1 import auth, company_jobs, public_jobs, applications, resumes, companies, notifications, schedules, users
from app.api.v1 import interview_evaluation, interview_question, interview_panel, job_status, reports
from app.api.v1 import job_aptitude_reports
from .highlight_api import router as highlight_router
from app.api.v1.ai_evaluate import router as ai_evaluate_router
from app.api.v1.growth_prediction import router as growth_prediction_router
from .realtime_interview import router as realtime_interview_router
from .ai_interview_questions import router as ai_interview_questions_router
from .resume_plagiarism import router as resume_plagiarism_router
from .statistics_analysis import router as statistics_analysis_router
from app.api.v1.written_test import router as written_test_router
from .executive_interview import router as executive_interview_router
from .analysis_results import router as analysis_results_router
from .video_analysis import router as video_analysis_router
from .background_analysis import router as background_analysis_router
from app.api.v1.question_media_analysis import router as question_media_analysis_router
from app.api.v1.whisper_analysis import router as whisper_analysis_router


api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(company_jobs.router, prefix="/company/jobposts", tags=["company-jobs"])
api_router.include_router(public_jobs.router, prefix="/public/jobposts", tags=["public-jobs"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(interview_evaluation.router, prefix="/interview-evaluation", tags=["interview-evaluation"])
api_router.include_router(interview_question.router, prefix="/interview-questions", tags=["interview-questions"])
api_router.include_router(interview_panel.router, prefix="/interview-panel", tags=["interview-panel"])
api_router.include_router(growth_prediction_router, prefix="/ai/growth-prediction", tags=["growth-prediction"])
api_router.include_router(ai_evaluate_router, prefix="/ai-evaluate", tags=["ai-evaluate"])
api_router.include_router(job_status.router, prefix="/job-status", tags=["job-status"])
api_router.include_router(highlight_router, prefix="/ai", tags=["AI Highlight"])
api_router.include_router(reports.router, prefix="/report", tags=["reports"])
# job_aptitude_reports.router는 reports.router에 통합됨
api_router.include_router(realtime_interview_router, prefix="/realtime-interview", tags=["realtime-interview"])
api_router.include_router(ai_interview_questions_router, prefix="/ai-interview", tags=["ai-interview"])
api_router.include_router(statistics_analysis_router, prefix="/statistics", tags=["statistics-analysis"])
api_router.include_router(written_test_router, prefix="/written-test", tags=["written-test"])
api_router.include_router(resume_plagiarism_router, prefix="/resume-plagiarism", tags=["resume-plagiarism"])
api_router.include_router(executive_interview_router, prefix="/executive-interview", tags=["executive-interview"])
api_router.include_router(analysis_results_router, prefix="/analysis-results", tags=["analysis-results"])
api_router.include_router(video_analysis_router, prefix="/video-analysis", tags=["video-analysis"])
api_router.include_router(background_analysis_router, prefix="/background-analysis", tags=["background-analysis"])
# 질문별 미디어 분석 라우터 추가
api_router.include_router(
    question_media_analysis_router,
    prefix="/question-media-analysis",
    tags=["Question Media Analysis"]
)
# Whisper 분석 라우터 추가
api_router.include_router(
    whisper_analysis_router,
    prefix="/whisper-analysis",
    tags=["Whisper Analysis"]
)
