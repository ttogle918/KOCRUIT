#!/usr/bin/env python3
"""
기존 JobPost 상태를 4단계 시스템으로 업데이트하는 마이그레이션 스크립트
ACTIVE → SCHEDULED/RECRUITING/SELECTING으로 변경
"""

import sys
import os
from datetime import datetime
from sqlalchemy import create_engine, text, update, and_
from sqlalchemy.orm import sessionmaker

# Add backend path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.models.job import JobPost
from app.core.database import SessionLocal

def update_jobpost_status_4stages():
    """기존 JobPost 상태를 4단계 시스템으로 업데이트"""
    
    print("🔄 JobPost 4단계 상태 시스템 업데이트 시작...")
    
    try:
        db = SessionLocal()
        now = datetime.now()
        updated_count = 0
        
        # 1. 마감일이 지난 ACTIVE 공고를 SELECTING으로 변경
        expired_active_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.end_date < now.strftime("%Y-%m-%d %H:%M:%S")
                )
            )
            .values(status="SELECTING")
        )
        
        result = db.execute(expired_active_query)
        expired_count = result.rowcount
        updated_count += expired_count
        
        if expired_count > 0:
            print(f"✅ {expired_count}개의 만료된 공고를 SELECTING으로 변경")
        
        # 2. 시작일이 지나지 않은 ACTIVE 공고를 SCHEDULED로 변경
        not_started_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.start_date > now.strftime("%Y-%m-%d %H:%M:%S")
                )
            )
            .values(status="SCHEDULED")
        )
        
        result = db.execute(not_started_query)
        scheduled_count = result.rowcount
        updated_count += scheduled_count
        
        if scheduled_count > 0:
            print(f"✅ {scheduled_count}개의 시작 전 공고를 SCHEDULED로 변경")
        
        # 3. 시작일이 지나고 마감일이 지나지 않은 ACTIVE 공고를 RECRUITING으로 변경
        recruiting_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.start_date <= now.strftime("%Y-%m-%d %H:%M:%S"),
                    JobPost.end_date >= now.strftime("%Y-%m-%d %H:%M:%S")
                )
            )
            .values(status="RECRUITING")
        )
        
        result = db.execute(recruiting_query)
        recruiting_count = result.rowcount
        updated_count += recruiting_count
        
        if recruiting_count > 0:
            print(f"✅ {recruiting_count}개의 모집중 공고를 RECRUITING으로 변경")
        
        # 4. start_date가 없는 ACTIVE 공고를 SCHEDULED로 변경
        no_start_date_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.start_date.is_(None)
                )
            )
            .values(status="SCHEDULED")
        )
        
        result = db.execute(no_start_date_query)
        no_start_count = result.rowcount
        updated_count += no_start_count
        
        if no_start_count > 0:
            print(f"✅ {no_start_count}개의 시작일 없는 공고를 SCHEDULED로 변경")
        
        # 5. start_date가 빈 문자열인 ACTIVE 공고를 SCHEDULED로 변경
        empty_start_date_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.start_date == ""
                )
            )
            .values(status="SCHEDULED")
        )
        
        result = db.execute(empty_start_date_query)
        empty_start_count = result.rowcount
        updated_count += empty_start_count
        
        if empty_start_count > 0:
            print(f"✅ {empty_start_count}개의 빈 시작일 공고를 SCHEDULED로 변경")
        
        # 6. end_date가 없는 ACTIVE 공고를 RECRUITING으로 변경 (시작일이 지난 경우)
        no_end_date_started_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.end_date.is_(None),
                    JobPost.start_date <= now.strftime("%Y-%m-%d %H:%M:%S")
                )
            )
            .values(status="RECRUITING")
        )
        
        result = db.execute(no_end_date_started_query)
        no_end_started_count = result.rowcount
        updated_count += no_end_started_count
        
        if no_end_started_count > 0:
            print(f"✅ {no_end_started_count}개의 마감일 없는 모집중 공고를 RECRUITING으로 변경")
        
        # 7. end_date가 빈 문자열인 ACTIVE 공고를 RECRUITING으로 변경 (시작일이 지난 경우)
        empty_end_date_started_query = (
            update(JobPost)
            .where(
                and_(
                    JobPost.status == "ACTIVE",
                    JobPost.end_date == "",
                    JobPost.start_date <= now.strftime("%Y-%m-%d %H:%M:%S")
                )
            )
            .values(status="RECRUITING")
        )
        
        result = db.execute(empty_end_date_started_query)
        empty_end_started_count = result.rowcount
        updated_count += empty_end_started_count
        
        if empty_end_started_count > 0:
            print(f"✅ {empty_end_started_count}개의 빈 마감일 모집중 공고를 RECRUITING으로 변경")
        
        db.commit()
        
        # 8. 업데이트 결과 확인
        status_counts = db.execute(
            text("SELECT status, COUNT(*) as count FROM jobpost GROUP BY status")
        ).fetchall()
        
        print(f"\n📊 업데이트 완료!")
        print(f"총 {updated_count}개의 공고 상태가 업데이트되었습니다.")
        print("\n현재 상태별 공고 수:")
        for status, count in status_counts:
            print(f"  - {status}: {count}개")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ 업데이트 중 오류 발생: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False

