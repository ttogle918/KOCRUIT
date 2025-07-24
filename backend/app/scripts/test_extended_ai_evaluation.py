#!/usr/bin/env python3
"""
확장된 AI 면접 평가 시스템 테스트
더 많은 평가 항목을 포함한 종합적인 분석
"""

import sys
import os
import json
from datetime import datetime

# 프로젝트 루트 경로 추가
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.services.ai_interview_evaluation_service import (
    save_ai_interview_evaluation,
    create_ai_interview_schedule,
    load_ai_interview_data,
    get_applicant_analysis_data
)
from app.models.application import Application
from app.models.job import JobPost

def test_extended_ai_evaluation():
    """확장된 AI 면접 평가 테스트"""
    print("🚀 확장된 AI 면접 평가 시스템 테스트")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 1. 지원자 목록 조회
        applications = db.query(Application).limit(10).all()

        print("\n" + "=" * 60)
        
        # 2. JSON 파일 정보 표시
        print("📊 확장된 AI 면접 데이터 정보:")
        print("   - 데이터 소스: /app/data/ai_interview_applicant_evaluation_extended.json")
        print("   - 총 지원자 수: 17명 (43, 46, 47, 50, 51, 52, 58, 60, 62, 64, 66, 70, 72, 74, 76, 78, 80)")
        print("   - 평가 항목: 24개 (음성/화법 6개, 비언어적 행동 7개, 상호작용 3개, 언어/내용 8개)")
        
        print("\n" + "=" * 60)
        
        # 3. 사용자 입력 받기
        print("🎯 평가 테스트 설정:")
        applicant_id = input("지원자 ID를 입력하세요 (기본값: 1): ").strip()
        applicant_id = int(applicant_id) if applicant_id else 1
        
        job_post_id = input("공고 ID를 입력하세요 (기본값: 1): ").strip()
        job_post_id = int(job_post_id) if job_post_id else 1
        
        print(f"\n📅 평가 대상:")
        application = db.query(Application).filter(Application.id == applicant_id).first()
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        
        if application and job_post:
            print(f"   - 지원자: {application.user.name if application.user else 'N/A'} (ID: {applicant_id})")
            print(f"   - 공고: {job_post.title} (ID: {job_post_id})")
        else:
            print("   ⚠️ 지원자 또는 공고를 찾을 수 없습니다.")
            return
        
        print("\n" + "=" * 60)
        
        # 4. AI 면접 일정 생성
        print("📅 AI 면접 일정 생성 중...")
        interview_id = create_ai_interview_schedule(db, applicant_id, job_post_id)
        print(f"   ✅ 면접 ID: {interview_id}")
        
        # 5. 확장된 평가 실행 (JSON 파일의 실제 데이터 사용)
        print("\n🔍 확장된 AI 면접 평가 실행 중...")
        evaluation_id = save_ai_interview_evaluation(
            db=db,
            application_id=applicant_id,
            job_post_id=job_post_id,
            interview_id=interview_id,
            analysis=None,  # JSON에서 자동 로드
            json_path="/app/data/ai_interview_applicant_evaluation_extended.json"
        )
        
        print(f"   ✅ 평가 ID: {evaluation_id}")
        
        print("\n" + "=" * 60)
        print("🎉 확장된 AI 면접 평가 테스트 완료!")
        
        # 7. 실제 mp4 분석 가능성 설명
        print("\n📹 실제 mp4 영상 분석 가능 항목:")
        print("✅ 가능한 항목:")
        print("   - 음성/텍스트: STT, 말 속도, 발음, 볼륨, 억양, 감정")
        print("   - 표정/감정/시선/자세: Face Recognition, MediaPipe")
        print("   - 환경/배경: 오디오 분석, 배경 소음")
        print("   - 언어/내용: NLP, 키워드, 긍정/부정, 전문용어")
        
        print("\n⚠️ 한계가 있는 항목:")
        print("   - 면접관 수동 평가: 영상만으로는 불가")
        print("   - 완벽한 맥락/의도 파악: AI 한계")
        
        print("\n🔧 실제 파이프라인:")
        print("   mp4 → 오디오/프레임 추출")
        print("   오디오 → STT, 감정, 볼륨, 말 속도")
        print("   프레임 → 얼굴/표정/시선/자세/손동작")
        print("   텍스트 → NLP(키워드, 논리성, 요약력)")
        print("   모든 결과를 JSON으로 통합")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_extended_ai_evaluation() 