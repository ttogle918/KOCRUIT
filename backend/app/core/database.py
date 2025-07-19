from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings
import logging
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# AWS RDS 최적화를 위한 연결 풀 설정 (t3.small 최적화)
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=int(os.getenv("MYSQL_MAX_CONNECTIONS", 15)),  # t3.small 최적화
    max_overflow=int(os.getenv("MYSQL_MAX_CONNECTIONS", 15)) * 1.5,  # 최대 추가 연결
    pool_pre_ping=True,  # 연결 전 ping으로 연결 상태 확인
    pool_recycle=1200,  # 20분마다 연결 재생성 (t3.small 최적화)
    pool_timeout=20,  # 연결 대기 시간 단축
    echo=False,  # SQL 로그 출력 비활성화 (성능 향상)
    # AWS RDS MySQL 최적화 설정 (t3.small용)
    connect_args={
        "connect_timeout": int(os.getenv("MYSQL_CONNECT_TIMEOUT", 10)),  # 연결 타임아웃 단축
        "read_timeout": int(os.getenv("MYSQL_READ_TIMEOUT", 10)),       # 읽기 타임아웃 단축
        "write_timeout": int(os.getenv("MYSQL_WRITE_TIMEOUT", 10)),     # 쓰기 타임아웃 단축
        "charset": "utf8mb4",
        "autocommit": False,
        "sql_mode": "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO",
        # 성능 최적화
        "init_command": "SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'",
        "use_unicode": True,
        "collation": "utf8mb4_unicode_ci",
        # 추가 성능 최적화
        "ssl": {"ssl": {}}  # SSL 연결
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 클래스 생성
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def get_connection_info():
    """데이터베이스 연결 정보 반환"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SHOW VARIABLES LIKE 'max_connections'"))
            max_connections = result.fetchone()
            
            result = connection.execute(text("SHOW STATUS LIKE 'Threads_connected'"))
            current_connections = result.fetchone()
            
            return {
                "max_connections": max_connections[1] if max_connections else "N/A",
                "current_connections": current_connections[1] if current_connections else "N/A",
                "pool_size": getattr(engine.pool, 'size', lambda: 'N/A')(),
                "checked_in": getattr(engine.pool, 'checkedin', lambda: 'N/A')(),
                "checked_out": getattr(engine.pool, 'checkedout', lambda: 'N/A')(),
                "overflow": getattr(engine.pool, 'overflow', lambda: 'N/A')()
            }
    except Exception as e:
        logger.error(f"Failed to get connection info: {e}")
        return {"error": str(e)} 