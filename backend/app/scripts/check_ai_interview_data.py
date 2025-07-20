#!/usr/bin/env python3
"""
AI 면접 데이터 상태 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import get_db
from app.models.job import JobPost
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.user import User

def check_ai_interview_data():
    """AI 면접 데이터 상태 확인"""
    db = next(get_db())
    
    try:
        # 공고 1번과 17번 확인
        job1 = db.query(JobPost).filter(JobPost.id == 1).first()
        job17 = db.query(JobPost).filter(JobPost.id == 17).first()
        
        print("=== 공고 상태 ===")
        print(f"공고 1번: {job1.title if job1 else 'Not found'}")
        print(f"공고 17번: {job17.title if job17 else 'Not found'}")
        
        # 공고 1번의 지원자들 확인
        if job1:
            print(f"\n=== 공고 1번 지원자 상태 ===")
            applications = db.query(Application).filter(Application.job_post_id == 1).all()
            print(f"전체 지원자 수: {len(applications)}")
            
            for app in applications:
                user = db.query(User).filter(User.id == app.user_id).first()
                print(f"지원자: {user.name if user else 'Unknown'}")
                print(f"  - document_status: {app.document_status}")
                print(f"  - interview_status: {app.interview_status}")
                print(f"  - status: {app.status}")
                print()
        
        # 공고 17번의 지원자들 확인
        if job17:
            print(f"\n=== 공고 17번 지원자 상태 ===")
            applications = db.query(Application).filter(Application.job_post_id == 17).all()
            print(f"전체 지원자 수: {len(applications)}")
            
            for app in applications:
                user = db.query(User).filter(User.id == app.user_id).first()
                print(f"지원자: {user.name if user else 'Unknown'}")
                print(f"  - document_status: {app.document_status}")
                print(f"  - interview_status: {app.interview_status}")
                print(f"  - status: {app.status}")
                print()
        
        # AI 면접 필터링 조건 확인
        print("=== AI 면접 필터링 조건 ===")
        print(f"DocumentStatus.PASSED: {DocumentStatus.PASSED}")
        print(f"AI_INTERVIEW_NOT_SCHEDULED: {InterviewStatus.AI_INTERVIEW_NOT_SCHEDULED}")
        print(f"AI_INTERVIEW_SCHEDULED: {InterviewStatus.AI_INTERVIEW_SCHEDULED}")
        print(f"AI_INTERVIEW_IN_PROGRESS: {InterviewStatus.AI_INTERVIEW_IN_PROGRESS}")
        
        # 실제 AI 면접 대상자 수 확인
        ai_applicants = db.query(Application).filter(
            Application.document_status == DocumentStatus.PASSED,
            Application.interview_status.in_([
                InterviewStatus.AI_INTERVIEW_NOT_SCHEDULED,
                InterviewStatus.AI_INTERVIEW_SCHEDULED,
                InterviewStatus.AI_INTERVIEW_IN_PROGRESS
            ])
        ).all()
        
        print(f"\nAI 면접 대상자 수: {len(ai_applicants)}")
        
        # 공고별 AI 면접 대상자 수
        for job_id in [1, 17]:
            ai_applicants_for_job = db.query(Application).filter(
                Application.job_post_id == job_id,
                Application.document_status == DocumentStatus.PASSED,
                Application.interview_status.in_([
                    InterviewStatus.AI_INTERVIEW_NOT_SCHEDULED,
                    InterviewStatus.AI_INTERVIEW_SCHEDULED,
                    InterviewStatus.AI_INTERVIEW_IN_PROGRESS
                ])
            ).all()
            print(f"공고 {job_id}번 AI 면접 대상자 수: {len(ai_applicants_for_job)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_ai_interview_data() 