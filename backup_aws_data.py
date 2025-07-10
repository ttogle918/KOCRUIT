#!/usr/bin/env python3
"""
AWS RDS 데이터 백업 스크립트
"""
import mysql.connector
import json
import os
from datetime import datetime

# AWS RDS 연결 정보
AWS_CONFIG = {
    'host': 'kocruit-01.c5k2wi2q8g80.us-east-2.rds.amazonaws.com',
    'port': 3306,
    'database': 'kocruit',
    'user': 'admin',
    'password': 'kocruit1234!'
}

def backup_table_data(cursor, table_name):
    """테이블 데이터를 백업"""
    try:
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # 컬럼명 가져오기
        cursor.execute(f"DESCRIBE {table_name}")
        columns = [column[0] for column in cursor.fetchall()]
        
        # 데이터를 딕셔너리 리스트로 변환
        data = []
        for row in rows:
            row_dict = {}
            for i, value in enumerate(row):
                if isinstance(value, datetime):
                    row_dict[columns[i]] = value.isoformat()
                else:
                    row_dict[columns[i]] = value
            data.append(row_dict)
        
        return data
    except Exception as e:
        print(f"테이블 {table_name} 백업 중 오류: {e}")
        return []

def main():
    """메인 백업 함수"""
    try:
        # 데이터베이스 연결
        conn = mysql.connector.connect(**AWS_CONFIG)
        cursor = conn.cursor()
        
        # 백업할 테이블 목록
        tables = [
            'company', 'users', 'resume', 'spec', 'department', 'jobpost',
            'company_user', 'schedule', 'applicant_user', 'application',
            'field_name_score', 'jobpost_role', 'weight', 'schedule_interview',
            'notification', 'resume_memo', 'interview_evaluation', 
            'evaluation_detail', 'interview_question', 'email_verification_tokens'
        ]
        
        backup_data = {}
        
        for table in tables:
            print(f"테이블 {table} 백업 중...")
            data = backup_table_data(cursor, table)
            backup_data[table] = data
            print(f"  - {len(data)}개 레코드 백업 완료")
        
        # 백업 파일 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"aws_backup_{timestamp}.json"
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n백업 완료: {backup_file}")
        print(f"총 {len(tables)}개 테이블, {sum(len(data) for data in backup_data.values())}개 레코드")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"백업 중 오류 발생: {e}")

if __name__ == "__main__":
    main() 