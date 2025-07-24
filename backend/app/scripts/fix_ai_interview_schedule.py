#!/usr/bin/env python3
"""
AI 면접과 인간 면접 구조 분리 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.schedule import ScheduleInterviewApplicant, ScheduleInterview
from app.models.application import Application, InterviewStatus
from app.models.user import User

def fix_ai_interview_schedule():
    """AI 면접과 인간 면접 구조 분리"""
    db = next(get_db())
    
    try:
        print("=== AI 면접과 인간 면접 구조 분리 ===\n")
        
        # 1. 현재 schedule_interview_applicant 데이터 확인
        all_applicants = db.query(ScheduleInterviewApplicant).all()
        
        print(f"전체 schedule_interview_applicant 수: {len(all_applicants)}")
        
        # 2. AI 면접과 인간 면접 구분
        ai_interview_applicants = []
        human_interview_applicants = []
        
        for applicant in all_applicants:
            # Application 테이블에서 interview_status 확인
            application = db.query(Application).filter(
                Application.user_id == applicant.user_id
            ).first()
            
            if application:
                interview_status = application.interview_status
                print(f"지원자 ID {applicant.user_id}: interview_status = {interview_status}")
                
                # AI 면접 상태인지 확인
                if interview_status and interview_status.startswith('AI_INTERVIEW'):
                    ai_interview_applicants.append(applicant)
                    print(f"  → AI 면접으로 분류")
                else:
                    human_interview_applicants.append(applicant)
                    print(f"  → 인간 면접으로 분류")
            else:
                # Application이 없으면 기본적으로 AI 면접으로 분류
                ai_interview_applicants.append(applicant)
                print(f"지원자 ID {applicant.user_id}: Application 없음 → AI 면접으로 분류")
        
        print(f"\n=== 분류 결과 ===")
        print(f"AI 면접 지원자: {len(ai_interview_applicants)}명")
        print(f"인간 면접 지원자: {len(human_interview_applicants)}명")
        
        # 3. AI 면접 지원자에서 불필요한 면접관 일정 연결 제거
        print(f"\n=== AI 면접 지원자 정리 ===")
        
        for applicant in ai_interview_applicants:
            user = db.query(User).filter(User.id == applicant.user_id).first()
            user_name = user.name if user else 'Unknown'
            
            print(f"지원자 ID {applicant.user_id} ({user_name}):")
            print(f"  - 현재 schedule_interview_id: {applicant.schedule_interview_id}")
            print(f"  - 현재 status: {applicant.status}")
            print(f"  - 현재 interview_status: {applicant.interview_status}")
            
            # AI 면접은 면접관 일정이 불필요하므로 NULL로 설정
            if applicant.schedule_interview_id is not None:
                applicant.schedule_interview_id = None
                print(f"  ✅ schedule_interview_id를 NULL로 변경")
            
            # AI 면접 상태로 업데이트
            if not applicant.interview_status or not applicant.interview_status.startswith('AI_INTERVIEW'):
                applicant.interview_status = 'AI_INTERVIEW_PENDING'
                print(f"  ✅ interview_status를 AI_INTERVIEW_PENDING으로 변경")
            
            # status도 AI 면접에 맞게 조정
            if applicant.status == 'WAITING':
                applicant.status = 'AI_INTERVIEW_PENDING'
                print(f"  ✅ status를 AI_INTERVIEW_PENDING으로 변경")
        
        # 4. 인간 면접 지원자 확인
        print(f"\n=== 인간 면접 지원자 확인 ===")
        
        for applicant in human_interview_applicants:
            user = db.query(User).filter(User.id == applicant.user_id).first()
            user_name = user.name if user else 'Unknown'
            
            print(f"지원자 ID {applicant.user_id} ({user_name}):")
            print(f"  - schedule_interview_id: {applicant.schedule_interview_id}")
            print(f"  - status: {applicant.status}")
            print(f"  - interview_status: {applicant.interview_status}")
            
            # 인간 면접은 면접관 일정이 필요함
            if applicant.schedule_interview_id is None:
                print(f"  ⚠️ 면접관 일정이 없음 - 확인 필요")
        
        # 5. 변경사항 저장
        db.commit()
        
        print(f"\n✅ AI 면접과 인간 면접 구조 분리 완료!")
        print(f"   - AI 면접 지원자: {len(ai_interview_applicants)}명")
        print(f"   - 인간 면접 지원자: {len(human_interview_applicants)}명")
        
        # 6. 최종 상태 확인
        print(f"\n=== 최종 상태 확인 ===")
        
        # AI 면접 지원자
        ai_applicants = db.query(ScheduleInterviewApplicant).filter(
            ScheduleInterviewApplicant.schedule_interview_id.is_(None)
        ).all()
        
        print(f"면접관 일정이 없는 지원자 (AI 면접): {len(ai_applicants)}명")
        for applicant in ai_applicants:
            user = db.query(User).filter(User.id == applicant.user_id).first()
            user_name = user.name if user else 'Unknown'
            print(f"  - 지원자 ID {applicant.user_id} ({user_name}): {applicant.interview_status}")
        
        # 인간 면접 지원자
        human_applicants = db.query(ScheduleInterviewApplicant).filter(
            ScheduleInterviewApplicant.schedule_interview_id.isnot(None)
        ).all()
        
        print(f"면접관 일정이 있는 지원자 (인간 면접): {len(human_applicants)}명")
        for applicant in human_applicants:
            user = db.query(User).filter(User.id == applicant.user_id).first()
            user_name = user.name if user else 'Unknown'
            print(f"  - 지원자 ID {applicant.user_id} ({user_name}): {applicant.interview_status}")
        
    except Exception as e:
        print(f"❌ 구조 분리 실패: {e}")
        db.rollback()
    finally:
        db.close()

def create_ai_interview_only_records():
    """AI 면접 전용 레코드 생성 (면접관 일정 없이)"""
    db = next(get_db())
    
    try:
        print("\n=== AI 면접 전용 레코드 생성 ===\n")
        
        # AI 면접 점수가 있는 지원자들 조회
        ai_interview_applications = db.query(Application).filter(
            Application.ai_interview_score.isnot(None),
            Application.ai_interview_score > 0
        ).all()
        
        print(f"AI 면접 점수가 있는 지원자 수: {len(ai_interview_applications)}")
        
        created_count = 0
        
        for application in ai_interview_applications:
            # 이미 schedule_interview_applicant에 있는지 확인
            existing = db.query(ScheduleInterviewApplicant).filter(
                ScheduleInterviewApplicant.user_id == application.user_id
            ).first()
            
            if not existing:
                # AI 면접 전용 레코드 생성 (면접관 일정 없이)
                ai_applicant = ScheduleInterviewApplicant(
                    user_id=application.user_id,
                    schedule_interview_id=None,  # AI 면접은 면접관 일정 불필요
                    status='AI_INTERVIEW_COMPLETED',
                    interview_status='AI_INTERVIEW_COMPLETED'
                )
                db.add(ai_applicant)
                created_count += 1
                
                user = db.query(User).filter(User.id == application.user_id).first()
                user_name = user.name if user else 'Unknown'
                print(f"✅ AI 면접 레코드 생성: 지원자 ID {application.user_id} ({user_name})")
            else:
                user = db.query(User).filter(User.id == application.user_id).first()
                user_name = user.name if user else 'Unknown'
                print(f"⚠️ 이미 존재: 지원자 ID {application.user_id} ({user_name})")
        
        # 변경사항 저장
        db.commit()
        
        print(f"\n✅ AI 면접 전용 레코드 생성 완료!")
        print(f"   - 새로 생성된 레코드: {created_count}개")
        
    except Exception as e:
        print(f"❌ AI 면접 레코드 생성 실패: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='AI 면접과 인간 면접 구조 분리')
    parser.add_argument('--mode', choices=['fix', 'create', 'all'], default='all',
                       help='fix: 구조 분리, create: AI 면접 레코드 생성, all: 모두 실행')
    
    args = parser.parse_args()
    
    if args.mode == 'fix':
        fix_ai_interview_schedule()
    elif args.mode == 'create':
        create_ai_interview_only_records()
    else:
        fix_ai_interview_schedule()
        create_ai_interview_only_records() 