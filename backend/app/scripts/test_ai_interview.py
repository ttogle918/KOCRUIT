#!/usr/bin/env python3
"""
AI 면접 시스템 테스트 스크립트
"""

import requests
import json

def test_ai_interview_questions():
    """AI 면접 질문 생성 테스트"""
    
    print("=== AI 면접 질문 생성 테스트 ===")
    
    # AI 면접 질문 생성
    url = "http://localhost:8000/api/v1/ai-interview/generate-ai-interview-questions"
    data = {"job_info": "IT 개발자"}
    
    try:
        response = requests.post(url, json=data)
        print(f"응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 성공: {result.get('message', '')}")
            print(f"생성된 질문 수: {result.get('total_questions', 0)}")
            
            # 카테고리별 질문 수 확인
            questions_by_category = result.get('questions_by_category', {})
            for category, questions in questions_by_category.items():
                print(f"  - {category}: {len(questions)}개")
        else:
            print(f"❌ 실패: {response.text}")
            
    except Exception as e:
        print(f"❌ 오류: {str(e)}")

def test_ai_interview_scenarios():
    """AI 면접 시나리오 조회 테스트"""
    
    print("\n=== AI 면접 시나리오 조회 테스트 ===")
    
    url = "http://localhost:8000/api/v1/ai-interview/ai-interview-scenarios"
    
    try:
        response = requests.get(url)
        print(f"응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 성공: 시나리오 {result.get('total_scenarios', 0)}개")
            
            scenarios = result.get('scenarios', {})
            for key, scenario in scenarios.items():
                print(f"  - {scenario['name']}: {scenario['description']}")
                print(f"    소요시간: {scenario['duration']}, 중점: {scenario['focus']}")
        else:
            print(f"❌ 실패: {response.text}")
            
    except Exception as e:
        print(f"❌ 오류: {str(e)}")

def test_ai_interview_questions_retrieval():
    """AI 면접 질문 조회 테스트"""
    
    print("\n=== AI 면접 질문 조회 테스트 ===")
    
    url = "http://localhost:8000/api/v1/ai-interview/ai-interview-questions"
    
    try:
        response = requests.get(url)
        print(f"응답 상태: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 성공: 총 {result.get('total_questions', 0)}개 질문")
            
            questions_by_category = result.get('questions_by_category', {})
            for category, questions in questions_by_category.items():
                print(f"  - {category}: {len(questions)}개")
                if questions:
                    print(f"    예시: {questions[0]['question_text'][:50]}...")
        else:
            print(f"❌ 실패: {response.text}")
            
    except Exception as e:
        print(f"❌ 오류: {str(e)}")

def test_ai_interview_workflow():
    """AI 면접 워크플로우 테스트"""
    
    print("\n=== AI 면접 워크플로우 테스트 ===")
    
    try:
        # AI 면접 워크플로우 직접 테스트
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
            print(f"✅ AI 면접 워크플로우 성공")
            print(f"총점: {result.get('total_score', 0)}")
            print(f"영역별 점수:")
            for area, score in result.get('area_scores', {}).items():
                print(f"  - {area}: {score}")
        else:
            print(f"❌ AI 면접 워크플로우 실패: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ AI 면접 워크플로우 오류: {str(e)}")

if __name__ == "__main__":
    print("🚀 AI 면접 시스템 테스트 시작")
    
    # 1. AI 면접 질문 생성 테스트
    test_ai_interview_questions()
    
    # 2. AI 면접 시나리오 조회 테스트
    test_ai_interview_scenarios()
    
    # 3. AI 면접 질문 조회 테스트
    test_ai_interview_questions_retrieval()
    
    # 4. AI 면접 워크플로우 테스트
    test_ai_interview_workflow()
    
    print("\n�� AI 면접 시스템 테스트 완료") 