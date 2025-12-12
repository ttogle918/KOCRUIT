import redis
import json
import os
from datetime import datetime

class RedisMonitor:
    def __init__(self):
        # Docker Compose 환경의 redis 호스트 사용
        self.redis_host = os.getenv("REDIS_HOST", "redis")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.redis_client = None
        self.connect()

    def connect(self):
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=0,
                decode_responses=True, # 문자열로 자동 디코딩
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            print(f"Redis connected successfully to {self.redis_host}:{self.redis_port}")
        except Exception as e:
            print(f"Failed to connect to Redis: {e}")
            self.redis_client = None

    def get_health_status(self):
        """Redis 서버 상태 반환"""
        if not self.redis_client:
            self.connect()
            if not self.redis_client:
                return {"status": "error", "message": "Disconnected"}
        
        try:
            info = self.redis_client.info()
            return {
                "status": "healthy",
                "used_memory_human": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "uptime_in_days": info.get("uptime_in_days")
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_session_statistics(self):
        """현재 저장된 세션(대화) 통계"""
        if not self.redis_client:
            return {"error": "Redis not connected"}
        
        try:
            # LangChainChatMessageHistory는 보통 'message_store:{session_id}' 형태로 저장됨
            keys = self.redis_client.keys("message_store:*")
            return {
                "total_sessions": len(keys),
                "keys": keys[:10] # 예시로 10개만 반환
            }
        except Exception as e:
            return {"error": str(e)}

    def cleanup_expired_sessions(self):
        """만료된 세션 정리 (Redis는 TTL로 자동 관리되지만 수동 정리 로직이 필요하다면 구현)"""
        # Redis TTL을 사용하므로 실제로는 불필요할 수 있으나, 인터페이스 유지를 위해 남김
        return {"message": "Redis handles expiration automatically via TTL."}

    def backup_conversations(self, name):
        """대화 내용 백업 (JSON 파일로 저장)"""
        if not self.redis_client:
            return {"error": "Redis not connected"}
        
        try:
            keys = self.redis_client.keys("message_store:*")
            backup_data = {}
            for key in keys:
                # List 타입인 경우
                if self.redis_client.type(key) == 'list':
                    backup_data[key] = self.redis_client.lrange(key, 0, -1)
                # String(JSON) 타입인 경우
                elif self.redis_client.type(key) == 'string':
                    backup_data[key] = self.redis_client.get(key)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"backup_{name}_{timestamp}.json"
            
            os.makedirs("backups", exist_ok=True)
            with open(f"backups/{filename}", "w", encoding="utf-8") as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
                
            return {"message": f"Backup created: {filename}", "count": len(backup_data)}
        except Exception as e:
            return {"error": str(e)}

    def restore_conversations(self, file_path):
        """백업 파일에서 복구"""
        if not self.redis_client:
            return {"error": "Redis not connected"}
            
        try:
            if not os.path.exists(file_path):
                return {"error": "File not found"}
                
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            count = 0
            for key, value in data.items():
                self.redis_client.delete(key) # 기존 키 삭제
                if isinstance(value, list):
                    self.redis_client.rpush(key, *value)
                else:
                    self.redis_client.set(key, value)
                count += 1
                
            return {"message": "Restore completed", "restored_keys": count}
        except Exception as e:
            return {"error": str(e)}

    def get_backup_list(self):
        """백업 파일 목록"""
        try:
            if not os.path.exists("backups"):
                return []
            return os.listdir("backups")
        except Exception:
            return []

    def delete_backup(self, name):
        try:
            path = f"backups/{name}"
            if os.path.exists(path):
                os.remove(path)
                return {"message": "Backup deleted"}
            return {"error": "File not found"}
        except Exception as e:
            return {"error": str(e)}

    def set_memory_limit(self, limit_mb):
        """메모리 제한 설정 (CONFIG SET)"""
        if not self.redis_client:
            return {"error": "Redis not connected"}
        try:
            # maxmemory 설정 (바이트 단위)
            bytes_limit = int(limit_mb) * 1024 * 1024
            self.redis_client.config_set("maxmemory", bytes_limit)
            return {"message": f"Memory limit set to {limit_mb}MB"}
        except Exception as e:
            return {"error": str(e)}

    # 스케줄러 제어용 더미 메서드 (실제 구현은 scheduler.py에서 담당하거나 여기서 플래그 관리)
    def start_monitoring(self): pass
    def stop_monitoring(self): pass
    def enable_auto_cleanup(self): pass
    def disable_auto_cleanup(self): pass
