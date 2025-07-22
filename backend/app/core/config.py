import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):

    # 메일 설정
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "your_email@gmail.com")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "your_app_password")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "your_email@gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")

    # Database (환경변수 우선, 기본값 fallback)
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3307")
    DB_NAME: str = os.getenv("DB_NAME", "kocruit_db")
    DB_USER: str = os.getenv("DB_USER", "myuser")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "1234")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4")
    
    # JWT
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1일(24시간)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Redis
    # REDIS_URL: str = "redis://localhost:6379"
    
    # AI API Keys
    OPENAI_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None
    
    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    KAKAO_CLIENT_ID: Optional[str] = None
    KAKAO_CLIENT_SECRET: Optional[str] = None
    NAVER_CLIENT_ID: Optional[str] = None
    NAVER_CLIENT_SECRET: Optional[str] = None
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # 추가 환경변수는 무시

settings = Settings()

# REDIS_CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL", 60 * 60))