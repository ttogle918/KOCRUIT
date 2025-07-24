#!/usr/bin/env python3
"""
AI 면접 점수 데이터베이스 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.models.application import Application, WrittenTestStatus
from sqlalchemy.orm import sessionmaker

def check_ai_interview_scores():
    """AI 면접 점수 데이터베이스 상태 확인"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("🔍 AI 면접 점수 데이터베이스 상태 확인")
        print("=" * 60)
        
        # 1. 서류 합격자 중 AI 면접 점수 확인
        print("\n📊 서류 합격자 (written_test_status = PASSED) 중 AI 면접 점수 현황:")
        passed_applications = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.PASSED
        ).all()
        
        print(f"   - 총 서류 합격자 수: {len(passed_applications)}명")
        
        scored_count = 0
        no_score_count = 0
        
        for app in passed_applications:
            if app.ai_interview_score is not None:
                scored_count += 1
                print(f"   ✅ ID {app.user_id}: {app.ai_interview_score}점 (상태: {app.interview_status})")
            else:
                no_score_count += 1
                print(f"   ❌ ID {app.user_id}: 점수 없음 (상태: {app.interview_status})")
        
        print(f"\n📈 요약:")
        print(f"   - 점수 있는 지원자: {scored_count}명")
        print(f"   - 점수 없는 지원자: {no_score_count}명")
        
        # 2. AI 면접 평가 완료된 지원자 확인
        print(f"\n🤖 AI 면접 평가 완료된 지원자:")
        completed_applications = db.query(Application).filter(
            Application.interview_status.in_([
                'AI_INTERVIEW_COMPLETED',
                'AI_INTERVIEW_PASSED', 
                'AI_INTERVIEW_FAILED'
            ])
        ).all()
        
        print(f"   - AI 면접 완료자 수: {len(completed_applications)}명")
        
        for app in completed_applications:
            print(f"   - ID {app.user_id}: {app.ai_interview_score}점 (상태: {app.interview_status})")
        
        # 3. 데이터베이스 컬럼 확인
        print(f"\n🗄️ 데이터베이스 컬럼 확인:")
        result = db.execute(text("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'application' 
            AND COLUMN_NAME = 'ai_interview_score'
        """)).fetchone()
        
        if result:
            print(f"   - 컬럼명: {result[0]}")
            print(f"   - 데이터 타입: {result[1]}")
            print(f"   - NULL 허용: {result[2]}")
            print(f"   - 기본값: {result[3]}")
        else:
            print("   ❌ ai_interview_score 컬럼을 찾을 수 없습니다!")
        
        # 4. 샘플 데이터 확인
        print(f"\n📋 샘플 데이터 (처음 5개):")
        sample_applications = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.PASSED
        ).limit(5).all()
        
        for app in sample_applications:
            print(f"   - ID {app.user_id}: ai_interview_score={app.ai_interview_score}, "
                  f"interview_status={app.interview_status}, "
                  f"written_test_status={app.written_test_status}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    check_ai_interview_scores() 