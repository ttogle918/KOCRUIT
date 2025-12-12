#!/usr/bin/env python3
"""
면접 상태 필드 확인 스크립트
(DB 리팩토링 대응 버전: ApplicationStage 사용)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, aliased
from app.core.config import settings
from app.models.application import Application, ApplicationStage, StageName, StageStatus, OverallStatus
from app.models.auth.user import User

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
        
        # 2. Stage별 상태 분포 확인
        print("\n📊 Stage별 상태 분포:")
        stages = db.query(ApplicationStage.stage_name, ApplicationStage.status, db.func.count(ApplicationStage.id))\
            .group_by(ApplicationStage.stage_name, ApplicationStage.status).all()
            
        for stage_name, status, count in stages:
            print(f"  - {stage_name} ({status}): {count}명")
            
        # 3. AI 면접 합격자 (실무 면접 대상자)
        print("\n🎯 AI 면접 합격자:")
        ai_passed = db.query(Application).join(Application.stages).filter(
            ApplicationStage.stage_name == StageName.AI_INTERVIEW,
            ApplicationStage.status == StageStatus.PASSED
        ).count()
        print(f"  - {ai_passed}명")
        
        print("\n" + "=" * 60)
        print("진단 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
    
    finally:
        db.close()

if __name__ == "__main__":
    check_interview_status()
