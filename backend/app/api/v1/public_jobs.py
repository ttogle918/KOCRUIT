from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import OperationalError, DisconnectionError
from typing import List
import logging
import time
from app.core.database import get_db
from app.core.cache import cache_result, invalidate_cache, CACHE_KEYS
from app.schemas.job import JobPostDetail, JobPostList
from app.models.job import JobPost

# 로깅 설정
logger = logging.getLogger(__name__)

router = APIRouter()


def execute_with_retry(db: Session, query_func, max_retries=3, delay=1):
    """데이터베이스 쿼리 실행 시 재시도 로직"""
    for attempt in range(max_retries):
        try:
            return query_func()
        except (OperationalError, DisconnectionError) as e:
            if "Lost connection" in str(e) or "MySQL server has gone away" in str(e):
                logger.warning(f"Database connection lost, attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(delay * (attempt + 1))  # 지수 백오프
                    # 세션 재생성 시도
                    try:
                        db.rollback()
                        db.close()
                        # 새로운 세션으로 재시도
                        from app.core.database import SessionLocal
                        db = SessionLocal()
                    except Exception as session_error:
                        logger.error(f"Session recreation failed: {session_error}")
                        continue
                else:
                    logger.error(f"Max retries reached for database operation: {e}")
                    raise HTTPException(
                        status_code=503,
                        detail="Database connection error. Please try again later."
                    )
            else:
                raise
        except Exception as e:
            logger.error(f"Unexpected database error: {e}")
            raise HTTPException(
                status_code=500,
                detail="Internal server error"
            )


@router.get("/", response_model=List[JobPostList])
@cache_result(expire_time=3600, key_prefix="job_posts")  # 1시간 캐싱 (t3.small 최적화)
def get_public_job_posts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """지원자가 볼 수 있는 공개 채용공고 목록"""
    try:
        def query_job_posts():
            # t3.small 최적화: 필요한 컬럼만 선택하고 JOIN 최적화
            job_posts = db.query(JobPost).filter(
                JobPost.status.in_(["SCHEDULED", "RECRUITING"])
            ).options(
                joinedload(JobPost.company)  # 지연 로딩으로 성능 향상
            ).offset(skip).limit(limit).all()
            
            # Add company name to each job post
            for job_post in job_posts:
                if job_post.company:
                    job_post.companyName = job_post.company.name
            
            return job_posts
        
        return execute_with_retry(db, query_job_posts)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_public_job_posts: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve job posts"
        )


@router.get("/{job_post_id}", response_model=JobPostDetail)
@cache_result(expire_time=7200, key_prefix="job_post_detail")  # 2시간 캐싱 (t3.small 최적화)
def get_public_job_post(
    job_post_id: int, 
    db: Session = Depends(get_db)
):
    """지원자가 볼 수 있는 공개 채용공고 상세"""
    try:
        def query_job_post():
            job_post = db.query(JobPost).filter(
                JobPost.id == job_post_id,
                JobPost.status.in_(["SCHEDULED", "RECRUITING"])
            ).first()
            
            if not job_post:
                raise HTTPException(status_code=404, detail="Job post not found")
            
            # Add company name to the response
            if job_post.company:
                job_post.companyName = job_post.company.name
            
            return job_post
        
        return execute_with_retry(db, query_job_post)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_public_job_post: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve job post"
        )


@router.post("/cache/clear")
def clear_job_posts_cache():
    """채용공고 관련 캐시 무효화 (관리자용)"""
    try:
        invalidate_cache("cache:job_posts:*")
        invalidate_cache("cache:job_post_detail:*")
        return {"message": "Job posts cache cleared successfully"}
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear cache"
        ) 