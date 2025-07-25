#!/usr/bin/env python3
"""
AI 면접 전체 일정 구조 생성 스크립트
AI 면접을 위한 schedule → schedule_interview → schedule_interview_applicant 연결 구조를 생성합니다.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.application import Application
from app.models.schedule import Schedule, ScheduleInterview, AIInterviewSchedule
from app.models.user import User
from app.models.job import JobPost
from datetime import datetime, timedelta
from sqlalchemy import text

def create_ai_interview_schedule_structure():
    """AI 면접을 위한 전체 일정 구조 생성"""
    db = next(get_db())
    
    try:
        print("=== AI 면접 전체 일정 구조 생성 ===\n")
        
        # 1. AI 면접 점수가 있는 지원자들 조회
        ai_interview_applications = db.query(Application).filter(
            Application.ai_interview_score.isnot(None),
            Application.ai_interview_score > 0
        ).all()
        
        print(f"AI 면접 점수가 있는 지원자 수: {len(ai_interview_applications)}")
        
        if not ai_interview_applications:
            print("AI 면접 점수가 있는 지원자가 없습니다.")
            return
        
        # 2. 공고별로 그룹화
        job_post_applications = {}
        for app in ai_interview_applications:
            if app.job_post_id not in job_post_applications:
                job_post_applications[app.job_post_id] = []
            job_post_applications[app.job_post_id].append(app)
        
        print(f"공고별 지원자 수:")
        for job_post_id, apps in job_post_applications.items():
            job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
            job_title = job_post.title if job_post else f"공고 {job_post_id}"
            print(f"  - {job_title}: {len(apps)}명")
        
        created_schedules = 0
        created_interviews = 0
        created_applicants = 0
        
        # 3. 각 공고별로 일정 구조 생성
        for job_post_id, applications in job_post_applications.items():
            job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
            job_title = job_post.title if job_post else f"공고 {job_post_id}"
            
            print(f"\n--- {job_title} (공고 ID: {job_post_id}) 처리 중 ---")
            
            # 3-1. AI 면접용 schedule 생성
            existing_schedule = db.query(Schedule).filter(
                Schedule.job_post_id == job_post_id,
                Schedule.schedule_type == "ai_interview"
            ).first()
            
            if existing_schedule:
                print(f"⚠️ 기존 AI 면접 일정 사용: {existing_schedule.id}")
                schedule = existing_schedule
            else:
                # 새로운 AI 면접 일정 생성
                schedule = Schedule(
                    schedule_type="ai_interview",
                    user_id=None,  # AI 면접은 면접관 불필요
                    job_post_id=job_post_id,
                    title=f"AI 면접 - {job_title}",
                    description=f"{job_title} AI 면접 일정",
                    location="온라인",
                    scheduled_at=datetime.now(),
                    status="COMPLETED"
                )
                db.add(schedule)
                db.flush()  # ID 생성
                print(f"✅ AI 면접 일정 생성: {schedule.id}")
                created_schedules += 1
            
            # 3-2. AI 면접용 schedule_interview 생성
            existing_interview = db.query(ScheduleInterview).filter(
                ScheduleInterview.schedule_id == schedule.id
            ).first()
            
            if existing_interview:
                print(f"⚠️ 기존 AI 면접 세부 일정 사용: {existing_interview.id}")
                schedule_interview = existing_interview
            else:
                # 새로운 AI 면접 세부 일정 생성
                schedule_interview = ScheduleInterview(
                    schedule_id=schedule.id,
                    user_id=None,  # AI 면접은 면접관 불필요
                    schedule_date=datetime.now(),
                    status="COMPLETED"
                )
                db.add(schedule_interview)
                db.flush()  # ID 생성
                print(f"✅ AI 면접 세부 일정 생성: {schedule_interview.id}")
                created_interviews += 1
            
            # 3-3. 각 지원자에 대해 schedule_interview_applicant 생성
            for application in applications:
                # 기존 연결 확인
                existing_applicant = db.execute(text("""
                    SELECT id FROM schedule_interview_applicant 
                    WHERE user_id = :user_id AND schedule_interview_id = :schedule_interview_id
                """), {
                    'user_id': application.user_id,
                    'schedule_interview_id': schedule_interview.id
                }).first()
                
                if existing_applicant:
                    user = db.query(User).filter(User.id == application.user_id).first()
                    user_name = user.name if user else 'Unknown'
                    print(f"⚠️ 이미 연결됨: {user_name} (ID: {application.user_id})")
                    continue
                
                # 새로운 지원자 연결 생성
                db.execute(text("""
                    INSERT INTO schedule_interview_applicant 
                    (user_id, schedule_interview_id, interview_status) 
                    VALUES (:user_id, :schedule_interview_id, :interview_status)
                """), {
                    'user_id': application.user_id,
                    'schedule_interview_id': schedule_interview.id,
                    'interview_status': application.interview_status
                })
                
                user = db.query(User).filter(User.id == application.user_id).first()
                user_name = user.name if user else 'Unknown'
                print(f"✅ 지원자 연결: {user_name} (ID: {application.user_id}) - AI 면접 점수: {application.ai_interview_score}")
                created_applicants += 1
            
            # 3-4. ai_interview_schedule 테이블에도 생성 (기존 로직과 호환)
            for application in applications:
                existing_ai_schedule = db.query(AIInterviewSchedule).filter(
                    AIInterviewSchedule.application_id == application.id,
                    AIInterviewSchedule.job_post_id == job_post_id
                ).first()
                
                if not existing_ai_schedule:
                    ai_schedule = AIInterviewSchedule(
                        application_id=application.id,
                        job_post_id=job_post_id,
                        applicant_user_id=application.user_id,
                        scheduled_at=datetime.now(),
                        status="COMPLETED"
                    )
                    db.add(ai_schedule)
                    print(f"✅ AI 면접 전용 일정 생성: 지원자 ID {application.user_id}")
        
        # 4. 변경사항 저장
        db.commit()
        
        print(f"\n=== 생성 완료 ===")
        print(f"✅ 새로 생성된 일정: {created_schedules}개")
        print(f"✅ 새로 생성된 세부 일정: {created_interviews}개")
        print(f"✅ 새로 연결된 지원자: {created_applicants}명")
        
        # 5. 최종 상태 확인
        print(f"\n=== 최종 상태 확인 ===")
        
        # AI 면접 일정 수
        ai_schedules = db.query(Schedule).filter(Schedule.schedule_type == "ai_interview").count()
        print(f"AI 면접 일정 수: {ai_schedules}")
        
        # AI 면접 세부 일정 수
        ai_interviews = db.query(ScheduleInterview).join(Schedule).filter(
            Schedule.schedule_type == "ai_interview"
        ).count()
        print(f"AI 면접 세부 일정 수: {ai_interviews}")
        
        # AI 면접 지원자 연결 수
        ai_applicants = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM schedule_interview_applicant sia
            JOIN schedule_interview si ON sia.schedule_interview_id = si.id
            JOIN schedule s ON si.schedule_id = s.id
            WHERE s.schedule_type = 'ai_interview'
        """)).scalar()
        print(f"AI 면접 지원자 연결 수: {ai_applicants}")
        
        # AI 면접 전용 일정 수
        ai_schedule_count = db.query(AIInterviewSchedule).count()
        print(f"AI 면접 전용 일정 수: {ai_schedule_count}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류가 발생했습니다: {e}")
        raise
    finally:
        db.close()

