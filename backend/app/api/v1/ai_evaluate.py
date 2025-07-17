from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import JobPost
from app.models.written_test_question import WrittenTestQuestion
from sqlalchemy.exc import SQLAlchemyError

# agent tool import
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../agent'))
from agent.tools.written_test_generation_tool import generate_written_test_questions

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

@router.post('/written-test/generate')
def generate_written_test(req: WrittenTestGenerateRequest, db: Session = Depends(get_db)):
    try:
        job_post = db.query(JobPost).filter(JobPost.id == req.jobPostId).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="JobPost not found")
        
        # JobPost 데이터를 dict로 변환
        jobpost_dict = {
            "title": job_post.title or "",
            "department": job_post.department or "",
            "qualifications": job_post.qualifications or "",
            "job_details": job_post.job_details or ""
        }
        
        questions = generate_written_test_questions(jobpost_dict)
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
        is_dev = any(k in (job_post.title or "") or k in (job_post.department or "") for k in dev_keywords)
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