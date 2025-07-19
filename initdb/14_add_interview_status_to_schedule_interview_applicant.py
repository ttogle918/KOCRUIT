#!/usr/bin/env python3
"""
14_add_interview_status_to_schedule_interview_applicant.py
schedule_interview_applicant 테이블에 interview_status 컬럼을 추가하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def add_interview_status_to_schedule_interview_applicant():
    """schedule_interview_applicant 테이블에 interview_status 컬럼을 추가합니다."""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # interview_status 컬럼이 이미 존재하는지 확인
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'schedule_interview_applicant' 
            AND COLUMN_NAME = 'interview_status'
        """))
        
        if result.fetchone():
            print("schedule_interview_applicant 테이블에 interview_status 컬럼이 이미 존재합니다.")
            return
        
        # interview_status 컬럼 추가
        db.execute(text("""
            ALTER TABLE schedule_interview_applicant 
            ADD COLUMN interview_status VARCHAR(50) DEFAULT 'NOT_SCHEDULED'
        """))
        
        # 기존 레코드들의 interview_status를 SCHEDULED로 업데이트
        # (이미 연결된 레코드들은 면접 일정이 확정된 것으로 간주)
        db.execute(text("""
            UPDATE schedule_interview_applicant 
            SET interview_status = 'SCHEDULED' 
            WHERE interview_status IS NULL OR interview_status = 'NOT_SCHEDULED'
        """))
        
        # Application 테이블의 interview_status와 동기화
        db.execute(text("""
            UPDATE schedule_interview_applicant sia
            JOIN application a ON sia.user_id = a.user_id
            SET sia.interview_status = a.interview_status
            WHERE a.interview_status IS NOT NULL
        """))
        
        db.commit()
        print("schedule_interview_applicant 테이블에 interview_status 컬럼이 성공적으로 추가되었습니다.")
        print("기존 레코드들의 interview_status가 업데이트되었습니다.")
        
    except Exception as e:
        db.rollback()
        print(f"오류가 발생했습니다: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_interview_status_to_schedule_interview_applicant() 