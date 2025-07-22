#!/usr/bin/env python3
"""
간단한 AI 면접 시스템 테스트
"""

import sys
import os
import asyncio
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_ai_interview_workflow():
    """AI 면접 워크플로우 테스트"""
    print("=== AI 면접 워크플로우 테스트 ===")
    
    try:
        from agent.agents.ai_interview_workflow import run_ai_interview
        
        result = run_ai_interview(
            session_id="test_session_001",
            job_info="IT 개발자",
            audio_data={
                "transcript": "안녕하세요, 자기소개를 해드리겠습니다.",
                "audio_features": {"volume": 0.5, "pitch": 200, "speech_rate": 150, "clarity": 0.8}
            },
            behavior_data={
                "eye_contact": 7,
                "facial_expression": 8,
                "posture": 6,
                "tone": 7,
                "extraversion": 6,
                "openness": 7,
                "conscientiousness": 8,
                "agreeableness": 7,
                "neuroticism": 4
            },
            game_data={
                "focus_score": 7,
                "response_time_score": 8,
                "memory_score": 6,
                "situation_score": 7,
                "problem_solving_score": 8
            }
        )
        
        if "error" not in result:
            print("✅ AI 면접 워크플로우 성공!")
            print(f"총점: {result.get('total_score', 0)}")
            print("영역별 점수:")
            for area, score in result.get('area_scores', {}).items():
                print(f"  - {area}: {score}")
            
            # 평가 지표 확인
            metrics = result.get('evaluation_metrics', {})
            print("\n평가 지표:")
            for metric, values in metrics.items():
                if isinstance(values, dict) and 'total' in values:
                    print(f"  - {metric}: {values['total']}")
            
            return True
        else:
            print(f"❌ AI 면접 워크플로우 실패: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ AI 면접 워크플로우 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False

async def test_ai_interview_questions():
    """AI 면접 질문 생성 테스트"""
    print("\n=== AI 면접 질문 생성 테스트 ===")
    
    try:
        from app.api.v1.ai_interview_questions import generate_ai_interview_questions
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        result = await generate_ai_interview_questions(job_info="IT 개발자", db=db)
        db.close()
        
        if result.get('success'):
            print("✅ AI 면접 질문 생성 성공!")
            print(f"생성된 질문 수: {result.get('total_questions', 0)}")
            
            questions_by_category = result.get('questions_by_category', {})
            for category, questions in questions_by_category.items():
                print(f"  - {category}: {len(questions)}개")
            
            return True
        else:
            print(f"❌ AI 면접 질문 생성 실패: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ AI 면접 질문 생성 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False

async def test_realtime_interview():
    """실시간 면접 API 테스트"""
    print("\n=== 실시간 면접 API 테스트 ===")
    
    try:
        from app.api.v1.realtime_interview import process_audio_chunk
        import tempfile
        import os
        
        # 테스트용 오디오 파일 생성
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(b"dummy audio data")
            temp_audio_path = temp_file.name
        
        # 비동기 함수 실행
        result = await process_audio_chunk(temp_audio_path, 1234567890.0)
        
        # 임시 파일 삭제
        os.unlink(temp_audio_path)
        
        if result.get('success'):
            print("✅ 실시간 면접 API 성공!")
            print(f"평가 점수: {result.get('evaluation', {}).get('score', 0)}")
            
            # 평가 지표 확인
            metrics = result.get('evaluation', {}).get('metrics', {})
            if metrics:
                print("평가 지표:")
                for metric, values in metrics.items():
                    if isinstance(values, dict) and 'total' in values:
                        print(f"  - {metric}: {values['total']}")
            
            return True
        else:
            print(f"❌ 실시간 면접 API 실패: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ 실시간 면접 API 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False

async def test_ai_interview_scenarios():
    """AI 면접 시나리오 테스트"""
    print("\n=== AI 면접 시나리오 테스트 ===")
    
    try:
        from app.api.v1.ai_interview_questions import get_ai_interview_scenarios
        
        result = await get_ai_interview_scenarios()
        
        if result.get('success'):
            print("✅ AI 면접 시나리오 조회 성공!")
            print(f"시나리오 수: {result.get('total_scenarios', 0)}")
            
            scenarios = result.get('scenarios', {})
            for key, scenario in scenarios.items():
                print(f"  - {scenario['name']}: {scenario['description']}")
                print(f"    소요시간: {scenario['duration']}, 중점: {scenario['focus']}")
            
            return True
        else:
            print(f"❌ AI 면접 시나리오 조회 실패")
            return False
            
    except Exception as e:
        print(f"❌ AI 면접 시나리오 조회 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False

async def main():
    """메인 테스트 함수"""
    print("🚀 AI 면접 시스템 테스트 시작")
    
    success_count = 0
    total_tests = 4
    
    # 1. AI 면접 워크플로우 테스트
    if test_ai_interview_workflow():
        success_count += 1
    
    # 2. AI 면접 질문 생성 테스트
    if await test_ai_interview_questions():
        success_count += 1
    
    # 3. 실시간 면접 API 테스트
    if await test_realtime_interview():
        success_count += 1
    
    # 4. AI 면접 시나리오 테스트
    if await test_ai_interview_scenarios():
        success_count += 1
    
    print(f"\n🎯 테스트 결과: {success_count}/{total_tests} 성공")
    
    if success_count == total_tests:
        print("🎉 모든 테스트가 성공했습니다!")
    else:
        print("⚠️ 일부 테스트가 실패했습니다.")

if __name__ == "__main__":
    asyncio.run(main()) 