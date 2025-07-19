#!/usr/bin/env python3
"""
11_update_document_status_enum.py
document_status 컬럼의 Enum 타입을 새로운 ApplicationStatus 값으로 업데이트하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def update_document_status_enum():
    """document_status 컬럼의 Enum 타입을 업데이트합니다."""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # 1. 임시 컬럼 추가
        db.execute(text("""
            ALTER TABLE application 
            ADD COLUMN document_status_new VARCHAR(20) DEFAULT 'PENDING'
        """))
        
        # 2. 기존 데이터 마이그레이션
        db.execute(text("""
            UPDATE application 
            SET document_status_new = 
                CASE 
                    WHEN document_status = 'DOCUMENT_WAITING' THEN 'PENDING'
                    WHEN document_status = 'DOCUMENT_PASSED' THEN 'PASSED'
                    WHEN document_status = 'DOCUMENT_REJECTED' THEN 'REJECTED'
                    WHEN document_status IS NULL OR document_status = '' THEN 'PENDING'
                    ELSE 'PENDING'
                END
        """))
        
        # 3. 기존 컬럼 삭제
        db.execute(text("""
            ALTER TABLE application 
            DROP COLUMN document_status
        """))
        
        # 4. 새 컬럼 이름 변경
        db.execute(text("""
            ALTER TABLE application 
            CHANGE COLUMN document_status_new document_status VARCHAR(20) DEFAULT 'PENDING'
        """))
        
        # 5. 새로운 Enum 제약조건 추가
        db.execute(text("""
            ALTER TABLE application 
            MODIFY COLUMN document_status ENUM('PENDING', 'REVIEWING', 'PASSED', 'REJECTED') DEFAULT 'PENDING'
        """))
        
        db.commit()
        print("document_status 컬럼이 성공적으로 업데이트되었습니다.")
        
        # 결과 확인
        result = db.execute(text("""
            SELECT document_status, COUNT(*) as count 
            FROM application 
            GROUP BY document_status
        """))
        
        print("\n=== 업데이트된 데이터 분포 ===")
        for row in result:
            print(f"{row[0]}: {row[1]}건")
        
    except Exception as e:
        db.rollback()
        print(f"오류 발생: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_document_status_enum() 