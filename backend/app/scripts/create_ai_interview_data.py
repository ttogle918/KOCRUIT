#!/usr/bin/env python3
"""
AI 면접 전용 데이터 생성 스크립트
기존 데이터를 수정하지 않고 AI 면접 전용 테이블에 새로운 데이터를 생성합니다.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.application import Application
from app.models.schedule import AIInterviewSchedule
from app.models.user import User
from datetime import datetime

def create_ai_interview_data():
    """AI 면접 점수가 있는 지원자들을 위한 AI 면접 일정 데이터 생성"""
    db = next(get_db())
    
    try:
        print("=== AI 면접 전용 데이터 생성 ===\n")
        
        # 1. AI 면접 점수가 있는 지원자들 조회
        ai_interview_applications = db.query(Application).filter(
            Application.ai_interview_score.isnot(None),
            Application.ai_interview_score > 0
        ).all()
        
        print(f"AI 면접 점수가 있는 지원자 수: {len(ai_interview_applications)}")
        
        if not ai_interview_applications:
            print("AI 면접 점수가 있는 지원자가 없습니다.")
            return
        
        # 2. 각 지원자에 대해 AI 면접 일정 생성
        created_count = 0
        skipped_count = 0
        
        for application in ai_interview_applications:
            # 기존 AI 면접 일정이 있는지 확인
            existing_schedule = db.query(AIInterviewSchedule).filter(
                AIInterviewSchedule.application_id == application.id,
                AIInterviewSchedule.job_post_id == application.job_post_id
            ).first()
            
            if existing_schedule:
                user = db.query(User).filter(User.id == application.user_id).first()
                user_name = user.name if user else 'Unknown'
                print(f"⚠️ 이미 존재: 지원자 ID {application.user_id} ({user_name}) - AI 면접 일정 ID: {existing_schedule.id}")
                skipped_count += 1
                continue
            
            # 새로운 AI 면접 일정 생성
            try:
                ai_schedule = AIInterviewSchedule(
                    application_id=application.id,
                    job_post_id=application.job_post_id,
                    applicant_user_id=application.user_id,
                    scheduled_at=datetime.now(),
                    status="COMPLETED"  # 이미 평가가 완료되었으므로
                )
                db.add(ai_schedule)
                db.flush()  # ID 생성
                
                user = db.query(User).filter(User.id == application.user_id).first()
                user_name = user.name if user else 'Unknown'
                print(f"✅ AI 면접 일정 생성: 지원자 ID {application.user_id} ({user_name})")
                print(f"   - AI 면접 일정 ID: {ai_schedule.id}")
                print(f"   - 지원서 ID: {application.id}")
                print(f"   - 공고 ID: {application.job_post_id}")
                print(f"   - AI 면접 점수: {application.ai_interview_score}")
                print(f"   - 면접 상태: {application.interview_status}")
                print()
                
                created_count += 1
                
            except Exception as e:
                print(f"❌ 오류 발생: 지원자 ID {application.user_id} - {e}")
                db.rollback()
                continue
        
        # 3. 변경사항 저장
        db.commit()
        
        print("=== 생성 완료 ===")
        print(f"✅ 새로 생성된 AI 면접 일정: {created_count}개")
        print(f"⚠️ 이미 존재하는 일정: {skipped_count}개")
        print(f"📊 총 처리된 지원자: {created_count + skipped_count}명")
        
        # 4. 최종 상태 확인
        print("\n=== 최종 상태 확인 ===")
        total_ai_schedules = db.query(AIInterviewSchedule).count()
        print(f"AI 면접 일정 테이블 총 레코드 수: {total_ai_schedules}")
        
        # AI 면접 점수가 있는 지원자 수와 비교
        ai_score_count = db.query(Application).filter(
            Application.ai_interview_score.isnot(None),
            Application.ai_interview_score > 0
        ).count()
        print(f"AI 면접 점수가 있는 지원자 수: {ai_score_count}")
        
        if total_ai_schedules == ai_score_count:
            print("✅ 모든 AI 면접 점수 지원자에 대해 일정이 생성되었습니다!")
        else:
            print(f"⚠️ 일부 지원자에 대해 일정이 생성되지 않았습니다. (차이: {ai_score_count - total_ai_schedules})")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류가 발생했습니다: {e}")
        raise
    finally:
        db.close()

def show_ai_interview_data():
    """생성된 AI 면접 데이터 확인"""
    db = next(get_db())
    
    try:
        print("\n=== AI 면접 데이터 확인 ===\n")
        
        # AI 면접 일정 조회
        ai_schedules = db.query(AIInterviewSchedule).all()
        
        if not ai_schedules:
            print("AI 면접 일정이 없습니다.")
            return
        
        print(f"총 AI 면접 일정 수: {len(ai_schedules)}")
        print()
        
        for schedule in ai_schedules:
            user = db.query(User).filter(User.id == schedule.applicant_user_id).first()
            application = db.query(Application).filter(Application.id == schedule.application_id).first()
            
            user_name = user.name if user else 'Unknown'
            ai_score = application.ai_interview_score if application else 'N/A'
            interview_status = application.interview_status if application else 'N/A'
            
            print(f"AI 면접 일정 ID: {schedule.id}")
            print(f"  - 지원자: {user_name} (ID: {schedule.applicant_user_id})")
            print(f"  - 지원서 ID: {schedule.application_id}")
            print(f"  - 공고 ID: {schedule.job_post_id}")
            print(f"  - AI 면접 점수: {ai_score}")
            print(f"  - 면접 상태: {interview_status}")
            print(f"  - 일정 상태: {schedule.status}")
            print(f"  - 생성일: {schedule.created_at}")
            print()
        
    except Exception as e:
        print(f"❌ 오류가 발생했습니다: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AI 면접 전용 데이터 생성")
    parser.add_argument("--mode", choices=["create", "show"], default="create", 
                       help="실행 모드: create (데이터 생성), show (데이터 확인)")
    
    args = parser.parse_args()
    
    if args.mode == "create":
        create_ai_interview_data()
    elif args.mode == "show":
        show_ai_interview_data() 