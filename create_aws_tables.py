#!/usr/bin/env python3
"""
AWS RDS 테이블 생성 스크립트
"""
import pymysql
import os

# AWS RDS 연결 정보
AWS_CONFIG = {
    'host': 'kocruit-01.c5k2wi2q8g80.us-east-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'admin',
    'password': 'kocruit1234!',
    'charset': 'utf8mb4'
}

def execute_sql_file(cursor, file_path):
    """SQL 파일을 실행"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # SQL 문을 세미콜론으로 분리
        sql_statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for statement in sql_statements:
            if statement:
                print(f"실행 중: {statement[:50]}...")
                cursor.execute(statement)
        
        return True
    except Exception as e:
        print(f"SQL 파일 실행 중 오류: {e}")
        return False

def main():
    """메인 함수"""
    try:
        # 데이터베이스 연결 (데이터베이스 지정하지 않음)
        conn = pymysql.connect(**AWS_CONFIG)
        cursor = conn.cursor()
        
        print("✅ AWS RDS 연결 성공!")
        
        # kocruit 데이터베이스 사용
        cursor.execute("USE kocruit")
        print("✅ kocruit 데이터베이스 선택")
        
        # 테이블 생성 스크립트 실행
        sql_file_path = "initdb/1_create_tables.sql"
        if os.path.exists(sql_file_path):
            print(f"📋 테이블 생성 스크립트 실행: {sql_file_path}")
            if execute_sql_file(cursor, sql_file_path):
                print("✅ 테이블 생성 완료!")
            else:
                print("❌ 테이블 생성 실패!")
                return
        else:
            print(f"❌ SQL 파일을 찾을 수 없음: {sql_file_path}")
            return
        
        # 변경사항 커밋
        conn.commit()
        print("✅ 변경사항 저장 완료!")
        
        # 생성된 테이블 확인
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"📊 생성된 테이블 목록 ({len(tables)}개):")
        for table in tables:
            print(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        print("✅ 작업 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    main() 