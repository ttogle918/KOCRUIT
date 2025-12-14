from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, or_
from app.schemas.written_test_answer import WrittenTestAnswerCreate, WrittenTestAnswerResponse
from app.core.database import get_db
from app.models.v2.recruitment.job import JobPost
from app.models.v2.test.written_test_question import WrittenTestQuestion
from app.models.v2.test.written_test_answer import WrittenTestAnswer
from app.models.v2.document.application import Application, StageStatus, StageName
from app.services.v2.document.application_service import update_stage_status
from app.schemas.ai_evaluate import PassReasonSummaryRequest, PassReasonSummaryResponse
# from app.services.v2.analysis.ai_insights_service import summarize_pass_reason
from app.utils.agent_client import generate_written_test_questions, grade_written_test_answer, summarize_pass_reason

router = APIRouter()

class WrittenTestGenerateRequest(BaseModel):
    jobPostId: int

class WrittenTestSubmitRequest(BaseModel):
    jobPostId: int
    questions: List[str]

class SpellCheckRequest(BaseModel):
    text: str
    field_name: str = ""

class SpellCheckResponse(BaseModel):
    errors: List[dict]
    summary: str
    suggestions: List[str]
    corrected_text: str = ""

class WrittenTestStatusUpdateRequest(BaseModel):
    user_id: int
    jobpost_id: int
    status: str  # PASSED, FAILED, etc.
    score: float

@router.post('/written-test/generate')
async def generate_written_test(req: WrittenTestGenerateRequest, db: Session = Depends(get_db)):
    try:
        job_post = db.query(JobPost).filter(JobPost.id == req.jobPostId).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="JobPost not found")
        
        # 필수 필드 체크 (4개 모두 키 포함, None은 빈 문자열)
        jobpost_dict = {
            "title": getattr(job_post, "title", "") or "",
            "qualifications": getattr(job_post, "qualifications", "") or "",
            "conditions": getattr(job_post, "conditions", "") or "",
            "job_details": getattr(job_post, "job_details", "") or ""
        }
        
        for key in ["title", "qualifications", "conditions", "job_details"]:
            if jobpost_dict[key] == "":
                raise HTTPException(status_code=400, detail=f"JobPost의 '{key}' 필드가 비어 있습니다.")
        
        # Agent API 호출
        questions = await generate_written_test_questions(jobpost_dict)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"문제 생성 오류: {str(e)}")

@router.post('/written-test/submit')
def submit_written_test(req: WrittenTestSubmitRequest, db: Session = Depends(get_db)):
    try:
        # testType 추론 (코딩/직무적합성)
        dev_keywords = ['개발', '엔지니어', '프로그래밍', 'SW', 'IT']
        job_post = db.query(JobPost).filter(JobPost.id == req.jobPostId).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="JobPost not found")
        # department를 문자열로 안전하게 처리
        department_name = ""
        if hasattr(job_post, "department") and job_post.department is not None:
            # 관계형 객체라면 .name 사용
            if hasattr(job_post.department, "name"):
                department_name = job_post.department.name or ""
            else:
                department_name = str(job_post.department)
        # testType 판별
        is_dev = any(k in (job_post.title or "") or k in department_name for k in dev_keywords)
        test_type = 'coding' if is_dev else 'aptitude'
        # 문제 저장
        for idx, q in enumerate(req.questions):
            question = WrittenTestQuestion(
                jobpost_id=req.jobPostId,
                question_type=test_type,
                question_text=q
            )
            db.add(question)
        db.commit()
        return {"success": True, "message": "문제 제출 및 저장이 완료되었습니다."}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB 저장 오류: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"문제 제출 오류: {str(e)}")

@router.post('/written-test/submit-answer', response_model=WrittenTestAnswerResponse)
async def submit_written_test_answer(req: WrittenTestAnswerCreate, db: Session = Depends(get_db)):
    try:
        answer = WrittenTestAnswer(
            user_id=req.user_id,
            jobpost_id=req.jobpost_id,
            question_id=req.question_id,
            answer_text=req.answer_text
        )
        # AI 채점: score, feedback이 없는 경우에만 평가
        question = db.query(WrittenTestQuestion).filter(WrittenTestQuestion.id == req.question_id).first()
        if question and (answer.score is None or answer.score == 0):
            result = await grade_written_test_answer(question.question_text, req.answer_text)
            answer.score = result.get("score")
            answer.feedback = result.get("feedback")
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"답안 저장/채점 오류: {str(e)}")

