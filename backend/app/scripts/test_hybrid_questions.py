#!/usr/bin/env python3
"""
하이브리드 질문 생성 시스템 테스트
"""

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.data.general_interview_questions import get_random_general_questions, get_random_game_test

async def test_hybrid_question_system():
    """하이브리드 질문 시스템 테스트"""
    print("🚀 하이브리드 질문 시스템 테스트 시작")
    print("=" * 60)
    
    # 1. 일반 질문 7개 선택
    print("📝 일반 질문 7개 선택:")
    general_questions = get_random_general_questions(count=7)
    
    for i, question in enumerate(general_questions, 1):
        print(f"  {i}. [{question['category']}] {question['question']}")
        print(f"     평가 중점: {', '.join(question['evaluation_focus'])}")
        print()
    
    # 2. 게임 테스트 선택
    print("🎮 게임 테스트 선택:")
    game_test = get_random_game_test()
    print(f"  선택된 게임: {game_test['name']}")
    print(f"  설명: {game_test['description']}")
    print(f"  평가 중점: {', '.join(game_test['evaluation_focus'])}")
    print()
    
    # 3. 질문 구성 시뮬레이션
    print("📊 질문 구성 시뮬레이션:")
    print("  일반 질문 4개 → 게임 테스트 → 일반 질문 3개 → 직무별 AI 질문 3개")
    print()
    
    # 4. 전체 구성 출력
    print("🎯 최종 질문 구성:")
    question_order = []
    
    # 일반 질문 4개
    for i, question in enumerate(general_questions[:4], 1):
        question_order.append({
            "id": i,
            "type": "general",
            "question": question["question"],
            "category": question["category"]
        })
    
    # 게임 테스트
    question_order.append({
        "id": 5,
        "type": "game_test",
        "name": game_test["name"],
        "category": "game_test"
    })
    
    # 나머지 일반 질문 3개
    for i, question in enumerate(general_questions[4:7], 6):
        question_order.append({
            "id": i,
            "type": "general",
            "question": question["question"],
            "category": question["category"]
        })
    
    # 직무별 AI 질문 3개 (시뮬레이션)
    for i in range(9, 12):
        question_order.append({
            "id": i,
            "type": "ai_job_specific",
            "question": f"[AI 생성] 직무별 맞춤 질문 {i-8}",
            "category": "job_specific"
        })
    
    # 출력
    for item in question_order:
        if item["type"] == "game_test":
            print(f"  {item['id']}. 🎮 {item['name']} (게임 테스트)")
        else:
            print(f"  {item['id']}. {item['question']} [{item['category']}]")
    
    print()
    print("📈 통계:")
    print(f"  총 질문 수: {len(question_order)}")
    print(f"  일반 질문: 7개")
    print(f"  직무별 AI 질문: 3개")
    print(f"  게임 테스트: 1개")
    print()
    
    print("✅ 하이브리드 질문 시스템 테스트 완료!")
    print()
    print("💡 특징:")
    print("  - 일반 질문으로 기본 역량 평가")
    print("  - 게임 테스트로 인지능력 측정")
    print("  - 직무별 AI 질문으로 맞춤형 평가")
    print("  - 공고 마감 시 자동으로 질문 생성")

if __name__ == "__main__":
    asyncio.run(test_hybrid_question_system()) 