#!/usr/bin/env python3
"""
테스트용 필기합격자 데이터 생성 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.application import Application, WrittenTestStatus
from app.models.job import JobPost

def create_test_written_test_data():
    """테스트용 필기합격자 데이터를 생성합니다."""
    
    db = next(get_db())
    
    try:
        # 첫 번째 공고 조회
        job_post = db.query(JobPost).first()
        if not job_post:
            print("공고가 없습니다. 먼저 공고를 생성해주세요.")
            return
        
        print(f"공고 ID: {job_post.id}, 제목: {job_post.title}")
        
        # 해당 공고의 지원자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == job_post.id
        ).all()
        
        print(f"전체 지원자 수: {len(applications)}")
        
        if not applications:
            print("지원자가 없습니다. 먼저 지원자를 생성해주세요.")
            return
        
        # 상위 3명을 필기합격자로 설정
        for i, application in enumerate(applications[:3]):
            application.written_test_status = WrittenTestStatus.PASSED
            application.written_test_score = 4.0 + (i * 0.5)  # 4.0, 4.5, 5.0점
            print(f"지원자 {application.id}를 필기합격자로 설정 (점수: {application.written_test_score})")
        
        # 나머지는 필기불합격자로 설정
        for application in applications[3:]:
            application.written_test_status = WrittenTestStatus.FAILED
            application.written_test_score = 1.0 + (hash(str(application.id)) % 30) / 10  # 1.0-4.0점 사이
            print(f"지원자 {application.id}를 필기불합격자로 설정 (점수: {application.written_test_score})")
        
        db.commit()
        print("필기합격자 데이터 생성 완료!")
        
        # 결과 확인
        passed_applications = db.query(Application).filter(
            Application.job_post_id == job_post.id,
            Application.written_test_status == WrittenTestStatus.PASSED
        ).all()
        
        print(f"필기합격자 수: {len(passed_applications)}")
        for app in passed_applications:
            print(f"  - 지원자 {app.id}: {app.written_test_score}점")
            
    except Exception as e:
        print(f"오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_written_test_data() 