#!/usr/bin/env python3
"""
개인 질문 결과 테이블 생성 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.core.database import engine
from backend.app.models.personal_question_result import PersonalQuestionResult

def create_personal_question_result_table():
    """개인 질문 결과 테이블을 생성합니다."""
    try:
        # 테이블 생성
        PersonalQuestionResult.__table__.create(engine, checkfirst=True)
        print("✅ 개인 질문 결과 테이블이 성공적으로 생성되었습니다.")
        
        # 테이블 정보 출력
        print("\n📋 테이블 정보:")
        print("- 테이블명: personal_question_result")
        print("- 주요 컬럼:")
        print("  - id: 기본키")
        print("  - application_id: 지원서 ID (외래키)")
        print("  - jobpost_id: 공고 ID (외래키)")
        print("  - company_id: 회사 ID (외래키)")
        print("  - questions: 전체 질문 리스트 (JSON)")
        print("  - question_bundle: 카테고리별 질문 묶음 (JSON)")
        print("  - job_matching_info: 직무 매칭 정보 (TEXT)")
        print("  - analysis_version: 분석 버전")
        print("  - analysis_duration: 분석 소요 시간")
        print("  - created_at: 생성일시")
        print("  - updated_at: 수정일시")
        
    except Exception as e:
        print(f"❌ 테이블 생성 실패: {str(e)}")
        raise

if __name__ == "__main__":
    create_personal_question_result_table() 