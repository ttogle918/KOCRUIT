#!/usr/bin/env python3
"""
면접 질문 테이블에 interview_stage 필드 추가 마이그레이션
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings

def add_interview_stage_column():
    """면접 질문 테이블에 interview_stage 컬럼 추가"""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # 1. interview_stage 컬럼 추가
            print("🔄 interview_stage 컬럼 추가 중...")
            conn.execute(text("""
                ALTER TABLE interview_question 
                ADD COLUMN interview_stage VARCHAR(20)
            """))
            
            # 2. 기존 데이터에 기본값 설정 (기존 질문들은 1차 면접으로 설정)
            print("🔄 기존 데이터에 기본값 설정 중...")
            conn.execute(text("""
                UPDATE interview_question 
                SET interview_stage = 'first' 
                WHERE interview_stage IS NULL
            """))
            
            # 3. interview_stage 컬럼을 NOT NULL로 변경
            print("🔄 interview_stage 컬럼을 NOT NULL로 변경 중...")
            conn.execute(text("""
                ALTER TABLE interview_question 
                ALTER COLUMN interview_stage SET NOT NULL
            """))
            
            # 4. 인덱스 추가 (성능 최적화)
            print("🔄 인덱스 추가 중...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_interview_question_stage 
                ON interview_question(interview_stage)
            """))
            
            # 5. 복합 인덱스 추가 (application_id + interview_stage)
            print("🔄 복합 인덱스 추가 중...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_interview_question_app_stage 
                ON interview_question(application_id, interview_stage)
            """))
            
            conn.commit()
            print("✅ interview_stage 컬럼 추가 완료!")
            
            # 6. 결과 확인
            result = conn.execute(text("""
                SELECT interview_stage, COUNT(*) as count 
                FROM interview_question 
                GROUP BY interview_stage
            """))
            
            print("\n📊 현재 면접 단계별 질문 수:")
            for row in result:
                print(f"  - {row.interview_stage}: {row.count}개")
                
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    print("🚀 면접 질문 테이블 마이그레이션 시작...")
    add_interview_stage_column()
    print("🎉 마이그레이션 완료!") 