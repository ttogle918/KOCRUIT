#!/usr/bin/env python3
"""
실무진 면접용 개인별 맞춤 질문 생성 스크립트
"""

import sys
import os
sys.path.append('/app')

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, InterviewStatus, DocumentStatus
from app.models.interview_question import InterviewQuestion, QuestionType
from app.api.v1.interview_question import parse_job_post_data

def clean_question_text(text: str) -> str:
    """질문 텍스트에서 설명 부분을 제거하고 순수 질문만 추출"""
    # 제거할 설명 패턴들
    remove_patterns = [
        "임원면접에서 사용할 수 있는 질문을 다음과 같이 구성했습니다:",
        "다음과 같이 구성했습니다:",
        "다음과 같은 질문들을 제안합니다:",
        "다음은 면접 질문들입니다:",
        "면접 질문을 다음과 같이 구성했습니다:",
        "질문을 다음과 같이 구성했습니다:",
        "다음 질문들을 사용하세요:",
        "다음과 같은 질문을 제안합니다:",
        "면접에서 다음과 같은 질문을 사용할 수 있습니다:",
        "다음 질문들을 면접에서 활용하세요:",
        "면접 질문 구성:",
        "질문 구성:",
        "면접 질문:",
        "질문:",
        "다음은",
        "다음과 같이",
        "다음과 같은",
        "면접에서 사용할 수 있는",
        "면접에서 활용할 수 있는",
        "면접에서 제안하는",
        "면접에서 추천하는"
    ]
    
    cleaned_text = text.strip()
    
    # 각 패턴을 제거
    for pattern in remove_patterns:
        if cleaned_text.startswith(pattern):
            cleaned_text = cleaned_text[len(pattern):].strip()
    
    # 숫자나 기호로 시작하는 경우 제거 (예: "1.", "1)", "-", "•")
    import re
    cleaned_text = re.sub(r'^[\d\-\•\*\.\)\s]+', '', cleaned_text).strip()
    
    # 빈 문자열이거나 너무 짧은 경우 제외
    if len(cleaned_text) < 10:
        return ""
    
    return cleaned_text

def filter_questions(questions) -> list:
    """질문 데이터에서 설명 텍스트를 제거하고 순수 질문만 필터링"""
    filtered_questions = []
    
    # 딕셔너리 형태인 경우 (personal, common 등)
    if isinstance(questions, dict):
        for category, question_list in questions.items():
            if isinstance(question_list, list):
                for question in question_list:
                    if isinstance(question, str):
                        cleaned_question = clean_question_text(question)
                        if cleaned_question:
                            filtered_questions.append(cleaned_question)
            elif isinstance(question_list, str):
                cleaned_question = clean_question_text(question_list)
                if cleaned_question:
                    filtered_questions.append(cleaned_question)
    
    # 리스트 형태인 경우
    elif isinstance(questions, list):
        for question in questions:
            if isinstance(question, str):
                cleaned_question = clean_question_text(question)
                if cleaned_question:
                    filtered_questions.append(cleaned_question)
            elif isinstance(question, dict) and 'question' in question:
                cleaned_question = clean_question_text(question['question'])
                if cleaned_question:
                    filtered_questions.append(cleaned_question)
    
    return filtered_questions

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
        
        # AI 면접 통과자만 조회 (실무진 면접 대상자)
        applications = db.query(Application).filter(
            Application.job_post_id == 17,
            Application.document_status == DocumentStatus.PASSED,  # 서류 합격자
            Application.interview_status == InterviewStatus.AI_INTERVIEW_PASSED  # AI 면접 통과자만
        ).all()
        print(f"총 {len(applications)}명의 AI 면접 통과자에 대한 실무진 면접 질문 생성")
        print(f"📋 조건: 서류 합격 + AI 면접 통과")
        
        total_questions = 0
        successful_applications = 0
        failed_applications = 0
        
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
                
                # 기존 질문이 있는지 확인
                existing_questions = db.query(InterviewQuestion).filter(
                    InterviewQuestion.application_id == app.id
                ).count()
                
                if existing_questions > 0:
                    print(f"  ⏭️ 지원자 {app.id}는 이미 {existing_questions}개의 질문이 존재합니다. 건너뜁니다.")
                    continue
                
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
                
                # 개인별 맞춤 질문 (application_id 기반) - 필터링 적용
                raw_personal = question_bundle.get("personal", {})
                print(f"  🔍 원본 personal 데이터 타입: {type(raw_personal)}")
                print(f"  🔍 원본 personal 데이터: {raw_personal}")
                
                personal_questions = filter_questions(raw_personal)
                print(f"  🔍 필터링된 personal 질문: {len(personal_questions)}개")
                
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
                
                # 직무 맞춤 질문 (application_id + job_post_id 기반) - 필터링 적용
                job_questions = filter_questions(question_bundle.get("job", []))
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
                
                # 공통 질문 (application_id 기반) - 필터링 적용
                common_questions = filter_questions(question_bundle.get("common", []))
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
                print(f"  ✅ {questions_count}개 실무진 면접 질문 생성 완료 (필터링 적용)")
                print(f"  📝 질문 카테고리: 개인별 맞춤 {len(personal_questions)}개, 직무 맞춤 {len(job_questions)}개, 공통 {len(common_questions)}개")
                print(f"  🧹 설명 텍스트 제거 및 순수 질문만 저장됨")
                
                # 각 지원자마다 개별 커밋
                db.commit()
                print(f"  💾 지원자 {app.id} 질문 DB 저장 완료")
                successful_applications += 1
                    
            except Exception as e:
                print(f"  ❌ 지원자 {app.id} 실무진 면접 질문 생성 오류: {str(e)}")
                import traceback
                print(f"  상세 오류: {traceback.format_exc()}")
                # 해당 지원자만 롤백
                db.rollback()
                print(f"  🔄 지원자 {app.id} 롤백 완료")
                failed_applications += 1
        
        print(f"\n🎉 실무진 면접 개인별 맞춤 질문 생성 완료!")
        print(f"📊 결과 요약:")
        print(f"  - 공고 {job.id}: {total_questions}개 실무진 면접 질문 생성")
        print(f"  - 성공한 지원자: {successful_applications}명")
        print(f"  - 실패한 지원자: {failed_applications}명")
        print(f"  - 총 대상 지원자: {len(applications)}명")
        
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