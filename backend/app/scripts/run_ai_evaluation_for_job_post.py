#!/usr/bin/env python3
"""
특정 공고의 모든 지원자에 대해 AI 면접 평가 실행 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.job import JobPost
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.user import User
from app.models.interview_evaluation import InterviewEvaluation
from app.services.ai_interview_evaluation_service import AiInterviewEvaluationService

def run_ai_evaluation_for_job_post(job_post_id: int):
    """특정 공고의 모든 지원자에 대해 AI 면접 평가 실행"""
    db = next(get_db())
    
    try:
        print(f"=== 공고 ID {job_post_id} AI 면접 평가 실행 ===\n")
        
        # 공고 정보 조회
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            print(f"❌ 공고 ID {job_post_id}를 찾을 수 없습니다.")
            return
        
        print(f"📋 공고: {job_post.title}")
        print(f"🏢 회사: {job_post.company.name if job_post.company else 'Unknown'}\n")
        
        # 해당 공고의 모든 지원자 조회 (서류 합격자)
        applications = db.query(Application).filter(
            Application.job_post_id == job_post_id,
            Application.document_status == DocumentStatus.PASSED
        ).all()
        
        print(f"📊 서류 합격자 수: {len(applications)}")
        
        if len(applications) == 0:
            print("❌ 서류 합격자가 없습니다.")
            return
        
        # 평가 서비스 초기화
        evaluation_service = AiInterviewEvaluationService()
        
        success_count = 0
        error_count = 0
        skipped_count = 0
        
        for application in applications:
            try:
                print(f"\n🔄 지원자 평가 중... ID: {application.id}")
                
                # 지원자 정보
                applicant_name = application.user.name if application.user else "Unknown"
                print(f"   👤 지원자: {applicant_name}")
                print(f"   📄 현재 상태: {application.interview_status}")
                
                # 이미 AI 면접 평가가 완료된 경우 스킵
                if application.interview_status in [
                    InterviewStatus.AI_INTERVIEW_PASSED,
                    InterviewStatus.AI_INTERVIEW_FAILED,
                    InterviewStatus.FIRST_INTERVIEW_SCHEDULED,
                    InterviewStatus.FIRST_INTERVIEW_IN_PROGRESS,
                    InterviewStatus.FIRST_INTERVIEW_COMPLETED,
                    InterviewStatus.FIRST_INTERVIEW_PASSED,
                    InterviewStatus.FIRST_INTERVIEW_FAILED,
                    InterviewStatus.SECOND_INTERVIEW_SCHEDULED,
                    InterviewStatus.SECOND_INTERVIEW_IN_PROGRESS,
                    InterviewStatus.SECOND_INTERVIEW_COMPLETED,
                    InterviewStatus.SECOND_INTERVIEW_PASSED,
                    InterviewStatus.SECOND_INTERVIEW_FAILED,
                    InterviewStatus.FINAL_INTERVIEW_SCHEDULED,
                    InterviewStatus.FINAL_INTERVIEW_IN_PROGRESS,
                    InterviewStatus.FINAL_INTERVIEW_COMPLETED,
                    InterviewStatus.FINAL_INTERVIEW_PASSED,
                    InterviewStatus.FINAL_INTERVIEW_FAILED
                ]:
                    print(f"   ⏭️ 이미 평가 완료 또는 다음 단계 진행 중 - 스킵")
                    skipped_count += 1
                    continue
                
                # AI 면접 평가 실행
                print(f"   🤖 AI 면접 평가 실행 중...")
                result = evaluation_service.evaluate_ai_interview(
                    application_id=application.id,
                    db=db
                )
                
                if result and result.get('total_score') is not None:
                    # 평가 점수 업데이트
                    application.ai_interview_score = result['total_score']
                    
                    # 면접 상태 업데이트
                    if result['total_score'] >= 70:  # 합격 기준
                        application.interview_status = InterviewStatus.AI_INTERVIEW_PASSED
                        print(f"   ✅ 합격 - 점수: {result['total_score']}")
                    else:
                        application.interview_status = InterviewStatus.AI_INTERVIEW_FAILED
                        print(f"   ❌ 불합격 - 점수: {result['total_score']}")
                    
                    db.commit()
                    success_count += 1
                else:
                    print(f"   ❌ 평가 실패 - 결과 없음")
                    error_count += 1
                    
            except Exception as e:
                print(f"   ❌ 평가 오류: {str(e)}")
                error_count += 1
                db.rollback()
        
        print(f"\n=== AI 면접 평가 완료 ===")
        print(f"✅ 성공: {success_count}")
        print(f"❌ 실패: {error_count}")
        print(f"⏭️ 스킵: {skipped_count}")
        print(f"📊 총 처리: {success_count + error_count + skipped_count}")
        
        # 결과 요약
        if success_count > 0:
            print(f"\n📈 평가 결과 요약:")
            passed_count = db.query(Application).filter(
                Application.job_post_id == job_post_id,
                Application.interview_status == InterviewStatus.AI_INTERVIEW_PASSED
            ).count()
            failed_count = db.query(Application).filter(
                Application.job_post_id == job_post_id,
                Application.interview_status == InterviewStatus.AI_INTERVIEW_FAILED
            ).count()
            print(f"   🟢 AI 면접 합격: {passed_count}명")
            print(f"   🔴 AI 면접 불합격: {failed_count}명")
        
    finally:
        db.close()

def main():
    """메인 함수"""
    if len(sys.argv) != 2:
        print("사용법: python run_ai_evaluation_for_job_post.py <job_post_id>")
        print("예시: python run_ai_evaluation_for_job_post.py 17")
        return
    
    try:
        job_post_id = int(sys.argv[1])
        run_ai_evaluation_for_job_post(job_post_id)
    except ValueError:
        print("❌ 잘못된 공고 ID입니다. 숫자를 입력해주세요.")
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    main() 