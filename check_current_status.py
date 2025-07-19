#!/usr/bin/env python3
"""
현재 status와 document_status 분포 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def check_current_status():
    """현재 status와 document_status 분포를 확인합니다."""
    
    try:
        with engine.connect() as conn:
            # status 분포 확인
            result = conn.execute(text("""
                SELECT status, COUNT(*) as count 
                FROM application 
                GROUP BY status
                ORDER BY count DESC
            """))
            
            print("=== 현재 status 분포 ===")
            for row in result:
                print(f"{row[0]}: {row[1]}건")
            
            # document_status 분포 확인
            result = conn.execute(text("""
                SELECT document_status, COUNT(*) as count 
                FROM application 
                GROUP BY document_status
                ORDER BY count DESC
            """))
            
            print("\n=== 현재 document_status 분포 ===")
            for row in result:
                print(f"{row[0]}: {row[1]}건")
            
            # status와 document_status 비교
            result = conn.execute(text("""
                SELECT status, document_status, COUNT(*) as count 
                FROM application 
                GROUP BY status, document_status
                ORDER BY status, document_status
            """))
            
            print("\n=== status와 document_status 비교 ===")
            for row in result:
                print(f"status: {row[0]}, document_status: {row[1]} → {row[2]}건")
                
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    check_current_status() 