#!/usr/bin/env python3
"""
이력서 기반 평가 기준 일괄 생성 스크립트
특정 공고의 모든 지원자 이력서에 대해 평가 기준을 생성합니다.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_db
from app.models.application import Application
from app.models.resume import Resume, Spec
from app.models.job import JobPost
from app.models.evaluation_criteria import EvaluationCriteria
from app.services.evaluation_criteria_service import EvaluationCriteriaService
from app.schemas.evaluation_criteria import EvaluationCriteriaCreate
from agent.agents.interview_question_node import suggest_evaluation_criteria
import asyncio
from typing import List, Dict, Any

def combine_resume_and_specs(resume: Resume, specs: List[Spec]) -> str:
    """이력서와 스펙 정보를 결합하여 텍스트 생성"""
    # 사용자 정보 가져오기
    user_info = ""
    if resume.user:
        user_info = f"""
지원자 정보:
이름: {resume.user.name or "미지정"}
이메일: {resume.user.email or "미지정"}
전화번호: {resume.user.phone or "미지정"}
주소: {resume.user.address or "미지정"}
"""
    
    resume_text = f"""
{user_info}
이력서 제목: {resume.title or "미지정"}
이력서 내용:
{resume.content or "이력서 내용 없음"}
"""
    
    # 스펙 정보 추가
    if specs:
        spec_categories = {}
        for spec in specs:
            spec_type = spec.spec_type
            if spec_type not in spec_categories:
                spec_categories[spec_type] = []
            spec_categories[spec_type].append(spec)
        
        # 프로젝트 정보 (우선순위 높음)
        if "project" in spec_categories or "프로젝트" in spec_categories:
            projects = spec_categories.get("project", []) + spec_categories.get("프로젝트", [])
            resume_text += "\n\n주요 프로젝트 경험:\n"
            for i, project in enumerate(projects, 1):
                resume_text += f"{i}. {project.spec_title}\n"
                if project.spec_description:
                    resume_text += f"   {project.spec_description}\n"
        
        # 교육사항
        if "education" in spec_categories or "교육" in spec_categories:
            educations = spec_categories.get("education", []) + spec_categories.get("교육", [])
            resume_text += "\n\n교육사항:\n"
            for education in educations:
                resume_text += f"- {education.spec_title}\n"
                if education.spec_description:
                    resume_text += f"  {education.spec_description}\n"
        
        # 자격증
        if "certificate" in spec_categories or "자격증" in spec_categories:
            certificates = spec_categories.get("certificate", []) + spec_categories.get("자격증", [])
            resume_text += "\n\n자격증:\n"
            for cert in certificates:
                resume_text += f"- {cert.spec_title}\n"
                if cert.spec_description:
                    resume_text += f"  {cert.spec_description}\n"
        
        # 기술스택
        if "skill" in spec_categories or "기술" in spec_categories:
            skills = spec_categories.get("skill", []) + spec_categories.get("기술", [])
            resume_text += "\n\n기술 스택:\n"
            for skill in skills:
                resume_text += f"- {skill.spec_title}\n"
                if skill.spec_description:
                    resume_text += f"  {skill.spec_description}\n"
        
        # 기타 스펙들
        other_specs = []
        for spec_type, specs_list in spec_categories.items():
            if spec_type not in ["project", "프로젝트", "education", "교육", "certificate", "자격증", "skill", "기술"]:
                other_specs.extend(specs_list)
        
        if other_specs:
            resume_text += "\n\n기타 경험:\n"
            for spec in other_specs:
                resume_text += f"- {spec.spec_title} ({spec.spec_type})\n"
                if spec.spec_description:
                    resume_text += f"  {spec.spec_description}\n"
    
    return resume_text.strip()

def parse_job_post_data(job_post: JobPost) -> str:
    """JobPost 데이터를 파싱하여 직무 정보 텍스트 생성"""
    job_info = f"""
공고 제목: {job_post.title}
부서: {job_post.department or "미지정"}

자격요건:
{job_post.qualifications or "자격요건 정보 없음"}

