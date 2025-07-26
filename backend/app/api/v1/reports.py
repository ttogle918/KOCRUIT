from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import tempfile
from weasyprint import HTML
from jinja2 import Template
import json
from langchain_openai import ChatOpenAI
import re
from pydantic import BaseModel
from app.core.config import settings

from app.core.database import get_db
from app.models.application import Application, ApplyStatus
from app.models.job import JobPost
from app.models.resume import Resume
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.models.written_test_answer import WrittenTestAnswer
from app.models.interview_evaluation import InterviewEvaluation, EvaluationType
from app.models.schedule import AIInterviewSchedule
from app.schemas.report import DocumentReportResponse, WrittenTestReportResponse

router = APIRouter()

# LLM을 이용한 탈락 사유 TOP3 추출 함수

def extract_top3_rejection_reasons_llm(fail_reasons: list[str]) -> list[str]:
    if not fail_reasons:
        print("[LLM-탈락사유] 불합격자 사유 없음, 빈 리스트 반환")
        return []
    prompt = f"""
아래는 한 채용 공고에 지원한 불합격자들의 불합격 사유입니다.

{chr(10).join(fail_reasons)}

이 사유들을 분석해서, 절대 원문을 복사하지 말고, 
비슷한 사유는 하나로 묶어서, 가장 많이 언급된 탈락 사유 TOP3를 한글 '키워드' 또는 '짧은 문장'(15자 이내)으로만 뽑아줘.
만약 원문을 복사하면 0점 처리된다. 반드시 아래 예시처럼만 출력해라.

예시1: [\"정보처리기사 자격증 없음\", \"경력 부족\", \"SI/SM 프로젝트 경험 부족\"]
예시2: [\"PM 경력 부족\", \"자격증 미보유\", \"실무 경험 부족\"]
예시3: [\"경력 부족\", \"자격증 없음\", \"프로젝트 경험 부족\"]

응답은 반드시 JSON 배열로만 출력해라.
"""
    print("[LLM-탈락사유] 프롬프트:\n", prompt)
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)
    try:
        response = llm.invoke(prompt)
        print("[LLM-탈락사유] LLM 응답:", response.content)
        import json, re
        match = re.search(r'\[.*\]', response.content, re.DOTALL)
        if match:
            result = json.loads(match.group(0))
            print("[LLM-탈락사유] 파싱된 TOP3:", result)
            return result
        result = [line.strip('-•123. ').strip() for line in response.content.strip().split('\n') if line.strip()]
        print("[LLM-탈락사유] fallback 파싱 TOP3:", result)
        return result
    except Exception as e:
        print(f"[LLM-탈락사유] LLM 탈락 사유 TOP3 추출 오류: {e}")
        return []

def extract_passed_summary_llm(pass_reasons: list[str]) -> str:
    if not pass_reasons:
        return ""
    prompt = f"""
아래는 이번 채용에서 합격한 지원자들의 합격 사유입니다.

{chr(10).join(pass_reasons)}

이 내용을 바탕으로, 이번 채용에서 어떤 유형/능력의 인재가 합격했는지 한글로 2~3문장으로 요약해줘.
예시: \"실무 경험과 자격증을 고루 갖춘 지원자가 선발되었습니다. PM 경력과 정보처리기사 자격증 보유가 주요 합격 요인으로 작용했습니다.\"
"""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
    try:
        response = llm.invoke(prompt)
        return response.content.strip()
    except Exception as e:
        print(f"[LLM-합격자요약] 오류: {e}")
        return ""



