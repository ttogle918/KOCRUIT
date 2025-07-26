#!/usr/bin/env python3
"""
AI 면접 평가 재실행 스크립트
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

def run_ai_interview_evaluation():
    """AI 면접 평가 재실행"""
    db = next(get_db())
    
    try:
        print("=== AI 면접 평가 재실행 ===\n")
        
        # 점수가 없는 AI 면접 평가 찾기
        evaluations_without_score = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_type == 'AI_INTERVIEW',
            InterviewEvaluation.total_score.is_(None)
        ).all()
        
        print(f"점수가 없는 AI 면접 평가 수: {len(evaluations_without_score)}")
        
        if len(evaluations_without_score) == 0:
            print("✅ 모든 AI 면접 평가에 점수가 있습니다.")
            return
        
        # 평가 서비스 초기화
        evaluation_service = AiInterviewEvaluationService()
        
        success_count = 0
        error_count = 0
        
        for evaluation in evaluations_without_score:
            try:
                print(f"🔄 평가 재실행 중... Application ID: {evaluation.application_id}")
                
                # 지원자 정보 조회
                application = db.query(Application).filter(
                    Application.id == evaluation.application_id
                ).first()
                
                if not application:
                    print(f"❌ Application {evaluation.application_id}를 찾을 수 없습니다.")
                    error_count += 1
                    continue
                
                # AI 면접 평가 재실행
                result = evaluation_service.evaluate_ai_interview(
                    application_id=evaluation.application_id,
                    db=db
                )
                
                if result and result.get('total_score') is not None:
                    # 평가 점수 업데이트
                    evaluation.total_score = result['total_score']
                    evaluation.technical_score = result.get('technical_score')
                    evaluation.communication_score = result.get('communication_score')
                    evaluation.problem_solving_score = result.get('problem_solving_score')
                    evaluation.cultural_fit_score = result.get('cultural_fit_score')
                    evaluation.evaluation_details = result.get('evaluation_details')
                    
                    # 면접 상태 업데이트
                    if result['total_score'] >= 70:
                        application.interview_status = InterviewStatus.AI_INTERVIEW_PASSED
                    else:
                        application.interview_status = InterviewStatus.AI_INTERVIEW_FAILED
                    
                    db.commit()
                    print(f"✅ 평가 완료 - 점수: {result['total_score']}")
                    success_count += 1
                else:
                    print(f"❌ 평가 실패 - 결과 없음")
                    error_count += 1
                    
            except Exception as e:
                print(f"❌ 평가 오류: {str(e)}")
                error_count += 1
                db.rollback()
        
        print(f"\n=== 평가 재실행 완료 ===")
        print(f"✅ 성공: {success_count}")
        print(f"❌ 실패: {error_count}")
        
    finally:
        db.close()

def run_evaluation_for_all_applications():
    """모든 지원자에 대해 AI 면접 평가 실행"""
    db = next(get_db())
    
    try:
        print("=== 모든 지원자 AI 면접 평가 실행 ===\n")
        
        # AI 면접 완료된 지원자들 조회
        applications = db.query(Application).filter(
            Application.document_status == DocumentStatus.PASSED,
            Application.interview_status.in_([
                InterviewStatus.AI_INTERVIEW_COMPLETED,
                InterviewStatus.AI_INTERVIEW_PASSED,
                InterviewStatus.AI_INTERVIEW_FAILED
            ])
        ).all()
        
        print(f"AI 면접 완료된 지원자 수: {len(applications)}")
        
        # 평가 서비스 초기화
        evaluation_service = AiInterviewEvaluationService()
        
        success_count = 0
        error_count = 0
        
        for application in applications:
            try:
                print(f"🔄 평가 실행 중... {application.id}")
                
                # AI 면접 평가 실행
                result = evaluation_service.evaluate_ai_interview(
                    application_id=application.id,
                    db=db
                )
                
                if result and result.get('total_score') is not None:
                    # 기존 평가가 있으면 업데이트, 없으면 새로 생성
                    existing_evaluation = db.query(InterviewEvaluation).filter(
                        InterviewEvaluation.application_id == application.id,
                        InterviewEvaluation.interview_type == 'AI_INTERVIEW'
                    ).first()
                    
                    if existing_evaluation:
                        existing_evaluation.total_score = result['total_score']
                        existing_evaluation.technical_score = result.get('technical_score')
                        existing_evaluation.communication_score = result.get('communication_score')
                        existing_evaluation.problem_solving_score = result.get('problem_solving_score')
                        existing_evaluation.cultural_fit_score = result.get('cultural_fit_score')
                        existing_evaluation.evaluation_details = result.get('evaluation_details')
                    else:
                        new_evaluation = InterviewEvaluation(
                            application_id=application.id,
                            interview_type='AI_INTERVIEW',
                            total_score=result['total_score'],
                            technical_score=result.get('technical_score'),
                            communication_score=result.get('communication_score'),
                            problem_solving_score=result.get('problem_solving_score'),
                            cultural_fit_score=result.get('cultural_fit_score'),
                            evaluation_details=result.get('evaluation_details')
                        )
                        db.add(new_evaluation)
                    
                    # 면접 상태 업데이트
                    if result['total_score'] >= 70:
                        application.interview_status = InterviewStatus.AI_INTERVIEW_PASSED
                    else:
                        application.interview_status = InterviewStatus.AI_INTERVIEW_FAILED
                    
                    db.commit()
                    print(f"✅ 평가 완료 - 점수: {result['total_score']}")
                    success_count += 1
                else:
                    print(f"❌ 평가 실패 - 결과 없음")
                    error_count += 1
                    
            except Exception as e:
                print(f"❌ 평가 오류: {str(e)}")
                error_count += 1
                db.rollback()
        
        print(f"\n=== 평가 실행 완료 ===")
        print(f"✅ 성공: {success_count}")
        print(f"❌ 실패: {error_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='AI 면접 평가 실행')
    parser.add_argument('--mode', choices=['fix', 'all'], default='fix',
                       help='fix: 점수 없는 평가만 수정, all: 모든 지원자 평가')
    
    args = parser.parse_args()
    
    if args.mode == 'fix':
        run_ai_interview_evaluation()
    else:
        run_evaluation_for_all_applications() 