def show_ai_interview_structure():
    """생성된 AI 면접 구조 확인"""
    db = next(get_db())
    
    try:
        print("\n=== AI 면접 구조 확인 ===\n")
        
        # AI 면접 일정 조회
        ai_schedules = db.query(Schedule).filter(Schedule.schedule_type == "ai_interview").all()
        
        if not ai_schedules:
            print("AI 면접 일정이 없습니다.")
            return
        
        print(f"총 AI 면접 일정 수: {len(ai_schedules)}")
        print()
        
        for schedule in ai_schedules:
            job_post = db.query(JobPost).filter(JobPost.id == schedule.job_post_id).first()
            job_title = job_post.title if job_post else f"공고 {schedule.job_post_id}"
            
            print(f"📅 AI 면접 일정 ID: {schedule.id}")
            print(f"  - 제목: {schedule.title}")
            print(f"  - 공고: {job_title}")
            print(f"  - 장소: {schedule.location}")
            print(f"  - 일정: {schedule.scheduled_at}")
            print(f"  - 상태: {schedule.status}")
            
            # 해당 일정의 세부 일정들
            interviews = db.query(ScheduleInterview).filter(
                ScheduleInterview.schedule_id == schedule.id
            ).all()
            
            for interview in interviews:
                print(f"  📋 세부 일정 ID: {interview.id}")
                print(f"    - 면접 날짜: {interview.schedule_date}")
                print(f"    - 상태: {interview.status}")
                
                # 해당 세부 일정에 연결된 지원자들
                applicants = db.execute(text("""
                    SELECT 
                        sia.user_id,
                        sia.interview_status,
                        u.name as user_name,
                        a.ai_interview_score
                    FROM schedule_interview_applicant sia
                    JOIN users u ON sia.user_id = u.id
                    JOIN application a ON sia.user_id = a.user_id
                    WHERE sia.schedule_interview_id = :interview_id
                """), {'interview_id': interview.id}).fetchall()
                
                print(f"    👥 연결된 지원자 ({len(applicants)}명):")
                for applicant in applicants:
                    print(f"      - {applicant.user_name} (ID: {applicant.user_id})")
                    print(f"        AI 면접 점수: {applicant.ai_interview_score}")
                    print(f"        면접 상태: {applicant.interview_status}")
            
            print()
        
    except Exception as e:
        print(f"❌ 오류가 발생했습니다: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AI 면접 전체 일정 구조 생성")
    parser.add_argument("--mode", choices=["create", "show"], default="create", 
                       help="실행 모드: create (구조 생성), show (구조 확인)")
    
    args = parser.parse_args()
    
    if args.mode == "create":
        create_ai_interview_schedule_structure()
    elif args.mode == "show":
        show_ai_interview_structure() 