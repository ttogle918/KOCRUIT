#!/usr/bin/env python3
"""
AI 인사이트 테이블 생성 마이그레이션 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base
from app.models.ai_insights import AIInsights, AIInsightsComparison
from app.models.job import JobPost

def create_ai_insights_tables():
    """AI 인사이트 관련 테이블 생성"""
    try:
        print("🔄 AI 인사이트 테이블 생성 중...")
        
        # 테이블 생성
        Base.metadata.create_all(bind=engine, tables=[
            AIInsights.__table__,
            AIInsightsComparison.__table__
        ])
        
        print("✅ AI 인사이트 테이블 생성 완료!")
        print("📋 생성된 테이블:")
        print("   - ai_insights")
        print("   - ai_insights_comparisons")
        
        return True
        
    except Exception as e:
        print(f"❌ 테이블 생성 실패: {str(e)}")
        return False

if __name__ == "__main__":
    create_ai_insights_tables() 