#!/usr/bin/env python3
"""
기존 데이터에 대해 AI 면접 평가 실행 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.job import JobPost
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.user import User
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem
from app.services.ai_interview_evaluation_service import save_ai_interview_evaluation

def run_ai_evaluation_for_existing_data():
    """기존 데이터에 대해 AI 면접 평가 실행"""
    db = next(get_db())
    
    try:
        print("=== 기존 데이터 AI 면접 평가 실행 ===\n")
        
        # 1. AI 면접 완료된 지원자들 조회
        completed_applications = db.query(Application).filter(
            Application.interview_status.in_([
                InterviewStatus.AI_INTERVIEW_COMPLETED,
                InterviewStatus.AI_INTERVIEW_PASSED,
                InterviewStatus.AI_INTERVIEW_FAILED
            ])
        ).all()
        
        print(f"AI 면접 완료된 지원자 수: {len(completed_applications)}")
        
        # 2. 각 지원자에 대해 평가 실행
        success_count = 0
        error_count = 0
        
        for app in completed_applications:
            try:
                user = db.query(User).filter(User.id == app.user_id).first()
                print(f"\n🔄 평가 실행 중... {user.name if user else 'Unknown'} (ID: {app.id})")
                
                # 기존 평가 확인
                existing_evaluation = db.query(InterviewEvaluation).filter(
                    InterviewEvaluation.interview_id == app.id,
                    InterviewEvaluation.evaluation_type == 'AI'
                ).first()
                
                if existing_evaluation:
                    print(f"   - 기존 평가 존재: ID {existing_evaluation.id}, 점수: {existing_evaluation.total_score}")
                    
                    # 기존 평가 항목들 확인
                    items = db.query(InterviewEvaluationItem).filter(
                        InterviewEvaluationItem.evaluation_id == existing_evaluation.id
                    ).all()
                    
                    print(f"   - 평가 항목 수: {len(items)}")
                    for item in items:
                        print(f"     * {item.evaluate_type}: {item.evaluate_score} ({item.grade})")
                    
                    # ai_interview_score 업데이트
                    if app.ai_interview_score != existing_evaluation.total_score:
                        app.ai_interview_score = existing_evaluation.total_score
                        db.commit()
                        print(f"   ✅ ai_interview_score 업데이트: {app.ai_interview_score}")
                    else:
                        print(f"   ✅ ai_interview_score 이미 일치: {app.ai_interview_score}")
                    
                    success_count += 1
                else:
                    print(f"   - 기존 평가 없음, 새로 생성")
                    
                    # AI 면접 평가 실행
                    evaluation_id = save_ai_interview_evaluation(
                        db=db,
                        application_id=app.id,
                        interview_id=app.id,
                        job_post_id=app.job_post_id
                    )
                    
                    print(f"   ✅ 새 평가 생성: ID {evaluation_id}")
                    success_count += 1
                    
            except Exception as e:
                print(f"   ❌ 평가 실패: {str(e)}")
                error_count += 1
                db.rollback()
        
        print(f"\n=== 평가 실행 완료 ===")
        print(f"✅ 성공: {success_count}")
        print(f"❌ 실패: {error_count}")
        
        # 3. 최종 상태 확인
        print(f"\n=== 최종 상태 확인 ===")
        final_applications = db.query(Application).filter(
            Application.ai_interview_score.isnot(None)
        ).all()
        
        print(f"ai_interview_score가 있는 지원자 수: {len(final_applications)}")
        
        for app in final_applications:
            user = db.query(User).filter(User.id == app.user_id).first()
            print(f"  - {user.name if user else 'Unknown'} (ID: {app.id}): {app.ai_interview_score}점")
        
    finally:
        db.close()

def run_ai_evaluation_for_all_applications():
    """모든 지원자에 대해 AI 면접 평가 실행"""
    db = next(get_db())
    
    try:
        print("=== 모든 지원자 AI 면접 평가 실행 ===\n")
        
        # 서류 합격한 모든 지원자 조회
        applications = db.query(Application).filter(
            Application.document_status == DocumentStatus.PASSED
        ).all()
        
        print(f"서류 합격한 지원자 수: {len(applications)}")
        
        success_count = 0
        error_count = 0
        
        for app in applications:
            try:
                user = db.query(User).filter(User.id == app.user_id).first()
                print(f"\n🔄 평가 실행 중... {user.name if user else 'Unknown'} (ID: {app.id})")
                
                # AI 면접 평가 실행
                evaluation_id = save_ai_interview_evaluation(
                    db=db,
                    application_id=app.id,
                    interview_id=app.id,
                    job_post_id=app.job_post_id
                )
                
                print(f"   ✅ 평가 완료: ID {evaluation_id}")
                success_count += 1
                
            except Exception as e:
                print(f"   ❌ 평가 실패: {str(e)}")
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
    parser.add_argument('--mode', choices=['existing', 'all'], default='existing',
                       help='existing: 완료된 지원자만, all: 모든 지원자')
    
    args = parser.parse_args()
    
    if args.mode == 'existing':
        run_ai_evaluation_for_existing_data()
    else:
        run_ai_evaluation_for_all_applications() 