from sqlalchemy import text

def upgrade(migrate_engine):
    # MySQL ENUM 컬럼 추가
    with migrate_engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE application 
            ADD COLUMN written_test_status ENUM('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED') DEFAULT 'PENDING' NOT NULL;
        """))

def downgrade(migrate_engine):
    with migrate_engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE application DROP COLUMN written_test_status;
        """)) 