#!/usr/bin/env python3
"""
AI 면접 평가 기준을 강화하여 기존 데이터를 재평가하는 스크립트

새로운 기준:
- 하 등급이 전체의 8% 미만 (기존 15% → 8%)
- 상 등급이 전체의 50% 이상 (새로 추가)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.application import Application, InterviewStatus
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem
from app.services.ai_interview_evaluation_service import save_ai_interview_evaluation
import json

def reevaluate_ai_interviews():
    """기존 AI 면접 평가를 새로운 엄격한 기준으로 재평가"""
    db = SessionLocal()
    
    try:
        # AI 면접 점수가 있는 지원자들 조회
        applications = db.query(Application).filter(
            Application.ai_interview_score.isnot(None),
            Application.ai_interview_score > 0
        ).all()
        
        print(f"🔍 재평가 대상: {len(applications)}명")
        
        passed_count = 0
        failed_count = 0
        
        for app in applications:
            print(f"\n📋 지원자 ID: {app.id}, User ID: {app.user_id}")
            
            # 기존 평가 데이터 삭제
            existing_evaluation = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.interview_id == app.id,
                InterviewEvaluation.evaluation_type == 'AI'
            ).first()
            
            if existing_evaluation:
                # 기존 평가 항목들 삭제
                db.query(InterviewEvaluationItem).filter(
                    InterviewEvaluationItem.evaluation_id == existing_evaluation.id
                ).delete()
                # 기존 평가 삭제
                db.delete(existing_evaluation)
                db.commit()
                print(f"   🗑️ 기존 평가 데이터 삭제 완료")
            
            # 새로운 기준으로 재평가
            try:
                evaluation_id = save_ai_interview_evaluation(
                    db=db,
                    application_id=app.id,
                    job_post_id=app.job_post_id
                )
                
                # 결과 확인
                updated_app = db.query(Application).filter(Application.id == app.id).first()
                if updated_app.interview_status == InterviewStatus.AI_INTERVIEW_PASSED.value:
                    passed_count += 1
                    print(f"   ✅ 합격 (새 기준)")
                else:
                    failed_count += 1
                    print(f"   ❌ 불합격 (새 기준)")
                    
            except Exception as e:
                print(f"   ⚠️ 재평가 실패: {e}")
                failed_count += 1
        
        print(f"\n📊 재평가 결과:")
        print(f"   - 총 지원자: {len(applications)}명")
        print(f"   - 합격: {passed_count}명")
        print(f"   - 불합격: {failed_count}명")
        print(f"   - 합격률: {passed_count/len(applications)*100:.1f}%")
        
    except Exception as e:
        print(f"❌ 재평가 중 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 AI 면접 평가 기준 강화 재평가 시작")
    print("=" * 50)
    print("새로운 기준:")
    print("- 하 등급이 전체의 8% 미만 (기존 15% → 8%)")
    print("- 상 등급이 전체의 50% 이상 (새로 추가)")
    print("=" * 50)
    
    confirm = input("재평가를 진행하시겠습니까? (y/N): ")
    if confirm.lower() == 'y':
        reevaluate_ai_interviews()
    else:
        print("❌ 재평가가 취소되었습니다.") 