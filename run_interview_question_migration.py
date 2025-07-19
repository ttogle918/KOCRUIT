#!/usr/bin/env python3
"""
interview_question 테이블 마이그레이션 스크립트
"""

import os
import sys
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

def get_database_connection():
    """데이터베이스 연결"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            database=os.getenv('DB_NAME', 'kocruit'),
            user=os.getenv('DB_USER', 'admin'),
            password=os.getenv('DB_PASSWORD', 'kocruit1234!')
        )
        return connection
    except Error as e:
        print(f"데이터베이스 연결 실패: {e}")
        return None

def run_migration():
    """마이그레이션 실행"""
    connection = get_database_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # 마이그레이션 SQL 파일 읽기
        migration_file = "initdb/13_update_interview_question_schema.sql"
        
        if not os.path.exists(migration_file):
            print(f"마이그레이션 파일을 찾을 수 없습니다: {migration_file}")
            return False
        
        with open(migration_file, 'r', encoding='utf-8') as file:
            migration_sql = file.read()
        
        # SQL 문장들을 세미콜론으로 분리
        sql_statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        print("interview_question 테이블 마이그레이션을 시작합니다...")
        
        for i, statement in enumerate(sql_statements, 1):
            if statement.startswith('--'):  # 주석 건너뛰기
                continue
                
            print(f"실행 중... ({i}/{len(sql_statements)})")
            print(f"SQL: {statement[:100]}...")
            
            try:
                cursor.execute(statement)
                connection.commit()
                print("✓ 성공")
            except Error as e:
                print(f"✗ 실패: {e}")
                connection.rollback()
                return False
        
        print("마이그레이션이 성공적으로 완료되었습니다!")
        return True
        
    except Error as e:
        print(f"마이그레이션 실행 중 오류 발생: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def verify_migration():
    """마이그레이션 검증"""
    connection = get_database_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # 테이블 구조 확인
        cursor.execute("DESCRIBE interview_question")
        columns = cursor.fetchall()
        
        print("\n=== 마이그레이션 검증 ===")
        print("interview_question 테이블 구조:")
        
        expected_columns = [
            ('id', 'int'),
            ('application_id', 'int'),
            ('type', 'enum'),
            ('question_text', 'text'),
            ('category', 'varchar'),
            ('difficulty', 'varchar'),
            ('created_at', 'timestamp'),
            ('updated_at', 'timestamp')
        ]
        
        for column in columns:
            print(f"  {column[0]}: {column[1]}")
        
        # 데이터 개수 확인
        cursor.execute("SELECT COUNT(*) FROM interview_question")
        count_result = cursor.fetchone()
        count = count_result[0] if count_result else 0
        print(f"\n총 질문 개수: {count}")
        
        # 유형별 질문 개수 확인
        cursor.execute("SELECT type, COUNT(*) FROM interview_question GROUP BY type")
        type_counts = cursor.fetchall()
        
        print("\n유형별 질문 개수:")
        for type_count in type_counts:
            type_name = type_count[0]
            count = type_count[1]
            print(f"  {type_name}: {count}")
        
        return True
        
    except Error as e:
        print(f"검증 중 오류 발생: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    print("=== Interview Question 테이블 마이그레이션 ===")
    
    # 마이그레이션 실행
    if run_migration():
        # 검증 실행
        verify_migration()
    else:
        print("마이그레이션이 실패했습니다.")
        sys.exit(1) 