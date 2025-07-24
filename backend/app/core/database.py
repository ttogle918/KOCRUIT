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

# AWS RDS 최적화를 위한 연결 풀 설정 (MySQL Connector/Python 8.3.0 호환)
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=int(os.getenv("MYSQL_MAX_CONNECTIONS", 10)),
    max_overflow=int(os.getenv("MYSQL_MAX_CONNECTIONS", 10)) * 2,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_timeout=30,
    echo=False,
    # MySQL Connector/Python 8.3.0 호환 설정
    connect_args={
        "connect_timeout": int(os.getenv("MYSQL_CONNECT_TIMEOUT", 30)),
        "read_timeout": int(os.getenv("MYSQL_READ_TIMEOUT", 30)),
        "write_timeout": int(os.getenv("MYSQL_WRITE_TIMEOUT", 30)),
        "charset": "utf8mb4",
        "autocommit": False,
        "use_unicode": True,
        "sql_mode": "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO"
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