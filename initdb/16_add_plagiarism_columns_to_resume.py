#!/usr/bin/env python3
"""
Resume 테이블에 표절 점수 관련 컬럼 추가
- plagiarism_score: 표절 유사도 점수 (0-1)
- plagiarism_checked_at: 표절 검사 수행 시간
- most_similar_resume_id: 가장 유사한 이력서 ID
- similarity_threshold: 표절 의심 임계값 (기본값 0.9)
"""

import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime

def get_db_connection():
    """MySQL 데이터베이스 연결"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3307)),  # Docker 포트 매핑에 맞게 3307로 변경
            database=os.getenv('DB_NAME', 'kocruit_db'),
            user=os.getenv('DB_USER', 'myuser'),  # 백엔드 설정과 동일하게 수정
            password=os.getenv('DB_PASSWORD', '1234'),  # 백엔드 설정과 동일하게 수정
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        return connection
    except Error as e:
        print(f"MySQL 연결 오류: {e}")
        return None

def add_plagiarism_columns():
    """Resume 테이블에 표절 점수 관련 컬럼들 추가"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # 기존 컬럼 존재 여부 확인
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'resume' 
            AND COLUMN_NAME IN ('plagiarism_score', 'plagiarism_checked_at', 'most_similar_resume_id', 'similarity_threshold')
        """, (os.getenv('DB_NAME', 'kocruit_db'),))
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # 컬럼들 추가
        columns_to_add = [
            ("plagiarism_score", "ADD COLUMN plagiarism_score FLOAT NULL COMMENT '표절 유사도 점수 (0-1)'"),
            ("plagiarism_checked_at", "ADD COLUMN plagiarism_checked_at DATETIME NULL COMMENT '표절 검사 수행 시간'"),
            ("most_similar_resume_id", "ADD COLUMN most_similar_resume_id INT NULL COMMENT '가장 유사한 이력서 ID'"),
            ("similarity_threshold", "ADD COLUMN similarity_threshold FLOAT DEFAULT 0.9 COMMENT '표절 의심 임계값'")
        ]
        
        for column_name, alter_sql in columns_to_add:
            if column_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE resume {alter_sql}")
                    print(f"✅ '{column_name}' 컬럼 추가 완료")
                except Error as e:
                    print(f"❌ '{column_name}' 컬럼 추가 실패: {e}")
            else:
                print(f"⏭️ '{column_name}' 컬럼이 이미 존재합니다")
        
        connection.commit()
        print("✅ Resume 테이블 표절 점수 컬럼 추가 완료")
        return True
        
    except Error as e:
        print(f"❌ 마이그레이션 실패: {e}")
        connection.rollback()
        return False
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def main():
    """메인 실행 함수"""
    print("🚀 Resume 테이블 표절 점수 컬럼 추가 시작...")
    print(f"📅 실행 시간: {datetime.now()}")
    
    success = add_plagiarism_columns()
    
    if success:
        print("🎉 마이그레이션 성공적으로 완료!")
    else:
        print("💥 마이그레이션 실패!")
        exit(1)

if __name__ == "__main__":
    main() 