#!/usr/bin/env python3
"""
실무진 면접용 개인별 맞춤 질문 생성 스크립트
"""

import sys
import os
sys.path.append('/app')

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application
from app.models.interview_question import InterviewQuestion, QuestionType
from app.api.v1.interview_question import parse_job_post_data

def generate_personal_interview_questions():
    """실무진 면접용 개인별 맞춤 질문 생성 (application_id, resume 기반)"""
    db = SessionLocal()
    try:
        # 공고 17 조회
        job = db.query(JobPost).filter(JobPost.id == 17).first()
        if not job:
            print("JobPost 17 not found")
            return
        
        print(f"JobPost 17: {job.title}")
        
        # 공고 정보 파싱
        company_name = job.company.name if job.company else "KOSA공공"
        job_info = parse_job_post_data(job)
        
        # LangGraph 워크플로우 import
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), 'agent'))
        from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
        
        # 모든 지원자 조회
        applications = db.query(Application).filter(Application.job_post_id == 17).all()
        print(f"총 {len(applications)}명의 지원자에 대한 실무진 면접 질문 생성")
        
        total_questions = 0
        
        # 각 지원자에 대해 실무진 면접 질문 생성
        for app in applications:
            try:
                print(f"\n🔄 지원자 {app.id}에 대한 실무진 면접 질문 생성 중...")
                
                # 지원자의 이력서 정보 조회
                resume_text = ""
                if app.resume_id:
                    from app.models.resume import Resume
                    resume = db.query(Resume).filter(Resume.id == app.resume_id).first()
                    if resume and resume.content:
                        resume_text = resume.content
                        print(f"  📄 이력서 내용 길이: {len(resume_text)}자")
                    else:
                        print(f"  ⚠️ 이력서 내용이 없습니다. (resume_id: {app.resume_id})")
                else:
                    print(f"  ⚠️ 이력서 ID가 없습니다. (application_id: {app.id})")
                
                # LangGraph 워크플로우 실행 (실무진 면접용)
                workflow_result = generate_comprehensive_interview_questions(
                    resume_text=resume_text,
                    job_info=job_info,
                    company_name=company_name,
                    applicant_name="지원자",
                    interview_type="general"  # 실무진 면접용
                )
                
                # 결과에서 실무진 면접 질문 추출
                question_bundle = workflow_result.get("question_bundle", {})
                print(f"  🔍 LangGraph 결과: {list(question_bundle.keys())}")
                
                # 질문 개수 계산 및 저장
                questions_count = 0
                
                # 결과를 JSON 파일로 저장 (백업용)
                import json
                import os
                from datetime import datetime
                
                backup_data = {
                    "application_id": app.id,
                    "resume_id": app.resume_id,
                    "job_post_id": job.id,
                    "company_name": company_name,
                    "resume_text_length": len(resume_text),
                    "generated_at": datetime.now().isoformat(),
                    "question_bundle": question_bundle,
                    "resume_summary": workflow_result.get("resume_summary", ""),
                    "analysis_data": workflow_result.get("analysis_data", {})
                }
                
                # 백업 디렉토리 생성
                backup_dir = "/app/backup_interview_questions"
                os.makedirs(backup_dir, exist_ok=True)
                
                # JSON 파일로 저장
                backup_filename = f"{backup_dir}/personal_questions_app_{app.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(backup_filename, 'w', encoding='utf-8') as f:
                    json.dump(backup_data, f, ensure_ascii=False, indent=2)
                print(f"  💾 백업 파일 저장: {backup_filename}")
                
                # 개인별 맞춤 질문 (application_id 기반)
                personal_questions = question_bundle.get("personal", [])
                for question_text in personal_questions:
                    interview_question = InterviewQuestion(
                        application_id=app.id,
                        job_post_id=None,
                        company_id=None,
                        type=QuestionType.PERSONAL,  # 실무진 면접 (개인별 맞춤)
                        question_text=question_text,
                        category="personal_custom",
                        difficulty="medium"
                    )
                    db.add(interview_question)
                    questions_count += 1
                
                # 직무 맞춤 질문 (application_id + job_post_id 기반)
                job_questions = question_bundle.get("job", [])
                for question_text in job_questions:
                    interview_question = InterviewQuestion(
                        application_id=app.id,
                        job_post_id=job.id,
                        company_id=None,
                        type=QuestionType.JOB,  # 실무진 면접 (직무 맞춤)
                        question_text=question_text,
                        category="job_custom",
                        difficulty="medium"
                    )
                    db.add(interview_question)
                    questions_count += 1
                
                # 공통 질문 (application_id 기반)
                common_questions = question_bundle.get("common", [])
                for question_text in common_questions:
                    interview_question = InterviewQuestion(
                        application_id=app.id,
                        job_post_id=None,
                        company_id=None,
                        type=QuestionType.COMMON,  # 실무진 면접 (공통)
                        question_text=question_text,
                        category="common",
                        difficulty="medium"
                    )
                    db.add(interview_question)
                    questions_count += 1
                
                total_questions += questions_count
                print(f"  ✅ {questions_count}개 실무진 면접 질문 생성 완료")
                print(f"  📝 질문 카테고리: 개인별 맞춤 {len(personal_questions)}개, 직무 맞춤 {len(job_questions)}개, 공통 {len(common_questions)}개")
                    
            except Exception as e:
                print(f"  ❌ 지원자 {app.id} 실무진 면접 질문 생성 오류: {str(e)}")
                import traceback
                print(f"  상세 오류: {traceback.format_exc()}")
        
        db.commit()
        print(f"\n🎉 실무진 면접 개인별 맞춤 질문 생성 완료!")
        print(f"공고 {job.id}: {total_questions}개 실무진 면접 질문 생성")
        print(f"지원자 {len(applications)}명: 개인별 맞춤 질문 생성")
        
    except Exception as e:
        print(f"❌ 스크립트 실행 실패: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎯 실무진 면접 개인별 맞춤 질문 생성 시작!")
    generate_personal_interview_questions() 