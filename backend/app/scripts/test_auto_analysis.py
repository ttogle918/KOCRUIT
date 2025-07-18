#!/usr/bin/env python3
"""
자동 면접관 프로필 분석 시스템 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import update, and_
from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.models.job import JobPost
from app.scheduler.job_status_scheduler import JobStatusScheduler

async def test_auto_analysis():
    """자동 분석 시스템 테스트"""
    print("🔍 자동 면접관 프로필 분석 시스템 테스트 시작...")
    
    db = SessionLocal()
    
    try:
        # 1. 현재 공고 상태 확인
        print("\n📊 현재 공고 상태:")
        job_posts = db.query(JobPost).all()
        for post in job_posts:
            print(f"  - ID: {post.id}, 제목: {post.title}, 상태: {post.status}")
        
        # 2. SELECTING 상태인 공고를 CLOSED로 변경 (테스트용)
        print("\n🔄 공고 상태를 CLOSED로 변경 중...")
        update_query = (
            update(JobPost)
            .where(JobPost.status == "SELECTING")
            .values(
                status="CLOSED",
                updated_at=datetime.now()
            )
        )
        
        result = db.execute(update_query)
        updated_count = result.rowcount
        db.commit()
        
        print(f"✅ {updated_count}개의 공고를 CLOSED로 변경했습니다.")
        
        if updated_count == 0:
            print("⚠️  SELECTING 상태인 공고가 없습니다. 다른 상태의 공고를 변경해보겠습니다.")
            
            # RECRUITING 상태인 공고를 CLOSED로 변경
            update_query = (
                update(JobPost)
                .where(JobPost.status == "RECRUITING")
                .values(
                    status="CLOSED",
                    updated_at=datetime.now()
                )
            )
            
            result = db.execute(update_query)
            updated_count = result.rowcount
            db.commit()
            
            print(f"✅ {updated_count}개의 공고를 CLOSED로 변경했습니다.")
        
        # 3. 스케줄러 실행
        print("\n🚀 스케줄러 실행 중...")
        scheduler = JobStatusScheduler()
        result = await scheduler.run_manual_update()
        
        print(f"📈 스케줄러 실행 결과: {result}")
        
        # 4. 변경된 공고 상태 확인
        print("\n📊 변경된 공고 상태:")
        job_posts = db.query(JobPost).all()
        for post in job_posts:
            print(f"  - ID: {post.id}, 제목: {post.title}, 상태: {post.status}")
        
        print("\n✅ 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_auto_analysis()) 