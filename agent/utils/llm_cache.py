import redis
import json
import hashlib
from functools import wraps
import os

# Redis 연결 설정 (원래 설정으로 복원)
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

# Redis 클라이언트 초기화 (연결 실패 시 None)
redis_client = None
try:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, socket_connect_timeout=5, socket_timeout=5)
    # 연결 테스트
    redis_client.ping()
    print(f"Redis connected successfully to {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    print(f"Redis connection failed: {e}")
    redis_client = None

def redis_cache(expire=60*60*24):
    """
    LLM 함수 결과를 Redis에 캐싱하는 데코레이터.
    - 입력값(파라미터) 조합으로 캐시 키 생성
    - 캐시 hit 시 바로 반환, miss 시 함수 실행 후 set
    - expire: 만료(초), 기본 24시간
    - Redis 연결 실패 시 캐싱 없이 함수 실행
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Redis가 연결되지 않은 경우 캐싱 없이 함수 실행
            if redis_client is None:
                return func(*args, **kwargs)
            
            # 입력 파라미터로 캐시 키 생성 (함수명+파라미터 해시)
            try:
                key_raw = f"{func.__name__}:{json.dumps(args, sort_keys=True, default=str)}:{json.dumps(kwargs, sort_keys=True, default=str)}"
            except Exception:
                key_raw = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            cache_key = "llm:" + hashlib.sha256(key_raw.encode()).hexdigest()
            
            try:
                cached = redis_client.get(cache_key)
                if cached is not None:
                    if isinstance(cached, bytes):
                        try:
                            return json.loads(cached.decode('utf-8'))
                        except Exception:
                            return cached.decode('utf-8')
                    else:
                        return cached
            except Exception as e:
                print(f"Redis get error: {e}")
                # Redis 오류 시 캐싱 없이 함수 실행
                pass
            
            result = func(*args, **kwargs)
            
            try:
                if isinstance(result, (dict, list)):
                    redis_client.set(cache_key, json.dumps(result), ex=expire)
                else:
                    redis_client.set(cache_key, result, ex=expire)
            except Exception as e:
                print(f"Redis set error: {e}")
                # Redis 저장 실패 시 무시하고 결과 반환
            
            return result
        return wrapper
    return decorator 

def clear_function_cache(function_name: str):
    """
    특정 함수의 모든 캐시를 제거합니다.
    
    Args:
        function_name: 캐시를 제거할 함수명
    """
    if redis_client is None:
        print(f"Redis not connected, cannot clear cache for function: {function_name}")
        return 0
    
    try:
        # 모든 키를 스캔하여 해당 함수명의 캐시를 찾아 제거
        pattern = f"llm:*"
        keys = redis_client.keys(pattern)
        removed_count = 0
        
        for key in keys:
            key_str = key.decode('utf-8') if isinstance(key, bytes) else key
            # 키에서 함수명 추출 (간단한 방법)
            if function_name in key_str:
                redis_client.delete(key)
                removed_count += 1
        
        print(f"Removed {removed_count} cache entries for function: {function_name}")
        return removed_count
    except Exception as e:
        print(f"Error clearing cache for {function_name}: {e}")
        return 0

def migrate_function_cache(old_function_name: str, new_function_name: str):
    """
    함수명 변경 시 캐시를 마이그레이션합니다.
    
    Args:
        old_function_name: 이전 함수명
        new_function_name: 새로운 함수명
    """
    if redis_client is None:
        print(f"Redis not connected, cannot migrate cache from {old_function_name} to {new_function_name}")
        return 0
    
    try:
        pattern = f"llm:*"
        keys = redis_client.keys(pattern)
        migrated_count = 0
        
        for key in keys:
            key_str = key.decode('utf-8') if isinstance(key, bytes) else key
            if old_function_name in key_str:
                # 기존 데이터 가져오기
                cached_data = redis_client.get(key)
                if cached_data:
                    # 새로운 키 생성
                    new_key = key_str.replace(old_function_name, new_function_name)
                    # 새로운 키로 데이터 저장
                    redis_client.set(new_key, cached_data, ex=60*60*24)  # 24시간
                    # 기존 키 삭제
                    redis_client.delete(key)
                    migrated_count += 1
        
        print(f"Migrated {migrated_count} cache entries from {old_function_name} to {new_function_name}")
        return migrated_count
    except Exception as e:
        print(f"Error migrating cache from {old_function_name} to {new_function_name}: {e}")
        return 0 