#!/usr/bin/env python3
"""
면접 상태 필드 확인 스크립트
실무진 면접과 임원진 면접 페이지에서 지원자가 안 뜨는 문제를 진단합니다.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.v2.document.application import Application, InterviewStatus
from app.models.v2.auth.user import User
from app.models.v2.recruitment.job import JobPost

def check_interview_status():
    """면접 상태 필드들을 확인하고 문제점을 진단합니다."""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("🔍 면접 상태 필드 진단 시작...")
        print("=" * 60)
        
        # 1. 전체 지원자 수 확인
        total_applications = db.query(Application).count()
        print(f"📊 전체 지원자 수: {total_applications}명")
        
        # 2. AI 면접 상태별 분포
        print("\n🤖 AI 면접 상태별 분포:")
        ai_status_counts = db.query(Application.ai_interview_status, db.func.count(Application.id)).group_by(Application.ai_interview_status).all()
        for status, count in ai_status_counts:
            print(f"  - {status}: {count}명")
        
        # 3. 실무진 면접 상태별 분포
        print("\n👔 실무진 면접 상태별 분포:")
        practical_status_counts = db.query(Application.practical_interview_status, db.func.count(Application.id)).group_by(Application.practical_interview_status).all()
        for status, count in practical_status_counts:
            print(f"  - {status}: {count}명")
        
        # 4. 임원진 면접 상태별 분포
        print("\n👑 임원진 면접 상태별 분포:")
        executive_status_counts = db.query(Application.executive_interview_status, db.func.count(Application.id)).group_by(Application.executive_interview_status).all()
        for status, count in executive_status_counts:
            print(f"  - {status}: {count}명")
        
        # 5. AI 면접 합격자 중 실무진 면접 대상자 수
        print("\n🎯 AI 면접 합격자 중 실무진 면접 대상자:")
        practical_candidates = db.query(Application).filter(
            Application.ai_interview_status == InterviewStatus.PASSED,
            Application.practical_interview_status.in_([
                InterviewStatus.SCHEDULED,
                InterviewStatus.IN_PROGRESS,
                InterviewStatus.COMPLETED,
                InterviewStatus.PASSED,
                InterviewStatus.FAILED
            ])
        ).count()
        print(f"  - 실무진 면접 대상자 수: {practical_candidates}명")
        
        # 6. 실무진 면접 합격자 중 임원진 면접 대상자 수
        print("\n🎯 실무진 면접 합격자 중 임원진 면접 대상자:")
        executive_candidates = db.query(Application).filter(
            Application.practical_interview_status == InterviewStatus.PASSED,
            Application.executive_interview_status.in_([
                InterviewStatus.PENDING,
                InterviewStatus.SCHEDULED,
                InterviewStatus.IN_PROGRESS,
                InterviewStatus.COMPLETED,
                InterviewStatus.PASSED,
                InterviewStatus.FAILED
            ])
        ).count()
        print(f"  - 임원진 면접 대상자 수: {executive_candidates}명")
        
        # 7. 구체적인 지원자 예시 (최대 5명)
        print("\n📋 구체적인 지원자 예시 (최대 5명):")
        sample_applications = db.query(Application).join(User).limit(5).all()
        for app in sample_applications:
            user = app.user
            print(f"  - {user.name} (ID: {app.id}):")
            print(f"    AI 면접: {app.ai_interview_status}")
            print(f"    실무진 면접: {app.practical_interview_status}")
            print(f"    임원진 면접: {app.executive_interview_status}")
            print()
        
        # 8. 문제점 진단
        print("\n🔍 문제점 진단:")
        
        # AI 면접 합격자가 없는 경우
        ai_passed_count = db.query(Application).filter(Application.ai_interview_status == InterviewStatus.PASSED).count()
        if ai_passed_count == 0:
            print("  ❌ AI 면접 합격자가 없습니다!")
            print("     → 실무진 면접 페이지에 지원자가 표시되지 않을 수 있습니다.")
        else:
            print(f"  ✅ AI 면접 합격자: {ai_passed_count}명")
        
        # 실무진 면접 합격자가 없는 경우
        practical_passed_count = db.query(Application).filter(Application.practical_interview_status == InterviewStatus.PASSED).count()
        if practical_passed_count == 0:
            print("  ❌ 실무진 면접 합격자가 없습니다!")
            print("     → 임원진 면접 페이지에 지원자가 표시되지 않을 수 있습니다.")
        else:
            print(f"  ✅ 실무진 면접 합격자: {practical_passed_count}명")
        
        # 모든 상태가 PENDING인 지원자들
        all_pending_count = db.query(Application).filter(
            Application.ai_interview_status == InterviewStatus.PENDING,
            Application.practical_interview_status == InterviewStatus.PENDING,
            Application.executive_interview_status == InterviewStatus.PENDING
        ).count()
        
        if all_pending_count > 0:
            print(f"  ⚠️  모든 면접 상태가 PENDING인 지원자: {all_pending_count}명")
            print("     → 이들은 아직 면접을 시작하지 않은 상태입니다.")
        
        print("\n" + "=" * 60)
        print("진단 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    check_interview_status()
