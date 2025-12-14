import os
import pymysql
import sys

# 환경 변수에서 DB 접속 정보 가져오기 (docker-compose 환경 기준)
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "recruit_db")

def apply_migration():
    print(f"Connecting to database {DB_HOST}:{DB_PORT} ({DB_NAME})...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    try:
        with connection.cursor() as cursor:
            # SQL 파일 읽기
            with open("migration_v2.sql", "r", encoding="utf-8") as f:
                sql_content = f.read()

            # 세미콜론 기준으로 구문 분리 (프로시저 제외하고 단순 분리 시도)
            # DELIMITER 처리가 복잡하므로, 여기서는 주요 ALTER 구문만 직접 실행하도록 함
            # 혹은 PyMySQL은 execute에 여러 구문을 한 번에 실행 못 할 수 있음.
            
            # 1. 테이블 생성
            print("Creating application_stage table...")
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS application_stage (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                stage_name VARCHAR(50) NOT NULL,
                stage_order INT NOT NULL DEFAULT 1,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                score DECIMAL(5, 2),
                pass_reason TEXT,
                fail_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE
            );
            """
            cursor.execute(create_table_sql)
            
            # 2. 컬럼 추가 (직접 확인 후 추가)
            print("Checking and adding columns to application table...")
            columns_to_add = [
                ("current_stage", "VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT' COMMENT '현재 진행 중인 전형 단계'"),
                ("overall_status", "VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' COMMENT '전체 지원 상태'"),
                ("final_score", "DECIMAL(5, 2) COMMENT '최종 합산 점수'"),
                ("ai_interview_video_url", "VARCHAR(400) COMMENT 'AI 면접 비디오 URL'")
            ]
            
            for col_name, col_def in columns_to_add:
                cursor.execute(f"SELECT count(*) as cnt FROM information_schema.columns WHERE table_schema = '{DB_NAME}' AND table_name = 'application' AND column_name = '{col_name}'")
                result = cursor.fetchone()
                if result['cnt'] == 0:
                    print(f"Adding column {col_name}...")
                    cursor.execute(f"ALTER TABLE application ADD COLUMN {col_name} {col_def}")
                else:
                    print(f"Column {col_name} already exists.")

        connection.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    apply_migration()

