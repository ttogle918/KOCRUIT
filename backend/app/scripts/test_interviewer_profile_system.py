"""
면접관 프로필 시스템 테스트 스크립트
통합된 개별 특성 분석과 상대적 비교 분석 시스템 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.interviewer_profile_service import InterviewerProfileService
from app.models.interviewer_profile import InterviewerProfile
from app.models.interview_evaluation import InterviewEvaluation
from app.models.user import CompanyUser
import json

def test_interviewer_profile_system():
    """면접관 프로필 시스템 전체 테스트"""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("면접관 프로필 시스템 테스트 시작")
        print("=" * 60)
        
        # 1. 기존 면접관들의 평가 데이터 확인
        print("\n1. 기존 면접관 평가 데이터 확인")
        existing_evaluators = db.query(InterviewEvaluation.evaluator_id).distinct().all()
        evaluator_ids = [e[0] for e in existing_evaluators if e[0] is not None]
        
        print(f"평가 데이터가 있는 면접관 수: {len(evaluator_ids)}")
        if evaluator_ids:
            print(f"면접관 ID 목록: {evaluator_ids[:10]}...")  # 처음 10개만 표시
        
        # 2. 면접관 프로필 초기화
        print("\n2. 면접관 프로필 초기화")
        for evaluator_id in evaluator_ids[:5]:  # 처음 5명만 테스트
            try:
                profile = InterviewerProfileService._update_interviewer_profile(db, evaluator_id)
                print(f"면접관 {evaluator_id}: 총 면접 {profile.total_interviews}회, 신뢰도 {profile.confidence_level}%")
            except Exception as e:
                print(f"면접관 {evaluator_id} 프로필 업데이트 실패: {str(e)}")
        
        # 3. 면접관 특성 조회 테스트
        print("\n3. 면접관 특성 조회 테스트")
        if evaluator_ids:
            test_evaluator_id = evaluator_ids[0]
            characteristics = InterviewerProfileService.get_interviewer_characteristics(db, test_evaluator_id)
            print(f"면접관 {test_evaluator_id} 특성:")
            print(f"  - 특성: {characteristics['characteristics']}")
            print(f"  - 엄격도: {characteristics['strictness_score']}")
            print(f"  - 일관성: {characteristics['consistency_score']}")
            print(f"  - 기술 중심도: {characteristics['tech_focus_score']}")
            print(f"  - 인성 중심도: {characteristics['personality_focus_score']}")
            print(f"  - 경험치: {characteristics['experience_score']}")
            print(f"  - 총 면접: {characteristics['total_interviews']}회")
            print(f"  - 요약: {characteristics['summary']}")
        
        # 4. 밸런스 패널 추천 테스트
        print("\n4. 밸런스 패널 추천 테스트")
        if len(evaluator_ids) >= 3:
            test_interviewers = evaluator_ids[:5]  # 5명 중에서 3명 추천
            recommended_ids, balance_score = InterviewerProfileService.get_balanced_panel_recommendation(
                db=db,
                available_interviewers=test_interviewers,
                required_count=3
            )
            print(f"추천된 면접관: {recommended_ids}")
            print(f"밸런스 점수: {balance_score}")
            
            # 추천된 면접관들의 특성 확인
            print("추천된 면접관들의 특성:")
            for interviewer_id in recommended_ids:
                char = InterviewerProfileService.get_interviewer_characteristics(db, interviewer_id)
                print(f"  - 면접관 {interviewer_id}: {char['characteristics']}")
        
        # 5. 상대적 분석 테스트
        print("\n5. 상대적 분석 테스트")
        # 면접 ID가 있는 평가 찾기
        interviews_with_multiple_evaluations = db.query(InterviewEvaluation.interview_id).group_by(
            InterviewEvaluation.interview_id
        ).having(
            db.func.count(InterviewEvaluation.id) >= 2
        ).limit(3).all()
        
        for (interview_id,) in interviews_with_multiple_evaluations:
            try:
                analysis = InterviewerProfileService.analyze_interview_panel_relative(db, interview_id)
                if analysis['success']:
                    print(f"면접 {interview_id} 상대적 분석:")
                    print(f"  - 면접관 수: {analysis['interviewer_count']}")
                    print(f"  - 점수 분산: {analysis['score_variance']:.2f}")
                    print(f"  - 점수 범위: {analysis['score_range']:.2f}")
                    print(f"  - 평균 점수: {analysis['avg_score']:.2f}")
                    print(f"  - 상대적 엄격도: {analysis['relative_strictness']}")
                    break
            except Exception as e:
                print(f"면접 {interview_id} 상대적 분석 실패: {str(e)}")
        
        # 6. 데이터베이스 상태 확인
        print("\n6. 데이터베이스 상태 확인")
        total_profiles = db.query(InterviewerProfile).count()
        active_profiles = db.query(InterviewerProfile).filter(InterviewerProfile.is_active == True).count()
        total_history = db.query(InterviewerProfile.history).count()
        
        print(f"총 면접관 프로필: {total_profiles}")
        print(f"활성 프로필: {active_profiles}")
        print(f"총 히스토리 기록: {total_history}")
        
        # 7. 상세 프로필 정보 출력
        print("\n7. 상세 프로필 정보 (처음 3명)")
        profiles = db.query(InterviewerProfile).limit(3).all()
        for profile in profiles:
            print(f"\n면접관 {profile.evaluator_id}:")
            print(f"  - 엄격도: {profile.strictness_score}")
            print(f"  - 일관성: {profile.consistency_score}")
            print(f"  - 기술 중심도: {profile.tech_focus_score}")
            print(f"  - 인성 중심도: {profile.personality_focus_score}")
            print(f"  - 경험치: {profile.experience_score}")
            print(f"  - 총 면접: {profile.total_interviews}회")
            print(f"  - 신뢰도: {profile.confidence_level}%")
            print(f"  - 특성: {profile.get_characteristic_summary()}")
        
        print("\n" + "=" * 60)
        print("면접관 프로필 시스템 테스트 완료")
        print("=" * 60)
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def test_balance_algorithm():
    """밸런스 알고리즘 상세 테스트"""
    db = SessionLocal()
    
    try:
        print("\n" + "=" * 60)
        print("밸런스 알고리즘 상세 테스트")
        print("=" * 60)
        
        # 면접관 프로필들 조회
        profiles = db.query(InterviewerProfile).filter(
            InterviewerProfile.is_active == True
        ).limit(5).all()
        
        if len(profiles) < 3:
            print("테스트를 위한 충분한 면접관 프로필 데이터가 없습니다.")
            return
        
        print(f"테스트 대상 면접관 수: {len(profiles)}")
        
        # 각 면접관의 특성 출력
        for profile in profiles:
            print(f"\n면접관 {profile.evaluator_id}:")
            print(f"  - 엄격도: {profile.strictness_score}")
            print(f"  - 일관성: {profile.consistency_score}")
            print(f"  - 기술 중심도: {profile.tech_focus_score}")
            print(f"  - 인성 중심도: {profile.personality_focus_score}")
            print(f"  - 경험치: {profile.experience_score}")
            print(f"  - 특성: {profile.get_characteristic_summary()}")
        
        # 가능한 모든 3명 조합의 밸런스 점수 계산
        from itertools import combinations
        
        print(f"\n가능한 모든 3명 조합의 밸런스 점수:")
        best_combination = None
        best_score = 0.0
        
        for combo in combinations(profiles, 3):
            balance_score = InterviewerProfileService._calculate_team_balance_score(combo)
            interviewer_ids = [p.evaluator_id for p in combo]
            print(f"  조합 {interviewer_ids}: {balance_score:.2f}")
            
            if balance_score > best_score:
                best_score = balance_score
                best_combination = combo
        
        if best_combination:
            print(f"\n최적 조합: {[p.evaluator_id for p in best_combination]}")
            print(f"최고 밸런스 점수: {best_score:.2f}")
            
            # 최적 조합의 상세 분석
            print(f"\n최적 조합 상세 분석:")
            for profile in best_combination:
                print(f"  - 면접관 {profile.evaluator_id}: {profile.get_characteristic_summary()}")
        
    except Exception as e:
        print(f"밸런스 알고리즘 테스트 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_interviewer_profile_system()
    test_balance_algorithm() 