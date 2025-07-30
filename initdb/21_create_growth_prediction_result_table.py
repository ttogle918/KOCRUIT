import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

def create_growth_prediction_result_table():
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
            
            # growth_prediction_result 테이블 생성
            create_table_query = """
            CREATE TABLE IF NOT EXISTS growth_prediction_result (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                jobpost_id INT,
                company_id INT,
                
                -- 성장가능성 예측 결과 데이터 (JSON 형태로 저장)
                total_score FLOAT NOT NULL,  -- 총점
                detail JSON,  -- 항목별 상세 점수
                comparison_chart_data JSON,  -- 비교 차트 데이터
                reasons JSON,  -- 예측 근거
                boxplot_data JSON,  -- 박스플롯 데이터
                detail_explanation JSON,  -- 항목별 상세 설명
                item_table JSON,  -- 표 데이터
                narrative TEXT,  -- 자동 요약 설명
                
                -- 메타데이터
                analysis_version VARCHAR(50) DEFAULT '1.0',  -- 분석 버전
                analysis_duration FLOAT,  -- 분석 소요 시간 (초)
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- 외래키 제약조건
                FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
                FOREIGN KEY (jobpost_id) REFERENCES jobpost(id) ON DELETE SET NULL,
                FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL,
                
                -- 인덱스 생성 (조회 성능 향상)
                INDEX idx_growth_prediction_application_id (application_id),
                INDEX idx_growth_prediction_jobpost_id (jobpost_id),
                INDEX idx_growth_prediction_company_id (company_id),
                INDEX idx_growth_prediction_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            cursor.execute(create_table_query)
            connection.commit()
            
            print("✅ growth_prediction_result 테이블이 성공적으로 생성되었습니다.")
            
            # 테이블 구조 확인
            cursor.execute("DESCRIBE growth_prediction_result")
            columns = cursor.fetchall()
            
            print("\n📋 테이블 구조:")
            for column in columns:
                print(f"  - {column[0]}: {column[1]}")
                
        else:
            print("❌ 데이터베이스 연결에 실패했습니다.")
            
    except Error as e:
        print(f"❌ 데이터베이스 오류: {e}")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()
            print("🔌 데이터베이스 연결이 종료되었습니다.")

if __name__ == "__main__":
    create_growth_prediction_result_table() 