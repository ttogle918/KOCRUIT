#!/usr/bin/env python3
"""
모델 사용 상태 확인 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools.highlight_resume_tool import get_highlight_tool

def test_model_initialization():
    """모델 초기화 상태 확인"""
    print("=== 모델 초기화 상태 확인 ===")
    
    try:
        tool = get_highlight_tool()
        if tool is None:
            print("❌ HighlightResumeTool 인스턴스를 가져올 수 없습니다.")
            return False
        
        print(f"✅ HighlightResumeTool 인스턴스 생성 성공")
        print(f"✅ 초기화 상태: {tool._initialized}")
        
        # 모델 상태 확인
        print(f"✅ SentenceTransformer: {'사용 가능' if tool.embedding_model else '사용 불가'}")
        print(f"✅ KcELECTRA 감정분석: {'사용 가능' if tool.sentiment_model else '사용 불가'}")
        
        return True
        
    except Exception as e:
        print(f"❌ 모델 초기화 확인 중 오류: {e}")
        return False

def test_sentiment_analysis():
    """감정 분석 모델 테스트"""
    print("\n=== 감정 분석 모델 테스트 ===")
    
    try:
        tool = get_highlight_tool()
        if tool is None:
            print("❌ HighlightResumeTool 인스턴스를 가져올 수 없습니다.")
            return False
        
        if not tool.sentiment_model or not tool.sentiment_tokenizer:
            print("❌ 감정 분석 모델이 초기화되지 않았습니다.")
            return False
        
        # 테스트 텍스트들
        test_texts = [
            "저는 매우 행복합니다.",
            "이 일이 너무 싫어요.",
            "프로그래밍을 좋아합니다.",
            "스트레스를 받고 있습니다."
        ]
        
        for text in test_texts:
            score = tool._analyze_sentiment(text)
            print(f"텍스트: '{text}' -> 감정점수: {score:.3f}")
        
        return True
        
    except Exception as e:
        print(f"❌ 감정 분석 테스트 중 오류: {e}")
        return False

def test_embedding_model():
    """임베딩 모델 테스트"""
    print("\n=== 임베딩 모델 테스트 ===")
    
    try:
        tool = get_highlight_tool()
        if tool is None:
            print("❌ HighlightResumeTool 인스턴스를 가져올 수 없습니다.")
            return False
        
        if not tool.embedding_model:
            print("❌ 임베딩 모델이 초기화되지 않았습니다.")
            return False
        
        # 테스트 텍스트
        test_text = "저는 끊임없이 노력하겠습니다."
        
        similarity = tool._calculate_vague_similarity(test_text)
        print(f"텍스트: '{test_text}' -> 유사도: {similarity:.3f}")
        
        return True
        
    except Exception as e:
        print(f"❌ 임베딩 모델 테스트 중 오류: {e}")
        return False

def test_full_analysis():
    """전체 분석 테스트"""
    print("\n=== 전체 분석 테스트 ===")
    
    try:
        tool = get_highlight_tool()
        if tool is None:
            print("❌ HighlightResumeTool 인스턴스를 가져올 수 없습니다.")
            return False
        
        # 테스트 텍스트 (이미지에서 제공된 텍스트)
        test_text = """무엇인가 한번 빠져들면 해결하거나 성취할 때까지 모든 열정/노력을 쏟아붓는 성격으로, 그 과정에서 큰 어려움이 발생하더라도 포기하지 않고 가능한 방법들을 찾아 해결하는 편입니다. 특히 프로그래밍에 있어서는 공식적으로 제공되는 레퍼런스 문서를 보는 것을 좋아하며, 이런 과정을 통해 새로운 지식을 습득하는 것에 보람을 느끼고 있습니다. 물론 문제가 발생하는 상황을 좋아하지 않기 때문에, 문제와 관련된 내용을 다루는 문서/아티클이 존재하지 않거나 제시된 대로 따랐을 때 문제가 해결되지 않는다면 답답함을 느끼거나 가벼운 스트레스 받는다는 것이 단점이기는 하지만, 개인적으로 좋아하는 커피를 마시거나 간단한 독서를 통해 기분 전환하여 해결하는 편이며, 주어진 문제 상황을 어떻게든 해결함으로써 문제로 인해 받았던 스트레스를 해소함과 동시에 성취감을 느끼는 것 같습니다. 해결했다는 성취감은 다시 개발에 빠져들게 되는 원동력이 되어 긍정적인 선순환이 이루어지는 것 같습니다. 개발 과정에서 알 수 없는 버그가 발생하였을 때 불가피한 경우 문제가 예상되는 부분에 Break point를 찍고 라인 단위로 프로그램을 실행해 메모리 상의 비트 단위까지 추적했던 경험도 가지고 있으며, 프로젝트 서버 배포 과정에서 로컬에서는 발생하지 않았던 문제가 발생하였을 때 에러 로그에 관련된 문서를 모두 확인하여 배포했던 경험도 가지고 있습니다."""
        
        # 분석 실행
        result = tool.analyze_text(
            text=test_text,
            job_description="",
            company_values="",
            qualifications=""
        )
        
        print(f"✅ 분석 완료")
        print(f"✅ 하이라이트 개수: {len(result.get('highlights', []))}")
        
        # 카테고리별 개수 출력
        summary = result.get('summary', {})
        for category, count in summary.items():
            print(f"  - {category}: {count}개")
        
        # Risk 하이라이트만 확인
        risk_highlights = [h for h in result.get('highlights', []) if h.get('category') == 'risk']
        print(f"✅ Risk 하이라이트 개수: {len(risk_highlights)}")
        
        for highlight in risk_highlights:
            print(f"  - Risk: '{highlight.get('text', '')}' (타입: {highlight.get('match_type', 'unknown')})")
        
        return True
        
    except Exception as e:
        print(f"❌ 전체 분석 테스트 중 오류: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 모델 사용 상태 확인 시작")
    
    # 각 테스트 실행
    tests = [
        test_model_initialization,
        test_sentiment_analysis,
        test_embedding_model,
        test_full_analysis
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ 테스트 실행 중 오류: {e}")
            results.append(False)
    
    # 결과 요약
    print("\n=== 테스트 결과 요약 ===")
    passed = sum(results)
    total = len(results)
    print(f"통과: {passed}/{total}")
    
    if passed == total:
        print("✅ 모든 테스트 통과!")
    else:
        print("❌ 일부 테스트 실패")
        print("모델 의존성 패키지 설치를 확인하세요:")
        print("pip install sentence-transformers transformers torch numpy") 