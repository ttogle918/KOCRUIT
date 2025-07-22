from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import time
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import engine
from app.models import Base
try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    print("⚠️ APScheduler not available, using fallback")
    BackgroundScheduler = None
from app.core.database import SessionLocal
from app.models.interview_evaluation import auto_process_applications
from sqlalchemy import text, inspect
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
from app.scheduler.job_status_scheduler import JobStatusScheduler
from app.scheduler.auto_written_test_grader import start_written_test_auto_grader


def safe_create_tables():
    """안전한 테이블 생성 - 기존 테이블은 건드리지 않고 새로운 테이블만 생성"""
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # 새로운 테이블들만 생성
        new_tables = [
            'interview_evaluation_item'  # 새로 추가된 테이블
        ]
        
        for table_name in new_tables:
            if table_name not in existing_tables:
                print(f"Creating new table: {table_name}")
                # 해당 테이블만 생성
                table = Base.metadata.tables.get(table_name)
                if table:
                    table.create(bind=engine, checkfirst=True)
                    print(f"✅ Table {table_name} created successfully")
                else:
                    print(f"⚠️ Table {table_name} not found in metadata")
            else:
                print(f"✅ Table {table_name} already exists")
        
        # 기존 테이블에 새로운 컬럼 추가 (필요한 경우)
        try:
            # interview_evaluation 테이블에 updated_at 컬럼 추가
            with engine.connect() as conn:
                result = conn.execute(text("SHOW COLUMNS FROM interview_evaluation LIKE 'updated_at'"))
                if not result.fetchone():
                    print("Adding updated_at column to interview_evaluation table")
                    conn.execute(text("ALTER TABLE interview_evaluation ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
                    conn.commit()
                    print("✅ updated_at column added successfully")
                else:
                    print("✅ updated_at column already exists")
        except Exception as e:
            print(f"⚠️ Column update check failed: {e}")
            
    except Exception as e:
        print(f"❌ Safe table creation failed: {e}")
from app.models.interview_evaluation import auto_process_applications, auto_evaluate_all_applications


# JobPost 상태 스케줄러 인스턴스 (싱글톤)
from app.scheduler.job_status_scheduler import JobStatusScheduler
job_status_scheduler = JobStatusScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== FastAPI 서버 시작 ===")
    
    # Startup
    print("🚀 Starting application...")
    
    # 안전한 테이블 생성
    safe_create_tables()
    Base.metadata.create_all(bind=engine)
    print("데이터베이스 테이블 생성 완료")
    
    # JobPost 상태 스케줄러 시작
    print("🔄 Starting JobPost status scheduler...")
    asyncio.create_task(job_status_scheduler.start())
    print("JobPost 상태 스케줄러 시작 완료")

    # 필기 답안 자동 채점 스케줄러 시작
    start_written_test_auto_grader()

    # 시드 데이터 실행
    try:
        import subprocess
        import os
        
        # 2_seed_data.py 파일이 있으면 실행
        seed_script_path = "/docker-entrypoint-initdb.d/2_seed_data.py"
        if os.path.exists(seed_script_path):
            print("시드 데이터 스크립트를 실행합니다...")
            result = subprocess.run(["python3", seed_script_path], 
                                  capture_output=True, text=True, check=True)
            print("시드 데이터 스크립트 실행 완료!")
            if result.stdout:
                print("출력:", result.stdout)
        else:
            print("시드 데이터 스크립트를 찾을 수 없습니다.")
            
    except Exception as e:
        print(f"시드 데이터 실행 중 오류: {e}")
    
    # 서버 시작 시 즉시 AI 평가 실행
    print("=== AI 평가 실행 시작 ===")
    try:
        print("서버 시작 시 AI 평가를 실행합니다...")
        run_auto_process()
        print("AI 평가 실행 완료!")
    except Exception as e:
        print(f"AI 평가 실행 중 오류: {e}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
    
    print("=== FastAPI 서버 시작 완료 ===")
    
    yield
    
    # Shutdown
    print("🔄 Stopping JobPost status scheduler...")
    await job_status_scheduler.stop()
    print("JobPost 상태 스케줄러 중지 완료")


app = FastAPI(
    title="KOSA Recruit API",
    description="Team project for FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

# FastAPI 등록된 경로 목록 출력 (디버깅용)
@app.on_event("startup")
async def print_routes():
    print("=== FastAPI 등록된 경로 목록 ===")
    for route in app.routes:
        try:
            # 타입 안전한 방식으로 라우트 정보 출력
            route_info = str(route)
            if hasattr(route, 'path'):
                path = getattr(route, 'path', 'N/A')
                methods = getattr(route, 'methods', set())
                print(f"{path} - {methods}")
            else:
                print(f"Route: {type(route).__name__}")
        except Exception as e:
            print(f"Route info error: {e}")

# 브라우저 캐싱 미들웨어
class CacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # GET 요청에 대해서만 캐싱 적용
        if request.method == "GET":
            # API 엔드포인트별 캐시 설정
            path = request.url.path
            
            if "/api/v1/applications/" in path:
                # 지원자 관련 API: 5분 캐시
                response.headers["Cache-Control"] = "public, max-age=300"
            elif "/api/v1/resumes/" in path:
                # 이력서 관련 API: 5분 캐시
                response.headers["Cache-Control"] = "public, max-age=300"
            elif "/api/v1/company/jobposts/" in path:
                # 채용공고 관련 API: 5분 캐시
                response.headers["Cache-Control"] = "public, max-age=300"
            elif "/api/v1/interview-questions/" in path:
                # 면접 질문 API: 30분 캐시 (LLM 결과)
                response.headers["Cache-Control"] = "public, max-age=1800"
            else:
                # 기본: 1분 캐시
                response.headers["Cache-Control"] = "public, max-age=60"
        
        return response

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://kocruit_react:5173",
        "http://frontend:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 브라우저 캐싱 미들웨어 추가
app.add_middleware(CacheMiddleware)

# API 라우터 등록
#app.include_router(api_router)
app.include_router(api_router, prefix="/api/v1")

# 헬스체크 엔드포인트
@app.get("/health")
async def health_check():
    """서버 상태 확인 엔드포인트"""
    return {"status": "healthy", "message": "Kocruit API is running"}

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {"message": "Welcome to Kocruit API"}

# 성능 모니터링 엔드포인트
@app.get("/performance")
async def performance_info():
    """성능 정보 엔드포인트"""
    from app.core.database import get_connection_info
    from app.core.cache import get_cache_stats
    from app.utils.llm_cache import get_cache_stats as llm_cache_stats
    
    try:
        db_info = get_connection_info()
        cache_stats = llm_cache_stats()
        
        return {
            "database": db_info,
            "cache": cache_stats,
            "timestamp": time.time()
        }
        cache_info = get_cache_stats()
        
        return {
            "database": db_info,
            "cache": cache_info,
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": str(e)}

def run_auto_process():
    print("run_auto_process called") 
    """자동 처리 함수"""
    db = SessionLocal()
    try:
        # 기존 자동 처리
        auto_process_applications(db)
        
        # AI 평가 배치 프로세스 추가
        auto_evaluate_all_applications(db)
        
        print("자동 처리 완료")
    except Exception as e:
        print(f"자동 처리 중 오류: {e}")
    finally:
        db.close()

# APScheduler 등록 (예: 10분마다 실행)
if BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_auto_process, 'interval', minutes=10)
    scheduler.start()
    print("✅ APScheduler started successfully")
else:
    print("⚠️ APScheduler not available, skipping scheduled jobs")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 