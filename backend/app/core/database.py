from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os

# 환경 변수에서 데이터베이스 설정 가져오기
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "kocruit")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# 데이터베이스 URL 생성
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 엔진 생성 (연결 풀 및 재연결 설정)
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,  # 연결 풀 크기
    max_overflow=20,  # 최대 오버플로우 연결 수
    pool_pre_ping=True,  # 연결 전 ping으로 유효성 검사
    pool_recycle=3600,  # 1시간마다 연결 재생성
    connect_args={
        "connect_timeout": 60,  # 연결 타임아웃 60초
        "read_timeout": 60,     # 읽기 타임아웃 60초
        "write_timeout": 60,    # 쓰기 타임아웃 60초
        "charset": "utf8mb4",   # 문자셋 설정
        "autocommit": False,    # 자동 커밋 비활성화
    }
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 클래스 생성
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 