@router.post('/spell-check', response_model=SpellCheckResponse)
async def spell_check_text(req: SpellCheckRequest):
    """
    한국어 텍스트의 맞춤법을 검사하고 수정 제안을 제공하는 API
    """
    try:
        from app.utils.spell_checker import spell_check_text as agent_spell_check
        
        if not req.text:
            return SpellCheckResponse(
                errors=[],
                summary="검사할 텍스트가 없습니다.",
                suggestions=["텍스트를 입력해주세요."]
            )
        
        # Agent API 호출 (비동기)
        result = await agent_spell_check(req.text)
        
        # 결과 처리 및 응답 생성
        corrected = result.get("corrected_text", req.text)
        
        return SpellCheckResponse(
            errors=result.get("errors", []),
            summary=result.get("summary", ""),
            suggestions=result.get("suggestions", []) or ([corrected] if corrected != req.text else []),
            corrected_text=corrected
        )
            
    except Exception as e:
        print(f"맞춤법 검사 오류: {e}")
        return SpellCheckResponse(
            errors=[],
            summary=f"오류가 발생했습니다: {str(e)}",
            suggestions=[],
            corrected_text=req.text
        )

@router.post('/written-test/auto-grade/jobpost/{jobpost_id}')
async def auto_grade_written_test_by_jobpost(jobpost_id: int, db: Session = Depends(get_db)):
    """
    해당 jobpost_id의 모든 문제/답안 중 score가 NULL인 것만 AI로 자동 채점하여 score/feedback을 저장하고,
    지원자별 평균 점수를 application.written_test_score에 저장, 상위 5배수만 합격(PASSED) 처리
    """
    try:
        questions = db.query(WrittenTestQuestion).filter(WrittenTestQuestion.jobpost_id == jobpost_id).all()
        if not questions:
            raise HTTPException(status_code=404, detail="해당 공고의 문제가 없습니다.")
        # score가 NULL인 답안만 불러오기
        answers = db.query(WrittenTestAnswer).filter(
            WrittenTestAnswer.jobpost_id == jobpost_id,
            or_(WrittenTestAnswer.score == None, WrittenTestAnswer.score == 0)
        ).all()
        # 1. 답안별로 score/feedback 저장
        graded_count = 0
        for answer in answers:
            question = next((q for q in questions if q.id == answer.question_id), None)
            if not question:
                continue
            result = await grade_written_test_answer(question.question_text, answer.answer_text)
            if result.get("score") is not None:
                answer.score = result["score"]
                answer.feedback = result["feedback"]
                graded_count += 1
            else:
                answer.feedback = result.get("feedback", "")
        db.commit()
        # 2. 지원자별 평균 점수 계산 및 application 테이블에 저장
        results = (
            db.query(
                WrittenTestAnswer.user_id,
                func.avg(WrittenTestAnswer.score).label('average_score')
            )
            .filter(WrittenTestAnswer.jobpost_id == jobpost_id)
            .group_by(WrittenTestAnswer.user_id)
            .order_by(func.avg(WrittenTestAnswer.score).desc())
            .all()
        )
        jobpost = db.query(JobPost).filter(JobPost.id == jobpost_id).first()
        headcount = jobpost.headcount if jobpost and jobpost.headcount else 1
        cutoff = headcount * 5
        result_list = []
        for idx, row in enumerate(results):
            avg_score = row.average_score
            application = db.query(Application).filter(
                Application.user_id == row.user_id,
                Application.job_post_id == jobpost_id
            ).first()
            if application:
                application.written_test_score = avg_score
                if idx < cutoff:
                    # application.written_test_status = WrittenTestStatus.PASSED <- 대체
                    update_stage_status(db, application.id, StageName.WRITTEN_TEST, StageStatus.PASSED)
                else:
                    # application.written_test_status = WrittenTestStatus.FAILED <- 대체
                    update_stage_status(db, application.id, StageName.WRITTEN_TEST, StageStatus.FAILED)
            result_list.append({
                "user_id": row.user_id,
                "average_score": round(avg_score, 2) if avg_score is not None else None,
                "status": "합격" if idx < cutoff else "불합격"
            })
        db.commit()
        return {
            "graded_count": graded_count,
            "total_answers": len(answers),
            "results": result_list
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"자동 채점 오류: {str(e)}")

