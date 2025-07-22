import redis
import json
import hashlib
import functools
from typing import Any, Optional
import asyncio
from aiocache import cached
from aiocache.backends.redis import RedisCache

redis_client = redis.Redis(host='redis', port=6379, db=0)

def redis_cache(expire=60*60*24):
    """
    LLM 함수 결과를 Redis에 캐싱하는 데코레이터.
    - 입력값(파라미터) 조합으로 캐시 키 생성
    - 캐시 hit 시 바로 반환, miss 시 함수 실행 후 set
    - expire: 만료(초), 기본 24시간
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # 입력 파라미터로 캐시 키 생성 (함수명+파라미터 해시)
            try:
                key_raw = f"{func.__name__}:{json.dumps(args, sort_keys=True, default=str)}:{json.dumps(kwargs, sort_keys=True, default=str)}"
            except Exception:
                key_raw = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            cache_key = "llm:" + hashlib.sha256(key_raw.encode()).hexdigest()
            cached = redis_client.get(cache_key)
            if cached is not None:
                if isinstance(cached, bytes):
                    try:
                        return json.loads(cached.decode('utf-8'))
                    except Exception:
                        return cached.decode('utf-8')
                else:
                    return cached
            result = func(*args, **kwargs)
            if isinstance(result, (dict, list)):
                redis_client.set(cache_key, json.dumps(result), ex=expire)
            else:
                redis_client.set(cache_key, result, ex=expire)
            return result
        return wrapper
    return decorator

# 비동기 Redis 캐시 설정
async def get_async_cache():
    """비동기 Redis 캐시 인스턴스 반환"""
    return RedisCache(
        endpoint="redis",
        port=6379,
        db=0,
        timeout=60
    )

def async_redis_cache(ttl: int = 3600):
    """비동기 함수용 Redis 캐시 데코레이터"""
    def decorator(func):
        @cached(
            ttl=ttl,
            cache=RedisCache,
            endpoint="redis",
            port=6379,
            db=0,
            timeout=60
        )
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator 