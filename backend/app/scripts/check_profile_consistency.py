#!/usr/bin/env python3
"""
면접관 프로필과 히스토리 테이블 데이터 일관성 확인 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.interviewer_profile import InterviewerProfile, InterviewerProfileHistory

def check_profile_consistency():
    """면접관 프로필 데이터 일관성 확인"""
    print("🔍 면접관 프로필 데이터 일관성 확인 시작...")
    
    db = SessionLocal()
    
    try:
        # 1. 현재 프로필 데이터 확인
        print("\n📊 현재 interviewer_profile 테이블:")
        profiles = db.query(InterviewerProfile).all()
        print(f"총 {len(profiles)}개의 프로필")
        
        for profile in profiles:
            print(f"  - ID: {profile.id}, 면접관: {profile.evaluator_id}")
            print(f"    엄격도: {profile.strictness_score}, 일관성: {profile.consistency_score}")
            print(f"    기술: {profile.tech_focus_score}, 인성: {profile.personality_focus_score}")
            print(f"    총면접: {profile.total_interviews}, 생성일: {profile.created_at}")
            print()
        
        # 2. 히스토리 데이터 확인
        print("\n📈 현재 interviewer_profile_history 테이블:")
        histories = db.query(InterviewerProfileHistory).all()
        print(f"총 {len(histories)}개의 히스토리")
        
        for history in histories:
            print(f"  - ID: {history.id}, 프로필ID: {history.interviewer_profile_id}")
            print(f"    평가ID: {history.evaluation_id}, 변경타입: {history.change_type}")
            print(f"    변경일: {history.created_at}")
            print(f"    변경사유: {history.change_reason}")
            print()
        
        # 3. 프로필별 히스토리 개수 확인
        print("\n🔗 프로필별 히스토리 개수:")
        profile_history_counts = db.execute(text("""
            SELECT 
                p.evaluator_id,
                p.id as profile_id,
                COUNT(h.id) as history_count
            FROM interviewer_profile p
            LEFT JOIN interviewer_profile_history h ON p.id = h.interviewer_profile_id
            GROUP BY p.id, p.evaluator_id
            ORDER BY p.evaluator_id
        """)).fetchall()
        
        for row in profile_history_counts:
            print(f"  - 면접관 {row.evaluator_id}: 프로필ID {row.profile_id}, 히스토리 {row.history_count}개")
        
        # 4. 데이터 불일치 확인
        print("\n⚠️  데이터 불일치 확인:")
        
        # 4-1. 프로필은 있지만 히스토리가 없는 경우
        profiles_without_history = db.execute(text("""
            SELECT p.id, p.evaluator_id
            FROM interviewer_profile p
            LEFT JOIN interviewer_profile_history h ON p.id = h.interviewer_profile_id
            WHERE h.id IS NULL
        """)).fetchall()
        
        if profiles_without_history:
            print("  ❌ 프로필은 있지만 히스토리가 없는 경우:")
            for row in profiles_without_history:
                print(f"    - 프로필ID {row.id}, 면접관 {row.evaluator_id}")
        else:
            print("  ✅ 모든 프로필에 히스토리가 존재합니다.")
        
        # 4-2. 히스토리는 있지만 프로필이 없는 경우
        history_without_profile = db.execute(text("""
            SELECT h.id, h.interviewer_profile_id, h.evaluation_id
            FROM interviewer_profile_history h
            LEFT JOIN interviewer_profile p ON h.interviewer_profile_id = p.id
            WHERE p.id IS NULL
        """)).fetchall()
        
        if history_without_profile:
            print("  ❌ 히스토리는 있지만 프로필이 없는 경우:")
            for row in history_without_profile:
                print(f"    - 히스토리ID {row.id}, 프로필ID {row.interviewer_profile_id}, 평가ID {row.evaluation_id}")
        else:
            print("  ✅ 모든 히스토리에 해당 프로필이 존재합니다.")
        
        # 4-3. 히스토리 데이터 내용 확인
        print("\n📊 히스토리 데이터 내용 확인:")
        history_details = db.execute(text("""
            SELECT 
                h.id,
                h.interviewer_profile_id,
                h.change_type,
                h.old_values,
                h.new_values,
                h.change_reason,
                h.created_at
            FROM interviewer_profile_history h
            ORDER BY h.created_at DESC
            LIMIT 10
        """)).fetchall()
        
        if history_details:
            print("  최근 히스토리 데이터:")
            for row in history_details:
                print(f"    - 히스토리ID {row.id}, 프로필ID {row.interviewer_profile_id}")
                print(f"      변경타입: {row.change_type}")
                print(f"      변경사유: {row.change_reason}")
                print(f"      변경일: {row.created_at}")
                if row.old_values:
                    print(f"      이전값: {row.old_values[:100]}...")
                if row.new_values:
                    print(f"      새값: {row.new_values[:100]}...")
                print()
        else:
            print("  ⚠️  히스토리 데이터가 없습니다.")
        
        print("\n✅ 데이터 일관성 확인 완료!")
        
    except Exception as e:
        print(f"❌ 확인 중 오류 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_profile_consistency() 