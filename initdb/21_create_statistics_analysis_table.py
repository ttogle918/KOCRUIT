#!/usr/bin/env python3
"""
통계 분석 결과 저장 테이블 생성 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, SessionLocal
from app.models.statistics_analysis import StatisticsAnalysis
from sqlalchemy import text

def create_statistics_analysis_table():
    """통계 분석 결과 테이블 생성"""
    
    # SQL 스크립트
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS statistics_analysis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_post_id INT NOT NULL,
        chart_type VARCHAR(50) NOT NULL,
        chart_data JSON NOT NULL,
        analysis TEXT NOT NULL,
        insights JSON,
        recommendations JSON,
        is_llm_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (job_post_id) REFERENCES jobpost(id) ON DELETE CASCADE,
        INDEX idx_job_post_chart_type (job_post_id, chart_type),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    try:
        with engine.connect() as connection:
            # 테이블 생성
            connection.execute(text(create_table_sql))
            connection.commit()
            print("✅ statistics_analysis 테이블이 성공적으로 생성되었습니다.")
            
            # 테이블 존재 확인
            result = connection.execute(text("SHOW TABLES LIKE 'statistics_analysis'"))
            if result.fetchone():
                print("✅ 테이블 생성 확인 완료")
            else:
                print("❌ 테이블 생성 실패")
                
    except Exception as e:
        print(f"❌ 테이블 생성 중 오류 발생: {e}")
        raise

if __name__ == "__main__":
    print("🔄 통계 분석 결과 테이블 생성 시작...")
    create_statistics_analysis_table()
    print("🎉 통계 분석 결과 테이블 생성 완료!") 