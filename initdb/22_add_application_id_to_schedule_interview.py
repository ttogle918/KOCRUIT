"""
마이그레이션 스크립트: ScheduleInterview 테이블에 필요한 컬럼들 추가
"""
from sqlalchemy import create_engine, text
from app.core.config import settings

def add_columns_to_schedule_interview():
    """ScheduleInterview 테이블에 필요한 컬럼들을 추가합니다."""
    
    # 데이터베이스 연결
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as connection:
        try:
            # application_id 컬럼 추가
            connection.execute(text("""
                ALTER TABLE schedule_interview 
                ADD COLUMN application_id INTEGER,
                ADD CONSTRAINT fk_schedule_interview_application 
                FOREIGN KEY (application_id) REFERENCES application(id)
            """))
            
            # interviewer_id 컬럼 추가
            connection.execute(text("""
                ALTER TABLE schedule_interview 
                ADD COLUMN interviewer_id INTEGER,
                ADD CONSTRAINT fk_schedule_interview_interviewer 
                FOREIGN KEY (interviewer_id) REFERENCES company_user(id)
            """))
            
            # notes 컬럼 추가
            connection.execute(text("""
                ALTER TABLE schedule_interview 
                ADD COLUMN notes TEXT
            """))
            
            # created_at 컬럼 추가
            connection.execute(text("""
                ALTER TABLE schedule_interview 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """))
            
            connection.commit()
            print("✅ 필요한 컬럼들이 schedule_interview 테이블에 성공적으로 추가되었습니다.")
            
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            connection.rollback()
            raise

if __name__ == "__main__":
    add_columns_to_schedule_interview() 