def verify_update_4stages():
    """4단계 시스템 업데이트 결과 검증"""
    
    print("\n🔍 4단계 시스템 업데이트 결과 검증...")
    
    try:
        db = SessionLocal()
        now = datetime.now()
        
        # ACTIVE 상태인 공고가 남아있는지 확인
        active_count = db.query(JobPost).filter(JobPost.status == "ACTIVE").count()
        
        if active_count > 0:
            print(f"⚠️  아직 {active_count}개의 ACTIVE 상태 공고가 남아있습니다.")
        else:
            print("✅ 모든 ACTIVE 상태 공고가 4단계 시스템으로 업데이트되었습니다.")
        
        # 상태별 통계
        status_counts = db.execute(
            text("SELECT status, COUNT(*) as count FROM jobpost GROUP BY status")
        ).fetchall()
        
        print("\n📈 최종 상태별 통계:")
        for status, count in status_counts:
            print(f"  - {status}: {count}개")
        
        # 4단계 시스템 검증
        print("\n🔍 4단계 시스템 검증:")
        
        # SCHEDULED: 시작일이 지나지 않은 공고
        scheduled_before_start = db.query(JobPost).filter(
            and_(
                JobPost.status == "SCHEDULED",
                JobPost.start_date > now.strftime("%Y-%m-%d %H:%M:%S")
            )
        ).count()
        print(f"  - SCHEDULED (시작 전): {scheduled_before_start}개")
        
        # RECRUITING: 시작일이 지나고 마감일이 지나지 않은 공고
        recruiting_active = db.query(JobPost).filter(
            and_(
                JobPost.status == "RECRUITING",
                JobPost.start_date <= now.strftime("%Y-%m-%d %H:%M:%S"),
                JobPost.end_date >= now.strftime("%Y-%m-%d %H:%M:%S")
            )
        ).count()
        print(f"  - RECRUITING (모집중): {recruiting_active}개")
        
        # SELECTING: 마감일이 지난 공고
        selecting_after_end = db.query(JobPost).filter(
            and_(
                JobPost.status == "SELECTING",
                JobPost.end_date < now.strftime("%Y-%m-%d %H:%M:%S")
            )
        ).count()
        print(f"  - SELECTING (선발중): {selecting_after_end}개")
        
        # CLOSED: 수동으로 마감된 공고
        closed_count = db.query(JobPost).filter(JobPost.status == "CLOSED").count()
        print(f"  - CLOSED (마감): {closed_count}개")
        
        db.close()
        
    except Exception as e:
        print(f"❌ 검증 중 오류 발생: {e}")
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    print("🚀 JobPost 4단계 상태 시스템 마이그레이션 시작\n")
    
    # 업데이트 실행
    success = update_jobpost_status_4stages()
    
    if success:
        # 검증 실행
        verify_update_4stages()
        print("\n✨ 4단계 시스템 마이그레이션이 성공적으로 완료되었습니다!")
    else:
        print("\n❌ 마이그레이션이 실패했습니다.")
        sys.exit(1) 