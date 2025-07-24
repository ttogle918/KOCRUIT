#!/usr/bin/env python3
"""
AI 질문 생성 기능 테스트
"""

import asyncio
import sys
import os

# agent 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.ai_question_generation_workflow import generate_ai_scenario_questions, generate_follow_up_questions

async def test_ai_question_generation():
    """AI 질문 생성 테스트"""
    print("🚀 AI 질문 생성 테스트 시작")
    print("=" * 50)
    
    # 테스트 데이터
    job_title = "백엔드 개발자"
    job_description = """
    - Java, Spring Boot를 활용한 웹 애플리케이션 개발
    - RESTful API 설계 및 구현
    - MySQL, Redis 데이터베이스 설계 및 최적화
    - AWS 클라우드 인프라 관리
    - 마이크로서비스 아키텍처 설계
    - 팀 프로젝트 협업 및 코드 리뷰
    """
    company_name = "테크스타트업"
    required_skills = ["Java", "Spring Boot", "MySQL", "AWS", "RESTful API"]
    
    try:
        print("📝 AI 시나리오 질문 생성 중...")
        question_set = await generate_ai_scenario_questions(
            job_title=job_title,
            job_description=job_description,
            company_name=company_name,
            required_skills=required_skills,
            experience_level="mid-level"
        )
        
        print(f"✅ AI 질문 생성 완료!")
        print(f"📊 총 질문 수: {question_set.total_count}")
        print(f"🎯 직무 적합도 점수: {question_set.job_fit_score}")
        print()
        
        # 생성된 질문들 출력
        for i, scenario in enumerate(question_set.scenarios, 1):
            print(f"질문 {i}:")
            print(f"  시나리오: {scenario.scenario}")
            print(f"  질문: {scenario.question}")
            print(f"  카테고리: {scenario.category}")
            print(f"  난이도: {scenario.difficulty}")
            print(f"  평가 중점: {', '.join(scenario.evaluation_focus)}")
            print(f"  시간 제한: {scenario.time_limit}초")
            print()
        
        # 후속 질문 생성 테스트
        print("🔄 후속 질문 생성 테스트")
        print("-" * 30)
        
        original_question = "팀 프로젝트에서 의견이 맞지 않는 상황이 발생했다면 어떻게 대처하시겠습니까?"
        candidate_response = "먼저 상대방의 의견을 들어보고, 공통점을 찾아서 합의점을 도출하려고 노력합니다."
        evaluation_focus = ["teamwork", "communication", "problem_solving"]
        
        follow_up_questions = await generate_follow_up_questions(
            original_question=original_question,
            candidate_response=candidate_response,
            evaluation_focus=evaluation_focus
        )
        
        print(f"원본 질문: {original_question}")
        print(f"지원자 답변: {candidate_response}")
        print(f"평가 중점: {', '.join(evaluation_focus)}")
        print()
        print("생성된 후속 질문:")
        for i, question in enumerate(follow_up_questions, 1):
            print(f"  {i}. {question}")
        
        print()
        print("🎉 AI 질문 생성 테스트 완료!")
        
    except Exception as e:
        print(f"❌ AI 질문 생성 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ai_question_generation()) 