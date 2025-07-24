from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import JobPost
from app.models.written_test_question import WrittenTestQuestion
from app.models.written_test_answer import WrittenTestAnswer
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from sqlalchemy import or_

# agent tool import
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
from agent.tools.written_test_generation_tool import generate_written_test_questions
from agent.tools.answer_grading_tool import grade_written_test_answer
from app.schemas.written_test_answer import WrittenTestAnswerCreate, WrittenTestAnswerResponse

import openai
import re
from app.models.application import Application, WrittenTestStatus

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
def generate_written_test(req: WrittenTestGenerateRequest, db: Session = Depends(get_db)):
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
        # 디버깅용 로그 추가
        print("job_post:", job_post)
        print("title:", getattr(job_post, "title", None))
        print("qualifications:", getattr(job_post, "qualifications", None))
        print("conditions:", getattr(job_post, "conditions", None))
        print("job_details:", getattr(job_post, "job_details", None))
        print("jobpost_dict:", jobpost_dict)
        
        for key in ["title", "qualifications", "conditions", "job_details"]:
            if jobpost_dict[key] == "":
                raise HTTPException(status_code=400, detail=f"JobPost의 '{key}' 필드가 비어 있습니다.")
        
        # 호출 방식 변경: jobpost_dict를 jobpost 키로 감싸서 넘김
        questions = generate_written_test_questions({"jobpost": jobpost_dict})
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
def submit_written_test_answer(req: WrittenTestAnswerCreate, db: Session = Depends(get_db)):
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
            result = grade_written_test_answer(question.question_text, req.answer_text)
            answer.score = result["score"]
            answer.feedback = result["feedback"]
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"답안 저장/채점 오류: {str(e)}")

@router.post('/spell-check', response_model=SpellCheckResponse)
def spell_check_text(req: SpellCheckRequest):
    """
    한국어 텍스트의 맞춤법을 검사하고 수정 제안을 제공하는 API
    """
    try:
        from langchain_openai import ChatOpenAI
        import json
        
        if not req.text:
            return SpellCheckResponse(
                errors=[],
                summary="검사할 텍스트가 없습니다.",
                suggestions=["텍스트를 입력해주세요."]
            )
        
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
        
        prompt = f"""
        아래의 한국어 텍스트에서 맞춤법 오류를 찾아 수정 제안을 해주세요.
        
        검사할 텍스트:
        {req.text}
        
        검사 기준:
        1. 맞춤법 오류 (띄어쓰기, 받침, 조사 등)
        2. 문법 오류
        3. 어색한 표현
        4. 비표준어 사용
        5. 채용공고에 적합하지 않은 표현
        
        응답 형식 (JSON):
        {{
            "errors": [
                {{
                    "original": "원본 텍스트",
                    "corrected": "수정된 텍스트",
                    "explanation": "수정 이유"
                }}
            ],
            "summary": "전체 맞춤법 검사 요약",
            "suggestions": [
                "전반적인 개선 제안 1",
                "전반적인 개선 제안 2"
            ]
        }}
        
        주의사항:
        - 맞춤법이 정확한 경우 errors 배열은 비워두세요
        - 각 오류는 구체적이고 명확하게 설명하세요
        - 채용공고의 전문성과 신뢰성을 고려하세요
        - 수정 제안은 원본 의미를 유지하면서 개선하세요
        """
        
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        
        # JSON 부분만 추출
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        spell_check_result = json.loads(response_text)
        
        # 수정된 텍스트 생성
        corrected_text = req.text
        if spell_check_result.get("errors"):
            for error in spell_check_result["errors"]:
                original = error.get("original", "")
                corrected = error.get("corrected", "")
                if original and corrected:
                    corrected_text = corrected_text.replace(original, corrected)
        
        return SpellCheckResponse(
            errors=spell_check_result.get("errors", []),
            summary=spell_check_result.get("summary", ""),
            suggestions=spell_check_result.get("suggestions", []),
            corrected_text=corrected_text
        )
        
    except Exception as e:
        print(f"맞춤법 검사 중 오류 발생: {e}")
        return SpellCheckResponse(
            errors=[],
            summary="맞춤법 검사 중 오류가 발생했습니다.",
            suggestions=["다시 시도해주세요."],
            corrected_text=req.text
        )

@router.post('/written-test/auto-grade/jobpost/{jobpost_id}')
def auto_grade_written_test_by_jobpost(jobpost_id: int, db: Session = Depends(get_db)):
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
            result = grade_written_test_answer(question.question_text, answer.answer_text)
            if result["score"] is not None:
                answer.score = result["score"]
                answer.feedback = result["feedback"]
                graded_count += 1
            else:
                answer.feedback = result["feedback"]
        db.commit()
        # 2. 지원자별 평균 점수 계산 및 application 테이블에 저장
        from sqlalchemy import func
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
                    application.written_test_status = WrittenTestStatus.PASSED
                else:
                    application.written_test_status = WrittenTestStatus.FAILED
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
                application.written_test_status = WrittenTestStatus.PASSED
            else:
                application.written_test_status = WrittenTestStatus.FAILED
        result_list.append({
            "user_id": row.user_id,
            "total_score": row.total_score,
            "status": status
        })
    db.commit()
    return result_list

@router.get('/written-test/passed/{jobpost_id}')
def get_written_test_passed_applicants(jobpost_id: int, db: Session = Depends(get_db)):
    from app.models.application import Application, WrittenTestStatus
    passed_apps = db.query(Application).filter(
        Application.job_post_id == jobpost_id,
        Application.written_test_status == WrittenTestStatus.PASSED
    ).all()
    return [
        {
            "user_id": app.user.id if app.user else None,  # user_id 추가
            "user_name": app.user.name if app.user else None,
            "written_test_score": app.written_test_score,
        }
        for app in passed_apps
    ]

@router.get('/written-test/failed/{jobpost_id}')
def get_written_test_failed_applicants(jobpost_id: int, db: Session = Depends(get_db)):
    from app.models.application import Application, WrittenTestStatus
    failed_apps = db.query(Application).filter(
        Application.job_post_id == jobpost_id,
        Application.written_test_status == WrittenTestStatus.FAILED
    ).all()
    return [
        {
            "id": app.id,  # 지원자 ID 추가
            "user_id": app.user.id if app.user else None,
            "user_name": app.user.name if app.user else None,
            "written_test_score": app.written_test_score,
            "evaluation_date": app.applied_at.strftime('%Y-%m-%d') if app.applied_at else None,
        }
        for app in failed_apps
    ]

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
    application.written_test_status = getattr(WrittenTestStatus, req.status)
    application.written_test_score = req.score
    db.commit()
    return {"message": "Written test status and score updated successfully."}