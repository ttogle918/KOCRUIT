import redis
import json
import pickle
from typing import Any, Optional, Union
from functools import wraps
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis 클라이언트 설정
redis_client = redis.Redis(
    host='redis',  # Docker Compose에서 설정한 서비스명
    port=6379,
    db=0,
    decode_responses=False,  # 바이너리 데이터 지원
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True
)

def cache_result(expire_time: int = 3600, key_prefix: str = "cache"):
    """
    함수 결과를 Redis에 캐싱하는 데코레이터
    
    Args:
        expire_time: 캐시 만료 시간 (초)
        key_prefix: 캐시 키 접두사
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            try:
                # 캐시에서 데이터 확인
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    logger.info(f"Cache hit for {cache_key}")
                    return pickle.loads(cached_data)
                
                # 캐시 미스 - 함수 실행
                logger.info(f"Cache miss for {cache_key}")
                result = func(*args, **kwargs)
                
                # 결과를 캐시에 저장
                if result is not None:
                    redis_client.setex(
                        cache_key,
                        expire_time,
                        pickle.dumps(result)
                    )
                    logger.info(f"Cached result for {cache_key}")
                
                return result
                
            except redis.RedisError as e:
                logger.warning(f"Redis error: {e}, falling back to direct execution")
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Cache error: {e}")
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

def invalidate_cache(pattern: str):
    """
    특정 패턴의 캐시를 무효화
    
    Args:
        pattern: 무효화할 캐시 패턴 (예: "cache:get_public_job_posts:*")
    """
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache keys matching pattern: {pattern}")
    except redis.RedisError as e:
        logger.warning(f"Failed to invalidate cache: {e}")

def get_cache_stats():
    """캐시 통계 정보 반환"""
    try:
        info = redis_client.info()
        return {
            "used_memory": info.get("used_memory_human", "N/A"),
            "connected_clients": info.get("connected_clients", 0),
            "total_commands_processed": info.get("total_commands_processed", 0),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0)
        }
    except redis.RedisError as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {"error": str(e)}

# 캐시 키 상수
CACHE_KEYS = {
    "JOB_POSTS": "cache:job_posts",
    "COMPANY_INFO": "cache:company_info",
    "USER_DATA": "cache:user_data",
    "RESUME_DATA": "cache:resume_data"
} 