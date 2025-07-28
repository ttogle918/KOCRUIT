import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

def create_analysis_result_table():
    connection = None
    try:
        # 데이터베이스 연결
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'kocruit'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', '')
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # analysis_result 테이블 생성
            create_table_query = """
            CREATE TABLE IF NOT EXISTS analysis_result (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                resume_id INT NOT NULL,
                jobpost_id INT,
                company_id INT,
                analysis_type VARCHAR(50) NOT NULL,
                analysis_data JSON NOT NULL,
                analysis_version VARCHAR(50) DEFAULT '1.0',
                analysis_duration FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_application_analysis (application_id, analysis_type),
                INDEX idx_resume_id (resume_id),
                INDEX idx_jobpost_id (jobpost_id),
                INDEX idx_company_id (company_id),
                FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
                FOREIGN KEY (resume_id) REFERENCES resume(id) ON DELETE CASCADE,
                FOREIGN KEY (jobpost_id) REFERENCES jobpost(id) ON DELETE SET NULL,
                FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            cursor.execute(create_table_query)
            connection.commit()
            
            print("✅ analysis_result 테이블이 성공적으로 생성되었습니다.")
            
    except Error as e:
        print(f"❌ 데이터베이스 오류: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 데이터베이스 연결이 종료되었습니다.")

if __name__ == "__main__":
    create_analysis_result_table() 