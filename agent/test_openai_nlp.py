#!/usr/bin/env python3
"""
OpenAI NLP 분석 도구 테스트 스크립트
"""
import sys
import os

# agent 컨테이너의 모듈 import
sys.path.append('/app')

try:
    from tools.openai_nlp_analyzer import openai_nlp_analyzer
    print("✅ OpenAI NLP 분석기 import 성공")
    
    # 테스트 질문과 답변
    test_question = "프로젝트에서 가장 어려웠던 문제는 무엇이었나요?"
    test_answer = "사용자 인증 시스템을 구현할 때 보안 문제가 가장 어려웠습니다. JWT 토큰 관리와 세션 보안을 위해 Redis를 도입하고, 비밀번호 해싱을 bcrypt로 구현했습니다. 결과적으로 보안 취약점을 90% 줄일 수 있었습니다."
    
    print(f"📝 테스트 질문: {test_question}")
    print(f"📝 테스트 답변: {test_answer}")
    
    # OpenAI 답변 품질 분석 테스트
    print("\n🔍 OpenAI 답변 품질 분석 시작...")
    result = openai_nlp_analyzer.analyze_answer_quality(test_question, test_answer)
    
    print(f"✅ 분석 완료!")
    print(f"📊 점수: {result.get('score', 'N/A')}")
    print(f"📊 분석 방법: {result.get('analysis_method', 'N/A')}")
    print(f"💪 강점: {result.get('strengths', [])}")
    print(f"⚠️ 개선점: {result.get('weaknesses', [])}")
    print(f"💡 제안사항: {result.get('suggestions', [])}")
    print(f"📝 전체 피드백: {result.get('overall_feedback', 'N/A')}")
    
    if result.get('analysis_method') == 'openai_gpt4o':
        print("🎉 OpenAI GPT-4o 분석 성공!")
    else:
        print("⚠️ OpenAI 분석 실패, fallback 사용")
        
except Exception as e:
    print(f"❌ OpenAI NLP 분석 테스트 실패: {str(e)}")
    import traceback
    traceback.print_exc()
