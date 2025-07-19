import redis
import json
import hashlib
import functools
from typing import Optional, Any, Callable
from fastapi import Request
from app.core.config import settings

# Redis 클라이언트
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

def redis_cache(expire: int = 3600, key_prefix: str = "api_cache"):
    """
    Redis 캐시 데코레이터 (동기/비동기 함수 모두 지원)
    
    Args:
        expire: 캐시 만료 시간 (초)
        key_prefix: 캐시 키 접두사
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = generate_cache_key(func.__name__, args, kwargs, key_prefix)
            
            # 캐시에서 데이터 조회
            cached_data = redis_client.get(cache_key)
            if cached_data:
                try:
                    return json.loads(cached_data)
                except json.JSONDecodeError:
                    pass
            
            # 캐시에 없으면 함수 실행
            result = func(*args, **kwargs)
            
            # 결과를 캐시에 저장
            try:
                redis_client.setex(
                    cache_key,
                    expire,
                    json.dumps(result, ensure_ascii=False, default=str)
                )
            except Exception as e:
                print(f"캐시 저장 실패: {e}")
            
            return result
        
        return wrapper
    return decorator

def generate_cache_key(func_name: str, args: tuple, kwargs: dict, prefix: str) -> str:
    """캐시 키 생성"""
    # 함수명과 인자들을 문자열로 변환
    key_data = {
        'func': func_name,
        'args': args,
        'kwargs': kwargs
    }
    
    # JSON으로 직렬화하고 해시 생성
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    hash_value = hashlib.md5(key_string.encode()).hexdigest()
    
    return f"{prefix}:{func_name}:{hash_value}"

def invalidate_cache(pattern: str = "*"):
    """캐시 무효화"""
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
            return len(keys)
        return 0
    except Exception as e:
        print(f"캐시 무효화 실패: {e}")
        return 0

def get_cache_stats() -> dict:
    """캐시 통계 조회"""
    try:
        info = redis_client.info()
        return {
            'total_keys': info.get('db0', {}).get('keys', 0),
            'memory_usage': info.get('used_memory_human', 'N/A'),
            'connected_clients': info.get('connected_clients', 0)
        }
    except Exception as e:
        return {'error': str(e)} 