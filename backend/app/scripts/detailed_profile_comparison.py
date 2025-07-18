#!/usr/bin/env python3
"""
면접관 프로필과 히스토리 데이터의 실제 값 상세 비교 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.interviewer_profile import InterviewerProfile, InterviewerProfileHistory

def detailed_profile_comparison():
    """프로필과 히스토리 데이터 상세 비교"""
    print("🔍 면접관 프로필과 히스토리 데이터 상세 비교 시작...")
    
    db = SessionLocal()
    
    try:
        # 1. 프로필과 최신 히스토리 조인해서 가져오기
        query = """
            SELECT 
                p.id as profile_id,
                p.evaluator_id,
                p.strictness_score as p_strictness,
                p.consistency_score as p_consistency,
                p.tech_focus_score as p_tech,
                p.personality_focus_score as p_personality,
                p.total_interviews as p_interviews,
                h.id as history_id,
                h.new_values as history_new_values,
                h.old_values as history_old_values,
                h.change_type,
                h.created_at as history_created
            FROM interviewer_profile p
            LEFT JOIN interviewer_profile_history h ON p.id = h.interviewer_profile_id
            ORDER BY p.evaluator_id, h.created_at DESC
        """
        
        results = db.execute(text(query)).fetchall()
        
        print(f"\n📊 총 {len(results)}개의 프로필-히스토리 매칭 데이터:")
        
        current_evaluator = None
        
        for row in results:
            if current_evaluator != row.evaluator_id:
                current_evaluator = row.evaluator_id
                print(f"\n{'='*60}")
                print(f"🔍 면접관 {row.evaluator_id} (프로필ID: {row.profile_id})")
                print(f"{'='*60}")
                
                # 현재 프로필 값들
                print(f"\n📋 현재 프로필 테이블 값:")
                print(f"  - 엄격도: {row.p_strictness}")
                print(f"  - 일관성: {row.p_consistency}")
                print(f"  - 기술점수: {row.p_tech}")
                print(f"  - 인성점수: {row.p_personality}")
                print(f"  - 총면접: {row.p_interviews}")
            
            if row.history_new_values:
                print(f"\n📈 히스토리 {row.history_id} ({row.change_type}, {row.history_created}):")
                
                try:
                    # 히스토리의 이전값과 새값 파싱
                    old_values = json.loads(row.history_old_values) if row.history_old_values else {}
                    new_values = json.loads(row.history_new_values) if row.history_new_values else {}
                    
                    print(f"  📜 이전값 (old_values):")
                    print(f"    - 엄격도: {old_values.get('strictness_score', 'N/A')}")
                    print(f"    - 일관성: {old_values.get('consistency_score', 'N/A')}")
                    print(f"    - 기술점수: {old_values.get('tech_focus_score', 'N/A')}")
                    print(f"    - 인성점수: {old_values.get('personality_focus_score', 'N/A')}")
                    print(f"    - 총면접: {old_values.get('total_interviews', 'N/A')}")
                    
                    print(f"  📝 새값 (new_values):")
                    print(f"    - 엄격도: {new_values.get('strictness_score', 'N/A')}")
                    print(f"    - 일관성: {new_values.get('consistency_score', 'N/A')}")
                    print(f"    - 기술점수: {new_values.get('tech_focus_score', 'N/A')}")
                    print(f"    - 인성점수: {new_values.get('personality_focus_score', 'N/A')}")
                    print(f"    - 총면접: {new_values.get('total_interviews', 'N/A')}")
                    
                    # 🔥 핵심: 현재 프로필 값과 히스토리 new_values 비교
                    print(f"\n⚠️  현재 프로필 vs 히스토리 new_values 비교:")
                    
                    # 엄격도 비교
                    profile_strictness = float(row.p_strictness or 0)
                    history_strictness = float(new_values.get('strictness_score', 0))
                    if abs(profile_strictness - history_strictness) > 0.01:
                        print(f"    ❌ 엄격도 불일치: 프로필 {profile_strictness} vs 히스토리 {history_strictness}")
                    else:
                        print(f"    ✅ 엄격도 일치: {profile_strictness}")
                    
                    # 일관성 비교
                    profile_consistency = float(row.p_consistency or 0)
                    history_consistency = float(new_values.get('consistency_score', 0))
                    if abs(profile_consistency - history_consistency) > 0.01:
                        print(f"    ❌ 일관성 불일치: 프로필 {profile_consistency} vs 히스토리 {history_consistency}")
                    else:
                        print(f"    ✅ 일관성 일치: {profile_consistency}")
                    
                    # 기술점수 비교
                    profile_tech = float(row.p_tech or 0)
                    history_tech = float(new_values.get('tech_focus_score', 0))
                    if abs(profile_tech - history_tech) > 0.01:
                        print(f"    ❌ 기술점수 불일치: 프로필 {profile_tech} vs 히스토리 {history_tech}")
                    else:
                        print(f"    ✅ 기술점수 일치: {profile_tech}")
                    
                    # 인성점수 비교
                    profile_personality = float(row.p_personality or 0)
                    history_personality = float(new_values.get('personality_focus_score', 0))
                    if abs(profile_personality - history_personality) > 0.01:
                        print(f"    ❌ 인성점수 불일치: 프로필 {profile_personality} vs 히스토리 {history_personality}")
                    else:
                        print(f"    ✅ 인성점수 일치: {profile_personality}")
                    
                    # 총면접 비교
                    profile_interviews = int(row.p_interviews or 0)
                    history_interviews = int(new_values.get('total_interviews', 0))
                    if profile_interviews != history_interviews:
                        print(f"    ❌ 총면접 불일치: 프로필 {profile_interviews} vs 히스토리 {history_interviews}")
                    else:
                        print(f"    ✅ 총면접 일치: {profile_interviews}")
                        
                except json.JSONDecodeError as e:
                    print(f"    ❌ JSON 파싱 오류: {e}")
                except Exception as e:
                    print(f"    ❌ 비교 오류: {e}")
        
        print(f"\n✅ 상세 비교 완료!")
        
    except Exception as e:
        print(f"❌ 분석 중 오류 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    detailed_profile_comparison() 