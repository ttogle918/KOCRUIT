#!/usr/bin/env python3
"""
평가 기준 생성 함수의 캐시를 클리어하는 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import redis
import os

def clear_evaluation_cache():
    """평가 기준 생성 관련 캐시 클리어"""
    try:
        # Redis 연결
        redis_host = os.environ.get("REDIS_HOST", "localhost")
        redis_port = int(os.environ.get("REDIS_PORT", 6379))
        
        redis_client = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            db=0, 
            socket_connect_timeout=5, 
            socket_timeout=5
        )
        
        # 연결 테스트
        redis_client.ping()
        print(f"✅ Redis 연결 성공: {redis_host}:{redis_port}")
        
        # 평가 기준 생성 관련 함수들의 캐시 클리어
        function_names = [
            "suggest_evaluation_criteria",
            "generate_personal_questions", 
            "generate_common_questions",
            "generate_company_questions",
            "generate_job_question_bundle",
            "generate_resume_analysis_report",
            "generate_interview_checklist",
            "analyze_candidate_strengths_weaknesses",
            "generate_interview_guideline",
            "generate_advanced_competency_questions",
            "generate_executive_interview_questions",
            "generate_second_interview_questions",
            "generate_final_interview_questions"
        ]
        
        total_removed = 0
        
        for func_name in function_names:
            try:
                # 모든 키를 스캔하여 해당 함수명의 캐시를 찾아 제거
                pattern = "llm:*"
                keys = redis_client.keys(pattern)
                removed_count = 0
                
                for key in keys:
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    # 키에서 함수명 추출 (간단한 방법)
                    if func_name in key_str:
                        redis_client.delete(key)
                        removed_count += 1
                
                if removed_count > 0:
                    print(f"🗑️ {func_name}: {removed_count}개 캐시 삭제")
                    total_removed += removed_count
                else:
                    print(f"ℹ️ {func_name}: 삭제할 캐시 없음")
                    
            except Exception as e:
                print(f"❌ {func_name} 캐시 삭제 중 오류: {str(e)}")
        
        print(f"\n✅ 총 {total_removed}개의 캐시가 삭제되었습니다.")
        
        # 전체 캐시 상태 확인
        all_keys = redis_client.keys("llm:*")
        print(f"📊 현재 남은 LLM 캐시: {len(all_keys)}개")
        
        if len(all_keys) > 0:
            print("🔍 남은 캐시 키 샘플:")
            for i, key in enumerate(all_keys[:5]):
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                print(f"  {i+1}. {key_str}")
            if len(all_keys) > 5:
                print(f"  ... 외 {len(all_keys) - 5}개")
        
    except redis.ConnectionError:
        print("❌ Redis 연결 실패")
    except Exception as e:
        print(f"❌ 캐시 클리어 중 오류 발생: {str(e)}")

def clear_all_llm_cache():
    """모든 LLM 관련 캐시 클리어"""
    try:
        # Redis 연결
        redis_host = os.environ.get("REDIS_HOST", "localhost")
        redis_port = int(os.environ.get("REDIS_PORT", 6379))
        
        redis_client = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            db=0, 
            socket_connect_timeout=5, 
            socket_timeout=5
        )
        
        # 연결 테스트
        redis_client.ping()
        print(f"✅ Redis 연결 성공: {redis_host}:{redis_port}")
        
        # 모든 LLM 캐시 삭제
        pattern = "llm:*"
        keys = redis_client.keys(pattern)
        
        if keys:
            for key in keys:
                redis_client.delete(key)
            print(f"🗑️ 모든 LLM 캐시 삭제 완료: {len(keys)}개")
        else:
            print("ℹ️ 삭제할 LLM 캐시가 없습니다.")
            
    except redis.ConnectionError:
        print("❌ Redis 연결 실패")
    except Exception as e:
        print(f"❌ 전체 캐시 클리어 중 오류 발생: {str(e)}")

def main():
    """메인 함수"""
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        print("🗑️ 모든 LLM 캐시를 삭제합니다...")
        clear_all_llm_cache()
    else:
        print("🗑️ 평가 기준 생성 관련 캐시를 삭제합니다...")
        clear_evaluation_cache()
    
    print("\n💡 이제 평가 기준을 다시 생성하면 새로운 결과를 얻을 수 있습니다!")

if __name__ == "__main__":
    main() 