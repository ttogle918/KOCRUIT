#!/usr/bin/env python3
"""
데이터베이스 스키마 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def check_application_schema():
    """Application 테이블 스키마를 확인합니다."""
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE application"))
            print("=== Application 테이블 스키마 ===")
            for row in result:
                print(f"{row[0]}: {row[1]} {row[2]} {row[3]} {row[4]} {row[5]}")
            
            print("\n=== 기존 데이터 샘플 ===")
            result = conn.execute(text("SELECT id, status, document_status, interview_status FROM application LIMIT 5"))
            for row in result:
                print(f"ID: {row[0]}, status: {row[1]}, document_status: {row[2]}, interview_status: {row[3]}")
                
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    check_application_schema() 