직무 내용:
{job_post.job_details or "직무 내용 정보 없음"}

근무 조건:
{job_post.conditions or "근무 조건 정보 없음"}

채용 절차:
{job_post.procedures or "채용 절차 정보 없음"}

근무지: {job_post.location or "미지정"}
고용형태: {job_post.employment_type or "미지정"}
모집인원: {job_post.headcount or "미지정"}명
"""
    return job_info.strip()

async def generate_evaluation_criteria_for_resume(
    resume: Resume, 
    specs: List[Spec], 
    job_post: JobPost, 
    interview_stage: str,
    criteria_service: EvaluationCriteriaService,
    db
) -> Dict[str, Any]:
    """단일 이력서에 대한 평가 기준 생성"""
    try:
        print(f"🔄 {resume.title} ({resume.id}) - {interview_stage} 면접 평가 기준 생성 중...")
        
        # 이력서 텍스트 생성
        resume_text = combine_resume_and_specs(resume, specs)
        job_info = parse_job_post_data(job_post)
        
        # 면접 단계별 평가 기준 생성
        if interview_stage == 'practical':
            # 실무진 면접: 기술적 역량 중심
            criteria_result = suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=job_post.company.name if job_post.company else "회사",
                focus_area="technical_skills"  # 기술적 역량 중심
            )
        elif interview_stage == 'executive':
            # 임원진 면접: 인성/리더십 중심
            criteria_result = suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=job_post.company.name if job_post.company else "회사",
                focus_area="leadership_potential"  # 리더십/인성 중심
            )
        else:
            # 기본: 종합적 평가
            criteria_result = suggest_evaluation_criteria(
                resume_text=resume_text,
                job_info=job_info,
                company_name=job_post.company.name if job_post.company else "회사"
            )
        
        # 기존 데이터 확인
        existing_criteria = criteria_service.get_evaluation_criteria_by_resume(
            resume.id, 
            None,  # application_id는 None
            interview_stage
        )
        
        # application_id 찾기 (resume_id로 매핑)
        application = db.query(Application).filter(Application.resume_id == resume.id).first()
        application_id = application.id if application else None
        
        # 기존 데이터가 있으면 스킵
        if existing_criteria:
            print(f"  ⏭️ {resume.title} ({interview_stage}) - 기존 데이터 존재, 스킵")
            return {
                "resume_id": resume.id,
                "resume_name": resume.title,
                "application_id": application_id,
                "job_post_id": job_post.id,
                "interview_stage": interview_stage,
                "status": "skipped",
                "message": "기존 데이터가 이미 존재합니다."
            }
        
        # LangGraph 결과를 스키마에 맞게 변환
        suggested_criteria = []
        for item in criteria_result.get("suggested_criteria", []):
            if isinstance(item, dict):
                suggested_criteria.append({
                    "criterion": item.get("criterion", ""),
                    "description": item.get("description", ""),
                    "max_score": item.get("max_score", 10)
                })
        
        weight_recommendations = []
        for item in criteria_result.get("weight_recommendations", []):
            if isinstance(item, dict):
                weight_recommendations.append({
                    "criterion": item.get("criterion", ""),
                    "weight": float(item.get("weight", 0.0)),
                    "reason": item.get("reason", "")
                })
        
        evaluation_questions = criteria_result.get("evaluation_questions", [])
        if not isinstance(evaluation_questions, list):
            evaluation_questions = []
        
        scoring_guidelines = criteria_result.get("scoring_guidelines", {})
        if not isinstance(scoring_guidelines, dict):
            scoring_guidelines = {}
        
        # evaluation_items 처리 (새로운 구체적 평가 항목)
        evaluation_items = criteria_result.get("evaluation_items", [])
        if not isinstance(evaluation_items, list):
            evaluation_items = []
        
        criteria_data = EvaluationCriteriaCreate(
            job_post_id=job_post.id,  # 공고 ID 추가
            resume_id=resume.id,
            application_id=application_id,  # application_id 매핑
            evaluation_type="resume_based",
            interview_stage=interview_stage,  # 면접 단계 추가
            company_name=job_post.company.name if job_post.company else "회사",
            suggested_criteria=suggested_criteria,
            weight_recommendations=weight_recommendations,
            evaluation_questions=evaluation_questions,
            scoring_guidelines=scoring_guidelines,
            evaluation_items=evaluation_items
        )
        
        # 새로 생성 (기존 데이터는 이미 스킵됨)
        criteria_service.create_evaluation_criteria(criteria_data)
        print(f"✅ {resume.title} (resume_id: {resume.id}, application_id: {application_id}) - {interview_stage} 면접 평가 기준 생성 완료")
        
        return {
            "resume_id": resume.id,
            "resume_name": resume.title,
            "application_id": application_id,
            "job_post_id": job_post.id,
            "interview_stage": interview_stage,
            "status": "success"
        }
        
    except Exception as e:
        print(f"❌ {resume.title} ({resume.id}) - {interview_stage} 면접 평가 기준 생성 실패: {str(e)}")
        return {
            "resume_id": resume.id,
            "resume_name": resume.title,
            "interview_stage": interview_stage,
            "status": "error",
            "error": str(e)
        }

async def generate_job_based_evaluation_criteria(job_post_id: int, interview_stages: List[str] = None):
    """공고 기반 평가 기준 생성 (한 번만 실행)"""
    if interview_stages is None:
        interview_stages = ['practical', 'executive']
    
    db = next(get_db())
    criteria_service = EvaluationCriteriaService(db)
    
    try:
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            print(f"❌ 공고 ID {job_post_id}를 찾을 수 없습니다.")
            return
        
        print(f"🎯 공고 기반 평가 기준 생성: {job_post.title} (ID: {job_post_id})")
        
        for interview_stage in interview_stages:
            try:
                # 기존 job_based 데이터 확인
                existing_criteria = db.query(EvaluationCriteria).filter(
                    EvaluationCriteria.job_post_id == job_post_id,
                    EvaluationCriteria.evaluation_type == "job_based",
                    EvaluationCriteria.interview_stage == interview_stage
                ).first()
                
                if existing_criteria:
                    print(f"  ⏭️ {interview_stage} job_based 평가 기준이 이미 존재합니다. 스킵합니다.")
                    continue
                
                print(f"  🔄 {interview_stage} job_based 평가 기준 생성 중...")
                
                # 공고 정보로 평가 기준 생성
                job_info = parse_job_post_data(job_post)
                
                if interview_stage == 'practical':
                    criteria_result = suggest_evaluation_criteria(
                        resume_text="",  # 이력서 없이 공고만으로
                        job_info=job_info,
                        company_name=job_post.company.name if job_post.company else "회사",
                        focus_area="technical_skills"
                    )
                elif interview_stage == 'executive':
                    criteria_result = suggest_evaluation_criteria(
                        resume_text="",  # 이력서 없이 공고만으로
                        job_info=job_info,
                        company_name=job_post.company.name if job_post.company else "회사",
                        focus_area="leadership_potential"
                    )
                
                # 데이터 변환 및 저장
                suggested_criteria = []
                for item in criteria_result.get("suggested_criteria", []):
                    if isinstance(item, dict):
                        suggested_criteria.append({
                            "criterion": item.get("criterion", ""),
                            "description": item.get("description", ""),
                            "max_score": item.get("max_score", 10)
                        })
                
                weight_recommendations = []
                for item in criteria_result.get("weight_recommendations", []):
                    if isinstance(item, dict):
                        weight_recommendations.append({
                            "criterion": item.get("criterion", ""),
                            "weight": float(item.get("weight", 0.0)),
                            "reason": item.get("reason", "")
                        })
                
                evaluation_questions = criteria_result.get("evaluation_questions", [])
                if not isinstance(evaluation_questions, list):
                    evaluation_questions = []
                
                scoring_guidelines = criteria_result.get("scoring_guidelines", {})
                if not isinstance(scoring_guidelines, dict):
                    scoring_guidelines = {}
                
                evaluation_items = criteria_result.get("evaluation_items", [])
                if not isinstance(evaluation_items, list):
                    evaluation_items = []
                
                criteria_data = EvaluationCriteriaCreate(
                    job_post_id=job_post.id,
                    resume_id=None,  # job_based는 resume_id 없음
                    application_id=None,  # job_based는 application_id 없음
                    evaluation_type="job_based",
                    interview_stage=interview_stage,
                    company_name=job_post.company.name if job_post.company else "회사",
                    suggested_criteria=suggested_criteria,
                    weight_recommendations=weight_recommendations,
                    evaluation_questions=evaluation_questions,
                    scoring_guidelines=scoring_guidelines,
                    evaluation_items=evaluation_items
                )
                
                criteria_service.create_evaluation_criteria(criteria_data)
                print(f"  ✅ {interview_stage} job_based 평가 기준 생성 완료")
                
            except Exception as e:
                print(f"  ❌ {interview_stage} job_based 평가 기준 생성 실패: {str(e)}")
                db.rollback()
        
        db.commit()
        print("🎉 공고 기반 평가 기준 생성 완료")
        
    except Exception as e:
        print(f"❌ 공고 기반 평가 기준 생성 중 오류: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

async def generate_evaluation_criteria_for_job_post(job_post_id: int, interview_stages: List[str] = None, all_applicants: bool = False, start_from: int = 1):
    """특정 공고의 모든 지원자 이력서에 대해 평가 기준 생성"""
    if interview_stages is None:
        interview_stages = ['practical', 'executive']  # 기본값: 실무진, 임원진
    
    db = next(get_db())
    criteria_service = EvaluationCriteriaService(db)
    
    try:
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            print(f"❌ 공고 ID {job_post_id}를 찾을 수 없습니다.")
            return
        
        print(f"🎯 공고: {job_post.title} (ID: {job_post_id})")
        print(f"📋 생성할 면접 단계: {', '.join(interview_stages)}")
        
        # 지원자 조회 (서류 통과 여부에 따라 필터링)
        from app.models.application import DocumentStatus
        if all_applicants:
            applications = db.query(Application).filter(
                Application.job_post_id == job_post_id
            ).all()
            print(f"👥 총 {len(applications)}명의 모든 지원자 발견")
        else:
            applications = db.query(Application).filter(
                Application.job_post_id == job_post_id,
                Application.document_status == DocumentStatus.PASSED
            ).all()
            print(f"👥 총 {len(applications)}명의 서류 통과 지원자 발견")
        
        if not applications:
            print(f"❌ 공고 ID {job_post_id}에 대상 지원자가 없습니다.")
            return
        
        # 시작 지점 조정
        if start_from > 1:
            print(f"🔄 {start_from}번째 지원자부터 시작합니다.")
            applications = applications[start_from-1:]
        
        results = []
        
        for i, application in enumerate(applications, start_from):
            try:
                print(f"\n🔄 처리 중... ({i}/{len(applications)})")
                
                # 지원자의 이력서 조회
                resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
                if not resume:
                    print(f"⚠️ 지원자 {application.id}의 이력서를 찾을 수 없습니다.")
                    continue
                
                # 이력서의 스펙 정보 조회
                specs = db.query(Spec).filter(Spec.resume_id == resume.id).all()
                
                # 각 면접 단계별로 평가 기준 생성
                for interview_stage in interview_stages:
                    try:
                        result = await generate_evaluation_criteria_for_resume(
                            resume, specs, job_post, interview_stage, criteria_service, db
                        )
                        results.append(result)
                        
                        # 중간 결과 출력
                        if result["status"] == "success":
                            print(f"  ✅ {resume.title} ({interview_stage}) - 생성 완료")
                        else:
                            print(f"  ❌ {resume.title} ({interview_stage}) - 생성 실패: {result.get('error', 'Unknown error')}")
                    
                    except Exception as e:
                        print(f"  ❌ {resume.title} ({interview_stage}) - 처리 중 오류: {str(e)}")
                        # 트랜잭션 롤백
                        db.rollback()
                        results.append({
                            "resume_id": resume.id,
                            "resume_name": resume.title,
                            "interview_stage": interview_stage,
                            "status": "error",
                            "error": str(e)
                        })
                
                # 주기적으로 커밋하여 메모리 관리
                if i % 10 == 0:
                    db.commit()
                    print(f"💾 중간 저장 완료 ({i}개 처리)")
            
            except Exception as e:
                print(f"❌ 지원자 {application.id} 처리 중 오류: {str(e)}")
                # 트랜잭션 롤백
                db.rollback()
                continue
        
        # 최종 커밋
        db.commit()
        
        # 결과 요약
        success_count = len([r for r in results if r["status"] == "success"])
        error_count = len([r for r in results if r["status"] == "error"])
        skipped_count = len([r for r in results if r["status"] == "skipped"])
        
        print(f"\n📊 생성 결과 요약:")
        print(f"✅ 성공: {success_count}개")
        print(f"❌ 실패: {error_count}개")
        print(f"⏭️ 스킵: {skipped_count}개")
        print(f"📝 총 처리: {len(results)}개")
        
        if error_count > 0:
            print(f"\n❌ 실패한 항목들:")
            for result in results:
                if result["status"] == "error":
                    print(f"  - {result['resume_name']} ({result['interview_stage']}): {result.get('error', 'Unknown error')}")
        
        return results
        
    except Exception as e:
        print(f"❌ 스크립트 실행 중 오류 발생: {str(e)}")
        # 트랜잭션 롤백
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='평가 기준 일괄 생성')
    parser.add_argument('job_post_id', type=int, help='공고 ID')
    parser.add_argument('--stages', nargs='+', choices=['practical', 'executive'], 
                       default=['practical', 'executive'], 
                       help='생성할 면접 단계 (기본값: practical executive)')
    parser.add_argument('--type', choices=['job_based', 'resume_based', 'both'], 
                       default='both', help='생성할 평가 기준 타입 (기본값: both)')
    parser.add_argument('--clear-cache', action='store_true', 
                       help='평가 기준 생성 전 캐시 클리어')
    parser.add_argument('--all-applicants', action='store_true', 
                       help='서류 통과 여부와 관계없이 모든 지원자 대상 (기본값: 서류 통과자만)')
    parser.add_argument('--start-from', type=int, default=1,
                       help='처리 시작할 지원자 순서 (기본값: 1, 중단 후 재시작용)')
    
    args = parser.parse_args()
    
    print("🚀 평가 기준 일괄 생성 시작")
    print(f"📋 공고 ID: {args.job_post_id}")
    print(f"📋 면접 단계: {', '.join(args.stages)}")
    print(f"📋 생성 타입: {args.type}")
    print(f"📋 대상 지원자: {'모든 지원자' if args.all_applicants else '서류 통과자만'}")
    if args.start_from > 1:
        print(f"📋 시작 지점: {args.start_from}번째 지원자")
    
    # 캐시 클리어 옵션 처리
    if args.clear_cache:
        print("🗑️ 캐시 클리어 중...")
        try:
            from app.scripts.clear_evaluation_cache import clear_evaluation_cache
            clear_evaluation_cache()
            print("✅ 캐시 클리어 완료")
        except Exception as e:
            print(f"⚠️ 캐시 클리어 실패: {str(e)}")
    
    print("-" * 50)
    
    if args.type in ['job_based', 'both']:
        print("\n📋 1단계: 공고 기반 평가 기준 생성")
        asyncio.run(generate_job_based_evaluation_criteria(args.job_post_id, args.stages))
    
    if args.type in ['resume_based', 'both']:
        print("\n📋 2단계: 이력서 기반 평가 기준 생성")
        asyncio.run(generate_evaluation_criteria_for_job_post(args.job_post_id, args.stages, args.all_applicants, args.start_from))
    
    print("-" * 50)
    print("🎉 평가 기준 일괄 생성 완료")

if __name__ == "__main__":
    main() 