@router.get('/written-test/results/{jobpost_id}')
def get_written_test_results(jobpost_id: int, db: Session = Depends(get_db)):
    results = (
        db.query(
            WrittenTestAnswer.user_id,
            func.sum(WrittenTestAnswer.score).label('total_score')
        )
        .filter(WrittenTestAnswer.jobpost_id == jobpost_id)
        .group_by(WrittenTestAnswer.user_id)
        .order_by(func.sum(WrittenTestAnswer.score).desc())
        .all()
    )
    jobpost = db.query(JobPost).filter(JobPost.id == jobpost_id).first()
    headcount = jobpost.headcount if jobpost and jobpost.headcount else 1
    cutoff = headcount * 5
    result_list = []
    # 합격/불합격 상태 일괄 업데이트
    for idx, row in enumerate(results):
        status = "합격" if idx < cutoff else "불합격"
        # Application 객체 찾아서 written_test_status 업데이트
        application = db.query(Application).filter(
            Application.user_id == row.user_id,
            Application.job_post_id == jobpost_id
        ).first()
        if application:
            if status == "합격":
                # application.written_test_status = WrittenTestStatus.PASSED
                update_stage_status(db, application.id, StageName.WRITTEN_TEST, StageStatus.PASSED)
            else:
                # application.written_test_status = WrittenTestStatus.FAILED
                update_stage_status(db, application.id, StageName.WRITTEN_TEST, StageStatus.FAILED)
        result_list.append({
            "user_id": row.user_id,
            "total_score": row.total_score,
            "status": status
        })
    db.commit()
    return result_list

@router.get('/written-test/passed/{jobpost_id}')
def get_written_test_passed_applicants(jobpost_id: int, db: Session = Depends(get_db)):
    from app.models.v2.document.application import Application, StageStatus, StageName, ApplicationStage
    
    try:
        print(f"🔍 필기 합격자 조회 시작 - jobpost_id: {jobpost_id}")
        
        # jobpost_id 유효성 검사
        if not jobpost_id or jobpost_id <= 0:
            print(f"❌ 유효하지 않은 jobpost_id: {jobpost_id}")
            raise HTTPException(status_code=400, detail="유효한 공고 ID가 필요합니다.")
        
        # 전체 지원자 수 확인
        total_applications = db.query(Application).filter(
            Application.job_post_id == jobpost_id
        ).count()
        print(f"📊 전체 지원자 수: {total_applications}")
        
        if total_applications == 0:
            print(f"⚠️ 해당 공고에 지원자가 없습니다: jobpost_id={jobpost_id}")
            return []
        
        # 필기시험 상태별 분포 확인
        status_counts = db.query(Application.written_test_status, func.count(Application.id)).filter(
            Application.job_post_id == jobpost_id
        ).group_by(Application.written_test_status).all()
        
        print(f"📋 필기시험 상태별 분포:")
        for status, count in status_counts:
            print(f"  - {status}: {count}명")
        
        # 필기 합격자 조회 (ApplicationStage join)
        passed_apps = db.query(Application).join(Application.stages).filter(
            Application.job_post_id == jobpost_id,
            ApplicationStage.stage_name == StageName.WRITTEN_TEST,
            ApplicationStage.status == StageStatus.PASSED
        ).all()
        
        print(f"✅ 필기 합격자 수: {len(passed_apps)}")
        
        # 각 필기 합격자의 상세 정보 로그
        for i, app in enumerate(passed_apps):
            user_name = app.user.name if app.user else "Unknown"
            print(f"  필기 합격자 {i+1}: ID={app.id}, User={user_name}, Score={app.written_test_score}")
        
        result = [
            {
                "user_id": app.user.id if app.user else None,
                "user_name": app.user.name if app.user else None,
                "written_test_score": app.written_test_score,
            }
            for app in passed_apps
        ]
        
        print(f"📤 반환할 데이터: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 필기 합격자 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="필기 합격자 데이터 조회 중 오류가 발생했습니다.")

@router.post('/written-test/update-status-and-score')
def update_written_test_status_and_score(
    req: WrittenTestStatusUpdateRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    지원자의 필기시험 상태와 최종 점수를 동시에 업데이트합니다.
    """
    application = db.query(Application).filter(
        Application.user_id == req.user_id,
        Application.job_post_id == req.jobpost_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    # 상태 및 점수 동시 업데이트
    # application.written_test_status = getattr(WrittenTestStatus, req.status)
    # application.written_test_score = req.score
    
    new_status = getattr(StageStatus, req.status, StageStatus.PENDING)
    update_stage_status(
        db, application.id, StageName.WRITTEN_TEST, new_status, score=req.score
    )
    
    db.commit()
    return {"message": "Written test status and score updated successfully."}

@router.post("/summary", response_model=PassReasonSummaryResponse)
async def summarize_pass_reason_api(req: PassReasonSummaryRequest):
    try:
        if not req.pass_reason or not req.pass_reason.strip():
            raise HTTPException(status_code=422, detail="pass_reason이 비어있습니다.")
        
        summary = await summarize_pass_reason(req.pass_reason)
        if not summary:
            raise HTTPException(status_code=500, detail="요약 생성에 실패했습니다.")
        
        return PassReasonSummaryResponse(summary=summary)
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except EnvironmentError as ee:
        raise HTTPException(status_code=500, detail=f"환경 설정 오류: {str(ee)}")
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=f"요약 처리 오류: {str(re)}")
    except Exception as e:
        print(f"합격 요약 API 오류: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")