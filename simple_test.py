#!/usr/bin/env python3
"""
AI 면접 워크플로우 간단 테스트
"""

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
            
            # 시나리오 질문 확인
            scenarios = result.get('scenario_questions', {})
            if scenarios:
                print("\n시나리오 질문:")
                for category, questions in scenarios.items():
                    print(f"  - {category}: {len(questions)}개")
                    if questions:
                        print(f"    예시: {questions[0]}")
            
            return True
        else:
            print(f"❌ AI 면접 워크플로우 실패: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ AI 면접 워크플로우 오류: {str(e)}")
        import traceback
        print(f"상세 오류: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    print("🚀 AI 면접 워크플로우 테스트 시작")
    
    if test_ai_interview_workflow():
        print("\n🎉 AI 면접 워크플로우 테스트 성공!")
    else:
        print("\n⚠️ AI 면접 워크플로우 테스트 실패!") 