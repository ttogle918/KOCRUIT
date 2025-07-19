#!/usr/bin/env python3
"""
10_add_interview_status_column.py
Application 테이블에 interview_status 컬럼을 추가하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def add_interview_status_column():
    """Application 테이블에 interview_status 컬럼을 추가합니다."""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # interview_status 컬럼이 이미 존재하는지 확인
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'application' 
            AND COLUMN_NAME = 'interview_status'
        """))
        
        if result.fetchone():
            print("interview_status 컬럼이 이미 존재합니다.")
            return
        
        # interview_status 컬럼 추가
        db.execute(text("""
            ALTER TABLE application 
            ADD COLUMN interview_status VARCHAR(50) DEFAULT 'NOT_SCHEDULED'
        """))
        
        # 기본값 업데이트 (기존 레코드들에 대해)
        db.execute(text("""
            UPDATE application 
            SET interview_status = 'NOT_SCHEDULED' 
            WHERE interview_status IS NULL
        """))
        
        # document_status 기본값 업데이트 (기존 DOCUMENT_WAITING을 PENDING으로 변경)
        db.execute(text("""
            UPDATE application 
            SET document_status = 'PENDING' 
            WHERE document_status = 'DOCUMENT_WAITING'
        """))
        
        db.commit()
        print("interview_status 컬럼이 성공적으로 추가되었습니다.")
        
    except Exception as e:
        db.rollback()
        print(f"오류 발생: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_interview_status_column() 