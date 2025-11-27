#!/usr/bin/env python3
"""
감정분석 기능 테스트 스크립트
"""
import sys
import os

# agent 컨테이너의 모듈 import
sys.path.append('/app')

try:
    from tools.openai_nlp_analyzer import openai_nlp_analyzer
    print("✅ 감정분석 도구 import 성공")
    
    # 테스트 면접 답변
    test_transcription = """
    안녕하세요. 저는 웹 개발자로서 3년간 다양한 프로젝트를 진행해왔습니다. 
    특히 React와 Node.js를 활용한 풀스택 개발에 강점이 있고, 
    최근에는 마이크로서비스 아키텍처를 도입하여 시스템 성능을 40% 향상시킨 경험이 있습니다.
    팀워크를 중요하게 생각하며, 항상 새로운 기술을 배우는 것에 열정을 가지고 있습니다.
    """
    
    print(f"📝 테스트 면접 답변: {test_transcription}")
    
    # 감정분석 테스트
    print("\n🔍 감정분석 시작...")
    result = openai_nlp_analyzer.analyze_emotion_from_text(test_transcription)
    
    print(f"✅ 감정분석 완료!")
    print(f"🎭 주요 감정: {result.get('primary_emotion', 'N/A')}")
    print(f"📊 감정 세부 분석:")
    emotion_breakdown = result.get('emotion_breakdown', {})
    for emotion, score in emotion_breakdown.items():
        print(f"   - {emotion}: {score}")
    print(f"🎵 감정 톤: {result.get('emotional_tone', 'N/A')}")
    print(f"😰 스트레스 레벨: {result.get('stress_level', 'N/A')}")
    print(f"🔥 참여도: {result.get('engagement_level', 'N/A')}")
    print(f"💡 감정 인사이트: {result.get('emotional_insights', [])}")
    print(f"💡 권장사항: {result.get('recommendations', [])}")
    
    if result.get('analysis_method') == 'openai_gpt4o':
        print("🎉 OpenAI GPT-4o 감정분석 성공!")
    else:
        print("⚠️ OpenAI 분석 실패, fallback 사용")
        
except Exception as e:
    print(f"❌ 감정분석 테스트 실패: {str(e)}")
    import traceback
    traceback.print_exc()
