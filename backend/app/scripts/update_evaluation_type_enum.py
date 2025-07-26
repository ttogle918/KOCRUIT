#!/usr/bin/env python3
"""
evaluation_type enum에 resume_based 값을 추가하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import engine

def update_evaluation_type_enum():
    """evaluation_type enum에 resume_based 값 추가"""
    try:
        print("🔄 evaluation_type enum에 resume_based 값 추가 중...")
        
        with engine.connect() as connection:
            # 현재 enum 값 확인
            result = connection.execute("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'evaluation_criteria' 
                AND COLUMN_NAME = 'evaluation_type'
            """)
            
            current_enum = result.fetchone()
            if current_enum:
                print(f"현재 enum 타입: {current_enum[0]}")
                
                # resume_based가 이미 있는지 확인
                if 'resume_based' in current_enum[0]:
                    print("✅ resume_based가 이미 enum에 포함되어 있습니다.")
                    return
                
                # enum 타입 업데이트
                print("📝 enum 타입을 업데이트합니다...")
                connection.execute("""
                    ALTER TABLE evaluation_criteria 
                    MODIFY COLUMN evaluation_type ENUM('job_based', 'resume_based') NOT NULL DEFAULT 'job_based'
                """)
                
                connection.commit()
                print("✅ evaluation_type enum이 성공적으로 업데이트되었습니다.")
                
                # 업데이트 후 확인
                result = connection.execute("""
                    SELECT COLUMN_TYPE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'evaluation_criteria' 
                    AND COLUMN_NAME = 'evaluation_type'
                """)
                
                updated_enum = result.fetchone()
                if updated_enum:
                    print(f"업데이트된 enum 타입: {updated_enum[0]}")
                
                # 기존 데이터 확인
                result = connection.execute("""
                    SELECT evaluation_type, COUNT(*) as count 
                    FROM evaluation_criteria 
                    GROUP BY evaluation_type
                """)
                
                print("\n📊 현재 데이터 분포:")
                for row in result:
                    print(f"  {row[0]}: {row[1]}개")
                    
            else:
                print("❌ evaluation_type 컬럼을 찾을 수 없습니다.")
                
    except Exception as e:
        print(f"❌ enum 업데이트 중 오류 발생: {str(e)}")
        raise

def main():
    """메인 함수"""
    update_evaluation_type_enum()
    print("\n💡 이제 resume_based 타입으로 평가 기준을 생성할 수 있습니다!")

if __name__ == "__main__":
    main() 