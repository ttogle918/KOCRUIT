#!/usr/bin/env python3
"""
highlight_result 테이블의 gray_highlights 컬럼을 orange_highlights로 변경하는 스크립트
"""

import os
import sys
import pymysql
from sqlalchemy import create_engine, text

# 환경 변수에서 데이터베이스 연결 정보 가져오기
DB_HOST = os.getenv('DB_HOST', 'kocruit-02.c5k2wi2q8g80.us-east-2.rds.amazonaws.com')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_NAME = os.getenv('DB_NAME', 'kocruit')
DB_USER = os.getenv('DB_USER', 'admin')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'kocruit1234!')

def fix_highlight_table():
    """highlight_result 테이블의 컬럼명을 수정"""
    
    try:
        # PyMySQL을 사용한 직접 연결
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # 현재 테이블 구조 확인
            print("🔍 현재 테이블 구조 확인 중...")
            cursor.execute("DESCRIBE highlight_result")
            columns = cursor.fetchall()
            
            print("현재 컬럼 목록:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")
            
            # gray_highlights 컬럼이 있는지 확인
            gray_exists = any(col[0] == 'gray_highlights' for col in columns)
            orange_exists = any(col[0] == 'orange_highlights' for col in columns)
            
            if gray_exists and not orange_exists:
                print("🔄 gray_highlights를 orange_highlights로 변경 중...")
                cursor.execute("ALTER TABLE highlight_result CHANGE COLUMN gray_highlights orange_highlights JSON")
                connection.commit()
                print("✅ 컬럼명 변경 완료!")
            elif orange_exists:
                print("✅ orange_highlights 컬럼이 이미 존재합니다.")
            else:
                print("⚠️ gray_highlights 컬럼이 없습니다. orange_highlights 컬럼을 새로 생성합니다.")
                cursor.execute("ALTER TABLE highlight_result ADD COLUMN orange_highlights JSON")
                connection.commit()
                print("✅ orange_highlights 컬럼 생성 완료!")
            
            # 변경 후 테이블 구조 다시 확인
            print("\n🔍 변경 후 테이블 구조:")
            cursor.execute("DESCRIBE highlight_result")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")
        
        connection.close()
        print("\n🎉 highlight_result 테이블 수정 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    fix_highlight_table() 