from fastapi import APIRouter
from app.api.v1 import auth, company_jobs, public_jobs, applications, resumes, companies, notifications, schedules, users
from app.api.v1 import interview_evaluation, interview_question, interview_panel, job_status, reports
from .highlight_api import router as highlight_router
from app.api.v1.ai_evaluate import router as ai_evaluate_router
from app.api.v1.growth_prediction import router as growth_prediction_router
from .realtime_interview import router as realtime_interview_router


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
#api_router.include_router(ai_evaluate_router, prefix="/api/v1")
api_router.include_router(ai_evaluate_router)
api_router.include_router(growth_prediction_router, prefix="/growth-prediction", tags=["growth-prediction"])
api_router.include_router(ai_evaluate_router, prefix="/ai-evaluate", tags=["ai-evaluate"])
api_router.include_router(job_status.router, prefix="/job-status", tags=["job-status"])
api_router.include_router(highlight_router, prefix="/ai", tags=["AI Highlight"])
api_router.include_router(reports.router, prefix="/report", tags=["reports"])
api_router.include_router(realtime_interview_router, prefix="/realtime-interview", tags=["realtime-interview"])