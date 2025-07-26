#!/usr/bin/env python3
"""
evaluation_criteria 테이블에 evaluation_items 컬럼 추가 마이그레이션 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import get_db
from sqlalchemy import text

def add_evaluation_items_column():
    """evaluation_criteria 테이블에 evaluation_items 컬럼 추가"""
    db = next(get_db())
    
    try:
        # 컬럼 존재 여부 확인
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'kocruit' 
            AND TABLE_NAME = 'evaluation_criteria' 
            AND COLUMN_NAME = 'evaluation_items'
        """))
        
        if result.fetchone():
            print("✅ evaluation_items 컬럼이 이미 존재합니다.")
            return
        
        # 컬럼 추가
        db.execute(text("""
            ALTER TABLE evaluation_criteria 
            ADD COLUMN evaluation_items JSON NULL 
            COMMENT '면접관이 실제로 점수를 매길 수 있는 구체적 평가 항목들'
        """))
        
        db.commit()
        print("✅ evaluation_items 컬럼이 성공적으로 추가되었습니다.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 오류 발생: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 evaluation_criteria 테이블에 evaluation_items 컬럼 추가 중...")
    add_evaluation_items_column()
    print("✅ 마이그레이션 완료!") 