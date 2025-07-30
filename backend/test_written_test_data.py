#!/usr/bin/env python3
"""
필기 합격자 데이터 생성 및 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.application import Application, WrittenTestStatus
from app.models.job import JobPost
from app.models.user import User

def create_written_test_data():
    """필기 합격자 데이터를 생성합니다."""
    
    db = SessionLocal()
    
    try:
        # 첫 번째 공고 조회
        job_post = db.query(JobPost).first()
        if not job_post:
            print("❌ 공고가 없습니다. 먼저 공고를 생성해주세요.")
            return False
        
        print(f"✅ 공고 ID: {job_post.id}, 제목: {job_post.title}")
        
        # 해당 공고의 지원자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == job_post.id
        ).all()
        
        print(f"📊 전체 지원자 수: {len(applications)}")
        
        if not applications:
            print("❌ 지원자가 없습니다. 먼저 지원자를 생성해주세요.")
            return False
        
        # 상위 3명을 필기합격자로 설정
        for i, application in enumerate(applications[:3]):
            application.written_test_status = WrittenTestStatus.PASSED
            application.written_test_score = 4.0 + (i * 0.5)  # 4.0, 4.5, 5.0점
            print(f"✅ 지원자 {application.id}를 필기합격자로 설정 (점수: {application.written_test_score})")
        
        # 나머지는 필기불합격자로 설정
        for application in applications[3:]:
            application.written_test_status = WrittenTestStatus.FAILED
            application.written_test_score = 1.0 + (hash(str(application.id)) % 30) / 10  # 1.0-4.0점 사이
            print(f"❌ 지원자 {application.id}를 필기불합격자로 설정 (점수: {application.written_test_score})")
        
        db.commit()
        print("🎉 필기합격자 데이터 생성 완료!")
        
        # 결과 확인
        passed_applications = db.query(Application).filter(
            Application.job_post_id == job_post.id,
            Application.written_test_status == WrittenTestStatus.PASSED
        ).all()
        
        print(f"\n📋 필기합격자 수: {len(passed_applications)}")
        for app in passed_applications:
            user_name = app.user.name if app.user else "Unknown"
            print(f"  - 지원자 {app.id}: {user_name} ({app.written_test_score}점)")
        
        return True
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def check_written_test_data():
    """필기 합격자 데이터 상태를 확인합니다."""
    
    db = SessionLocal()
    
    try:
        # 모든 공고의 필기합격자 확인
        passed_applications = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.PASSED
        ).all()
        
        print(f"\n📊 전체 필기합격자 수: {len(passed_applications)}")
        
        if len(passed_applications) == 0:
            print("❌ 필기합격자가 없습니다!")
            return False
        
        # 공고별로 그룹화
        job_post_applications = {}
        for app in passed_applications:
            job_post_id = app.job_post_id
            if job_post_id not in job_post_applications:
                job_post_applications[job_post_id] = []
            job_post_applications[job_post_id].append(app)
        
        print(f"\n📋 공고별 필기합격자 현황:")
        for job_post_id, apps in job_post_applications.items():
            job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
            job_title = job_post.title if job_post else f"공고 {job_post_id}"
            print(f"  - {job_title} (ID: {job_post_id}): {len(apps)}명")
            
            for app in apps:
                user_name = app.user.name if app.user else "Unknown"
                print(f"    * {user_name}: {app.written_test_score}점")
        
        return True
        
    except Exception as e:
        print(f"❌ 확인 중 오류 발생: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 필기 합격자 데이터 상태 확인...")
    if not check_written_test_data():
        print("\n🛠️ 필기 합격자 데이터 생성 중...")
        if create_written_test_data():
            print("\n✅ 데이터 생성 완료! 다시 확인...")
            check_written_test_data()
        else:
            print("❌ 데이터 생성 실패!")
    else:
        print("✅ 필기 합격자 데이터가 정상적으로 존재합니다!") 