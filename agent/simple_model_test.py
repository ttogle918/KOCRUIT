#!/usr/bin/env python3
"""
간단한 모델 사용 상태 확인
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """패키지 import 테스트"""
    print("=== 패키지 Import 테스트 ===")
    
    # OpenAI
    try:
        from openai import OpenAI
        print("✅ OpenAI: 사용 가능")
    except ImportError as e:
        print(f"❌ OpenAI: {e}")
    
    # SentenceTransformer
    try:
        from sentence_transformers import SentenceTransformer
        print("✅ SentenceTransformer: 사용 가능")
    except ImportError as e:
        print(f"❌ SentenceTransformer: {e}")
    
    # Transformers
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        print("✅ Transformers: 사용 가능")
    except ImportError as e:
        print(f"❌ Transformers: {e}")
    
    # Torch
    try:
        import torch
        print(f"✅ PyTorch: {torch.__version__}")
    except ImportError as e:
        print(f"❌ PyTorch: {e}")
    
    # NumPy
    try:
        import numpy as np
        print(f"✅ NumPy: {np.__version__}")
    except ImportError as e:
        print(f"❌ NumPy: {e}")

def test_model_loading():
    """모델 로딩 테스트"""
    print("\n=== 모델 로딩 테스트 ===")
    
    # SentenceTransformer 테스트
    try:
        from sentence_transformers import SentenceTransformer
        print("🔄 SentenceTransformer 모델 로딩 중...")
        model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
        print("✅ SentenceTransformer 모델 로딩 성공!")
        
        # 간단한 테스트
        test_text = "안녕하세요"
        embedding = model.encode([test_text])
        print(f"✅ 임베딩 생성 성공: {embedding.shape}")
        
    except Exception as e:
        print(f"❌ SentenceTransformer 모델 로딩 실패: {e}")
    
    # KcELECTRA 테스트
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        print("🔄 KcELECTRA 모델 로딩 중...")
        
        model_name = "nlp04/korean_sentiment_analysis_kcelectra"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        print("✅ KcELECTRA 모델 로딩 성공!")
        
        # 간단한 테스트
        test_text = "안녕하세요"
        inputs = tokenizer(test_text, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            outputs = model(**inputs)
        print(f"✅ 감정 분석 성공: {outputs.logits.shape}")
        
    except Exception as e:
        print(f"❌ KcELECTRA 모델 로딩 실패: {e}")

def test_highlight_tool():
    """하이라이트 도구 테스트"""
    print("\n=== 하이라이트 도구 테스트 ===")
    
    try:
        from tools.highlight_resume_tool import get_highlight_tool
        
        tool = get_highlight_tool()
        if tool is None:
            print("❌ HighlightResumeTool 인스턴스를 가져올 수 없습니다.")
            return
        
        print(f"✅ HighlightResumeTool 인스턴스 생성 성공")
        print(f"✅ 초기화 상태: {tool._initialized}")
        print(f"✅ SentenceTransformer: {'사용 가능' if tool.embedding_model else '사용 불가'}")
        print(f"✅ KcELECTRA 감정분석: {'사용 가능' if tool.sentiment_model else '사용 불가'}")
        
        # 간단한 분석 테스트
        test_text = "저는 프로그래밍을 좋아합니다."
        result = tool.analyze_text(test_text)
        
        print(f"✅ 분석 완료: {len(result.get('highlights', []))}개 하이라이트")
        
    except Exception as e:
        print(f"❌ 하이라이트 도구 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 간단한 모델 사용 상태 확인 시작")
    
    test_imports()
    test_model_loading()
    test_highlight_tool()
    
    print("\n=== 테스트 완료 ===") 