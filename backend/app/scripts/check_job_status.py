#!/usr/bin/env python3
"""
공고 17의 상태와 지원자들의 면접 상태를 확인하는 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.job import JobPost
from app.models.application import Application, InterviewStatus

def check_job_status():
    db = SessionLocal()
    try:
        # 공고 17 조회
        job = db.query(JobPost).filter(JobPost.id == 17).first()
        if job:
            print(f"JobPost 17: {job.title}")
            print(f"  - Status: {job.status}")
            print(f"  - Deadline: {job.deadline}")
        else:
            print("JobPost 17 not found")
            return
        
        # 지원자들 조회
        apps = db.query(Application).filter(Application.job_post_id == 17).all()
        print(f"\nApplications: {len(apps)}")
        
        for app in apps:
            print(f"  - App {app.id}: status={app.interview_status}")
            
        # AI 면접 일정이 확정된 지원자들
        ai_scheduled = db.query(Application).filter(
            Application.job_post_id == 17,
            Application.interview_status == InterviewStatus.AI_INTERVIEW_SCHEDULED.value
        ).all()
        
        print(f"\nAI 면접 일정 확정된 지원자: {len(ai_scheduled)}")
        for app in ai_scheduled:
            print(f"  - App {app.id}: {app.interview_status}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_job_status() 