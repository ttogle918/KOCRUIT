#!/usr/bin/env python3
"""
12_sync_status_to_document_status.py
기존 status 값을 document_status에 반영하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def sync_status_to_document_status():
    """기존 status 값을 document_status에 반영합니다."""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # 기존 상태 확인
        result = db.execute(text("""
            SELECT status, COUNT(*) as count 
            FROM application 
            GROUP BY status
        """))
        
        print("=== 마이그레이션 전 상태 ===")
        for row in result:
            print(f"{row[0]}: {row[1]}건")
        
        # status → document_status 매핑
        db.execute(text("""
            UPDATE application 
            SET document_status = 
                CASE 
                    WHEN status = 'PASSED' THEN 'PASSED'
                    WHEN status = 'REJECTED' THEN 'REJECTED'
                    ELSE 'PENDING'
                END
        """))
        
        db.commit()
        print("\n✅ status → document_status 매핑 완료!")
        
        # 결과 확인
        result = db.execute(text("""
            SELECT document_status, COUNT(*) as count 
            FROM application 
            GROUP BY document_status
            ORDER BY count DESC
        """))
        
        print("\n=== 마이그레이션 후 document_status 분포 ===")
        for row in result:
            print(f"{row[0]}: {row[1]}건")
        
        # 상세 비교
        result = db.execute(text("""
            SELECT status, document_status, COUNT(*) as count 
            FROM application 
            GROUP BY status, document_status
            ORDER BY status, document_status
        """))
        
        print("\n=== 최종 status와 document_status 비교 ===")
        for row in result:
            print(f"status: {row[0]}, document_status: {row[1]} → {row[2]}건")
        
    except Exception as e:
        db.rollback()
        print(f"오류 발생: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    sync_status_to_document_status() 