@router.get("/document")
async def get_document_report_data(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
        
        # 지원자 정보 조회
        applications = db.query(Application).filter(Application.job_post_id == job_post_id).all()
        
        # 통계 계산
        total_applicants = len(applications)
        if total_applicants == 0:
            return {
                "job_post": {
                    "title": job_post.title,
                    "department": job_post.department,
                    "position": job_post.title,
                    "recruit_count": job_post.headcount,
                    "start_date": job_post.start_date,
                    "end_date": job_post.end_date
                },
                "stats": {
                    "total_applicants": 0,
                    "avg_score": 0,
                    "max_score": 0,
                    "min_score": 0,
                    "top_rejection_reasons": [],
                    "applicants": []
                }
            }
        
        # 점수 통계
        scores = [float(app.ai_score) for app in applications if app.ai_score is not None]
        avg_score = sum(scores) / len(scores) if scores else 0
        max_score = max(scores) if scores else 0
        min_score = min(scores) if scores else 0   
        # 서류 합격자 인원수
        passed_applicants_count = sum(1 for app in applications if app.status == ApplyStatus.PASSED)
        
        # 탈락 사유 분석
        rejection_reasons = []
        for app in applications:
            if app.status == ApplyStatus.REJECTED and app.fail_reason:
                rejection_reasons.append(app.fail_reason)

        # LLM을 이용한 TOP3 추출
        if rejection_reasons:
            top_reasons = extract_top3_rejection_reasons_llm(rejection_reasons)
        else:
            top_reasons = []
        
        # 지원자 상세 정보
        applicants_data = []
        passed_reasons = []
        for app in applications:
            resume = db.query(Resume).filter(Resume.id == app.resume_id).first()
            user = db.query(User).filter(User.id == app.user_id).first()
            if resume and user:
                # Spec 정보 집계
                education = next((s.spec_title for s in resume.specs if s.spec_type == "학력"), "")
                experience = sum(1 for s in resume.specs if s.spec_type == "경력")
                certificates = sum(1 for s in resume.specs if s.spec_type == "자격증")
                if app.status == ApplyStatus.PASSED and app.pass_reason:
                    passed_reasons.append(app.pass_reason)
                if app.status == ApplyStatus.REJECTED and app.fail_reason:
                    rejection_reasons.append(app.fail_reason)
                if app.status == ApplyStatus.PASSED:
                    evaluation_comment = app.pass_reason or ""
                elif app.status == ApplyStatus.REJECTED:
                    evaluation_comment = app.fail_reason or ""
                else:
                    evaluation_comment = ""
                applicants_data.append({
                    "name": user.name,
                    "ai_score": float(app.ai_score) if app.ai_score is not None else 0,
                    "total_score": float(app.final_score) if app.final_score is not None else 0,
                    "status": app.status.value if hasattr(app.status, 'value') else str(app.status),
                    "evaluation_comment": evaluation_comment
                })
        passed_summary = extract_passed_summary_llm(passed_reasons)
        # 합격/불합격자 분리
        passed_applicants = [a for a in applicants_data if a['status'] == 'PASSED']
        rejected_applicants = [a for a in applicants_data if a['status'] == 'REJECTED']
        return {
            "job_post": {
                "title": job_post.title,
                "department": job_post.department,
                "position": job_post.title,
                "recruit_count": job_post.headcount,
                "start_date": job_post.start_date,
                "end_date": job_post.end_date
            },
            "stats": {
                "total_applicants": total_applicants,
                "avg_score": round(avg_score, 1),
                "max_score": max_score,
                "min_score": min_score,
                "passed_applicants_count": passed_applicants_count,
                "top_rejection_reasons": top_reasons,
                "passed_summary": passed_summary,
                "applicants": applicants_data,
                "passed_applicants": passed_applicants,
                "rejected_applicants": rejected_applicants
            }
        }
    except Exception as e:
        print(f"서류 보고서 생성 중 에러 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서류 보고서 생성 중 오류가 발생했습니다: {str(e)}")

@router.get("/document/pdf")
async def download_document_report_pdf(
    job_post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 보고서 데이터 조회
        report_data = await get_document_report_data(job_post_id, db, current_user)
        
        # HTML 템플릿
        html_template = """<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>서류 전형 보고서</title>
            <style>
                body { font-family: 'Malgun Gothic', sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 25px; }
                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                .stat-box { border: 1px solid #ddd; padding: 15px; text-align: center; }
                .stat-number { font-size: 24px; font-weight: bold; color: #256380; }
                .stat-label { font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f8f9fa; font-weight: bold; }
                .rejection-reasons { margin: 20px 0; }
                .reason-item { margin: 5px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="white-space:pre-line;">{{ job_post.title }}\n서류 전형 보고서</h1>
                <p>모집 기간: {{ job_post.start_date }} ~ {{ job_post.end_date }}</p>
                <p>모집 부서: {{ job_post.department }} | 직무: {{ job_post.position }} | 채용 인원: {{ job_post.recruit_count }}명</p>
            </div>
            
            <div class="section">
                <h2>📊 지원자 통계</h2>
                <div class="stats-grid" style="grid-template-columns: repeat(5, 1fr);">
                    <div class="stat-box">
                        <div class="stat-number">{{ stats.total_applicants }}</div>
                        <div class="stat-label">전체 지원자</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">{{ stats.passed_applicants_count }}</div>
                        <div class="stat-label">서류 합격자</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">{{ stats.avg_score }}</div>
                        <div class="stat-label">평균 점수</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">{{ stats.max_score }}</div>
                        <div class="stat-label">최고 점수</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">{{ stats.min_score }}</div>
                        <div class="stat-label">최저 점수</div>
                    </div>
                </div>
            </div>
            
            {% if stats.passed_summary %}
            <div class="section">
                <h2>✅ 합격자 요약</h2>
                <div style="background:#e0e7ff;padding:16px 24px;border-radius:8px;font-size:18px;font-weight:600;color:#2563eb;">
                    {{ stats.passed_summary }}
                </div>
            </div>
            {% endif %}
            {% if stats.top_rejection_reasons %}
            <div class="section">
                <h2>🧾 탈락 사유 요약</h2>
                <div class="rejection-reasons">
                    {% for reason in stats.top_rejection_reasons %}
                    <div class="reason-item">• {{ reason }}</div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}
            
            <div class="section">
                <h2>🟦 합격자 목록</h2>
                <table>
                    <thead>
                        <tr>
                            <th style="min-width:60px">성명</th>
                            <th style="min-width:60px">총점</th>
                            <th style="min-width:60px">결과</th>
                            <th style="min-width:140px">평가 코멘트</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for applicant in stats.passed_applicants %}
                        <tr>
                            <td style="min-width:60px">{{ applicant.name }}</td>
                            <td style="min-width:60px">{{ (applicant.ai_score if applicant.ai_score is not none and applicant.ai_score != 0 else applicant.total_score)|round|int }}</td>
                            <td style="min-width:60px">합격</td>
                            <td style="min-width:140px">{{ applicant.evaluation_comment }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            <div class="section">
                <h2>🟥 불합격자 목록</h2>
                <table>
                    <thead>
                        <tr>
                            <th style="min-width:60px">성명</th>
                            <th style="min-width:60px">총점</th>
                            <th style="min-width:60px">결과</th>
                            <th style="min-width:140px">평가 코멘트</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for applicant in stats.rejected_applicants %}
                        <tr>
                            <td style="min-width:60px">{{ applicant.name }}</td>
                            <td style="min-width:60px">{{ (applicant.ai_score if applicant.ai_score is not none and applicant.ai_score != 0 else applicant.total_score)|round|int }}</td>
                            <td style="min-width:60px">불합격</td>
                            <td style="min-width:140px">{{ applicant.evaluation_comment }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
        </body>
        </html>"""
        
        # HTML 렌더링
        template = Template(html_template)
        rendered_html = template.render(**report_data)
        
        # PDF 생성
        # ⚠️ 한글 폰트가 서버에 설치되어 있어야 한글이 깨지지 않습니다. (예: Malgun Gothic)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            HTML(string=rendered_html).write_pdf(tmp.name)
            return FileResponse(
                path=tmp.name,
                filename=f"서류전형_보고서_{report_data['job_post']['title']}.pdf",
                media_type="application/pdf"
            )
    except Exception as e:
        print(f"PDF 생성 중 에러 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF 생성 중 오류가 발생했습니다: {str(e)}")

class ComprehensiveEvaluationRequest(BaseModel):
    job_post_id: int
    applicant_name: str

@router.post("/comprehensive-evaluation")
async def generate_comprehensive_evaluation(
    request: ComprehensiveEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job_post_id = request.job_post_id
    applicant_name = request.applicant_name
    """
    GPT-4o-mini를 사용하여 지원자의 서류 평가, 필기 점수, 면접 평가를 종합한 최종 평가 코멘트 생성
    """
    try:
        # 1. 서류 평가 코멘트 조회
        application = db.query(Application).join(User).filter(
            Application.job_post_id == job_post_id,
            User.name == applicant_name
        ).first()
        
        if not application:
            raise HTTPException(status_code=404, detail="지원자 정보를 찾을 수 없습니다.")
        
        # 서류 평가 코멘트: pass_reason 또는 fail_reason 사용
        if application.status == ApplyStatus.PASSED and application.pass_reason:
            document_comment = application.pass_reason
        elif application.status == ApplyStatus.REJECTED and application.fail_reason:
            document_comment = application.fail_reason
        else:
            document_comment = "서류 평가 코멘트 없음"
        
        # 2. 필기 점수 조회
        written_test = db.query(WrittenTestAnswer).filter(
            WrittenTestAnswer.user_id == application.user_id,
            WrittenTestAnswer.jobpost_id == application.job_post_id
        ).first()
        
        written_score = written_test.score if written_test else "필기 점수 없음"
        
        # 3. 면접 평가 코멘트 조회 (여러 단계 종합)
        # AI 면접 일정을 통해 면접 평가 조회
        ai_interview_schedule = db.query(AIInterviewSchedule).filter(
            AIInterviewSchedule.application_id == application.id
        ).first()
        
        interview_comments = []
        
        if ai_interview_schedule:
            # AI 면접 평가 조회
            ai_evaluation = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id == ai_interview_schedule.id,
                InterviewEvaluation.evaluation_type == EvaluationType.AI
            ).first()
            
            if ai_evaluation and ai_evaluation.summary:
                interview_comments.append(f"AI 면접: {ai_evaluation.summary}")
            
            # 실무진 면접 평가 조회
            practical_evaluation = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id == ai_interview_schedule.id,
                InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
            ).first()
            
            if practical_evaluation and practical_evaluation.summary:
                interview_comments.append(f"실무진 면접: {practical_evaluation.summary}")
            
            # 임원진 면접 평가 조회
            executive_evaluation = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id == ai_interview_schedule.id,
                InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
            ).first()
            
            if executive_evaluation and executive_evaluation.summary:
                interview_comments.append(f"임원진 면접: {executive_evaluation.summary}")
        
        # 면접 코멘트 종합
        if interview_comments:
            interview_comment = " | ".join(interview_comments)
        else:
            interview_comment = "면접 평가 코멘트 없음"
        
        # 4. GPT-4o-mini를 사용한 종합 평가 생성 (LangChain 패턴)
        prompt = f"""
다음은 한 지원자의 채용 과정에서의 평가 정보입니다. 이 정보를 종합하여 최종 평가 코멘트를 작성해주세요.

**지원자**: {applicant_name}

**서류 평가 코멘트**: {document_comment}

**필기 점수**: {written_score}

**면접 평가 코멘트**: {interview_comment}

위의 세 가지 평가 정보를 종합하여, 해당 지원자의 전반적인 역량과 적합성을 평가하는 최종 코멘트를 작성해주세요. 
다음 사항을 고려해주세요:
- 각 단계별 평가의 일관성
- 지원자의 강점과 개선점
- 최종 선발 결정에 대한 근거
- 향후 성장 가능성

답변은 한국어로 작성하고, 200-300자 내외로 작성해주세요.
"""

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        response = llm.invoke(prompt)
        comprehensive_comment = response.content.strip()
        
        return {
            "applicant_name": applicant_name,
            "comprehensive_evaluation": comprehensive_comment,
            "source_data": {
                "document_comment": document_comment,
                "written_score": written_score,
                "interview_comment": interview_comment
            }
        }
        
    except HTTPException:
        # Re-raise HTTPExceptions as-is to preserve status codes
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"종합 평가 생성 중 오류가 발생했습니다: {str(e)}")

 