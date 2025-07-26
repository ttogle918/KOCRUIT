#!/usr/bin/env python3
"""
수동으로 몇 명의 지원자에게 AI 면접 질문을 생성하고 DB에 저장하는 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, InterviewStatus
from app.models.interview_question import InterviewQuestion, QuestionType
from app.api.v1.interview_question import parse_job_post_data
from agent.utils.resume_utils import combine_resume_and_specs
from app.models.resume import Resume, Spec

def generate_questions_manual():
    db = SessionLocal()
    try:
        print("=== 수동 질문 생성 시작 ===")
        
        # 공고 17 조회
        job = db.query(JobPost).filter(JobPost.id == 17).first()
        if not job:
            print("JobPost 17 not found")
            return
        
        print(f"공고: {job.title}")
        
        # 처음 3명의 지원자만 테스트
        test_applications = db.query(Application).filter(
            Application.job_post_id == 17
        ).limit(3).all()
        
        print(f"테스트할 지원자 수: {len(test_applications)}")
        
        # 공고 정보 파싱
        company_name = job.company.name if job.company else "KOSA공공"
        job_info = parse_job_post_data(job)
        
        total_saved = 0
        
        for app in test_applications:
            try:
                print(f"\n--- 지원자 {app.id} 처리 중 ---")
                
                # 이력서 정보 조회
                resume = db.query(Resume).filter(Resume.id == app.resume_id).first()
                if not resume:
                    print(f"  ❌ 이력서 없음 (resume_id: {app.resume_id})")
                    continue
                
                # Spec 정보 조회
                specs = db.query(Spec).filter(Spec.resume_id == app.resume_id).all()
                
                # 통합 이력서 텍스트 생성
                resume_text = combine_resume_and_specs(resume, specs)
                print(f"  ✅ 이력서 텍스트 생성 완료 ({len(resume_text)}자)")
                
                # LangGraph를 사용한 질문 생성
                import sys
                import os
                sys.path.append(os.path.join(os.path.dirname(__file__), '../../agent'))
                from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
                
                print("  🔄 LangGraph 워크플로우 실행 중...")
                workflow_result = generate_comprehensive_interview_questions(
                    resume_text=resume_text,
                    job_info=job_info,
                    company_name=company_name,
                    applicant_name=getattr(app, 'name', '') or '',
                    interview_type="ai"
                )
                
                if not workflow_result or "questions" not in workflow_result:
                    print(f"  ❌ 워크플로우 결과 없음")
                    continue
                
                questions = workflow_result.get("questions", [])
                question_bundle = workflow_result.get("question_bundle", {})
                
                print(f"  ✅ {len(questions)}개 질문 생성 완료")
                
                # DB에 질문 저장
                saved_count = 0
                for i, question_text in enumerate(questions):
                    try:
                        # 질문 타입 결정
                        question_type = QuestionType.PERSONAL
                        if i < 5:  # 처음 5개는 공통 질문으로 간주
                            question_type = QuestionType.COMMON
                        
                        # DB에 저장
                        db_question = InterviewQuestion(
                            application_id=app.id,
                            type=question_type,
                            question_text=question_text,
                            category="AI 면접 질문"
                        )
                        db.add(db_question)
                        saved_count += 1
                        
                    except Exception as e:
                        print(f"    ❌ 질문 {i+1} 저장 실패: {str(e)}")
                
                db.commit()
                total_saved += saved_count
                print(f"  ✅ {saved_count}개 질문 DB 저장 완료")
                
                # 체크리스트 관련 정보도 저장
                if "evaluation_tools" in workflow_result:
                    eval_tools = workflow_result["evaluation_tools"]
                    if "checklist" in eval_tools:
                        checklist = eval_tools["checklist"]
                        print(f"  📋 체크리스트 생성됨: {len(checklist.get('pre_interview_checklist', []))}개 항목")
                
            except Exception as e:
                print(f"  ❌ 지원자 {app.id} 처리 실패: {str(e)}")
                import traceback
                print(f"    상세 오류: {traceback.format_exc()}")
        
        print(f"\n=== 수동 질문 생성 완료 ===")
        print(f"총 저장된 질문 수: {total_saved}")
        
        return total_saved > 0
        
    except Exception as e:
        print(f"수동 질문 생성 중 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    generate_questions_manual() 