"""
면접관 프로필 서비스
개별 면접관 특성 분석과 상대적 비교 분석을 통합한 서비스
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import statistics
from decimal import Decimal
import json

from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem
from app.models.interviewer_profile import InterviewerProfile, InterviewerProfileHistory
from app.models.auth.user import CompanyUser
from app.models.schedule import ScheduleInterview


class InterviewerProfileService:
    
    @staticmethod
    def create_evaluation_with_profile(
        db: Session, 
        interview_id: int, 
        evaluator_id: int, 
        total_score: float,
        summary: str = None,
        evaluation_items: List[Dict] = None
    ) -> InterviewEvaluation:
        """면접 평가 생성과 동시에 면접관 프로필 업데이트"""
        
        # 기본 평가 생성 (기존 테이블 사용)
        evaluation = InterviewEvaluation(
            interview_id=interview_id,
            evaluator_id=evaluator_id,
            total_score=total_score,
            summary=summary,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            status="SUBMITTED"
        )
        
        db.add(evaluation)
        db.flush()  # ID 생성
        
        # 평가 항목 추가
        if evaluation_items:
            for item_data in evaluation_items:
                item = InterviewEvaluationItem(
                    evaluation_id=evaluation.id,
                    evaluate_type=item_data.get('type'),
                    evaluate_score=item_data.get('score'),
                    grade=item_data.get('grade'),
                    comment=item_data.get('comment')
                )
                db.add(item)
        
        # 면접관 프로필 업데이트
        InterviewerProfileService._update_interviewer_profile(db, evaluator_id, evaluation.id)
        
        db.commit()
        return evaluation
    
    @staticmethod
    def _update_interviewer_profile(db: Session, evaluator_id: int, evaluation_id: int = None) -> InterviewerProfile:
        """면접관의 프로필 계산 및 업데이트"""
        
        # 기존 면접관 프로필 조회 또는 생성
        profile = db.query(InterviewerProfile).filter(
            InterviewerProfile.evaluator_id == evaluator_id
        ).first()
        
        if not profile:
            profile = InterviewerProfile(evaluator_id=evaluator_id)
            db.add(profile)
            db.flush()
        
        # 이전 값 저장 (히스토리용)
        old_values = {
            'strictness_score': float(profile.strictness_score if profile.strictness_score is not None else 50),
            'consistency_score': float(profile.consistency_score if profile.consistency_score is not None else 50),
            'tech_focus_score': float(profile.tech_focus_score if profile.tech_focus_score is not None else 50),
            'personality_focus_score': float(profile.personality_focus_score if profile.personality_focus_score is not None else 50),
            'experience_score': float(profile.experience_score if profile.experience_score is not None else 50),
            'total_interviews': profile.total_interviews if profile.total_interviews is not None else 0
        }
        
        # 면접관의 모든 평가 데이터 수집 (기존 테이블에서)
        evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.evaluator_id == evaluator_id
        ).all()
        
        if not evaluations:
            # 평가 데이터가 없으면 기본값 유지
            profile.confidence_level = 0.0
            return profile
        
        # 기본 통계 계산
        total_scores = [float(e.total_score) for e in evaluations if e.total_score]
        memos = [e.summary for e in evaluations if e.summary]
        
        profile.total_interviews = len(evaluations)
        profile.avg_score_given = Decimal(str(statistics.mean(total_scores))) if total_scores else Decimal('0.0')
        profile.score_variance = Decimal(str(statistics.variance(total_scores))) if len(total_scores) > 1 else Decimal('0.0')
        profile.avg_memo_length = Decimal(str(statistics.mean([len(m) for m in memos]))) if memos else Decimal('0.0')
        profile.last_evaluation_date = datetime.now()
        
        # 최신 평가 ID 업데이트
        if evaluation_id:
            profile.latest_evaluation_id = evaluation_id
        
        # 개별 평가 항목 분석
        tech_scores = []
        personality_scores = []
        
        for eval_data in evaluations:
            if eval_data.evaluation_items:
                for item in eval_data.evaluation_items:
                    if '역량' in item.evaluate_type or '기술' in item.evaluate_type:
                        tech_scores.append(float(item.evaluate_score))
                    elif '인성' in item.evaluate_type:
                        personality_scores.append(float(item.evaluate_score))
        
        profile.avg_tech_score = Decimal(str(statistics.mean(tech_scores))) if tech_scores else Decimal('0.0')
        profile.avg_personality_score = Decimal(str(statistics.mean(personality_scores))) if personality_scores else Decimal('0.0')
        
        # 특성 점수 계산
        all_interviewers_stats = InterviewerProfileService._get_all_interviewers_stats(db, evaluator_id)
        
        # 1. 엄격도 계산 (평균 점수가 낮을수록 엄격)
        if all_interviewers_stats['avg_scores'] and profile.avg_score_given:
            avg_of_all = statistics.mean(all_interviewers_stats['avg_scores'])
            strictness_raw = max(0, (avg_of_all - float(profile.avg_score_given)) / avg_of_all * 100)
            profile.strictness_score = Decimal(str(min(100, strictness_raw)))
            profile.leniency_score = Decimal(str(100 - strictness_raw))
        
        # 2. 일관성 계산 (분산이 낮을수록 일관성 높음)
        if all_interviewers_stats['variances'] and profile.score_variance:
            avg_variance = statistics.mean(all_interviewers_stats['variances'])
            if avg_variance > 0:
                consistency_raw = max(0, (avg_variance - float(profile.score_variance)) / avg_variance * 100)
                profile.consistency_score = Decimal(str(min(100, consistency_raw)))
        
        # 3. 기술/인성 중심도 계산
        if tech_scores and personality_scores:
            tech_avg = statistics.mean(tech_scores)
            personality_avg = statistics.mean(personality_scores)
            total_avg = (tech_avg + personality_avg) / 2
            
            if total_avg > 0:
                profile.tech_focus_score = Decimal(str(min(100, (tech_avg / total_avg) * 50)))
                profile.personality_focus_score = Decimal(str(min(100, (personality_avg / total_avg) * 50)))
        
        # 4. 상세도 계산 (메모 길이 기반)
        if all_interviewers_stats['memo_lengths'] and profile.avg_memo_length:
            avg_memo_length = statistics.mean(all_interviewers_stats['memo_lengths'])
            if avg_memo_length > 0:
                detail_raw = min(100, float(profile.avg_memo_length) / avg_memo_length * 50)
                profile.detail_level_score = Decimal(str(detail_raw))
        
        # 5. 경험치 계산 (면접 횟수 기반)
        max_interviews = max(all_interviewers_stats['interview_counts']) if all_interviewers_stats['interview_counts'] else 1
        experience_raw = min(100, (profile.total_interviews / max_interviews) * 100)
        profile.experience_score = Decimal(str(experience_raw))
        
        # 6. 정확도 계산 (다른 면접관과의 일치도) - 나중에 구현
        profile.accuracy_score = Decimal('50.0')  # 기본값
        
        # 7. 신뢰도 계산 (데이터 충분성)
        confidence = min(100, (profile.total_interviews / 10) * 100)
        profile.confidence_level = Decimal(str(confidence))
        
        # 8. 프로필 버전 업데이트
        profile.profile_version += 1
        
        # 히스토리 기록
        new_values = {
            'strictness_score': float(profile.strictness_score if profile.strictness_score is not None else 50),
            'consistency_score': float(profile.consistency_score if profile.consistency_score is not None else 50),
            'tech_focus_score': float(profile.tech_focus_score if profile.tech_focus_score is not None else 50),
            'personality_focus_score': float(profile.personality_focus_score if profile.personality_focus_score is not None else 50),
            'experience_score': float(profile.experience_score if profile.experience_score is not None else 50),
            'total_interviews': profile.total_interviews if profile.total_interviews is not None else 0
        }
        
        # 히스토리 기록 (evaluation_id가 있을 때만)
        if evaluation_id:
            history = InterviewerProfileHistory(
                interviewer_profile_id=profile.id,
                evaluation_id=evaluation_id,
                old_values=json.dumps(old_values),
                new_values=json.dumps(new_values),
                change_type='evaluation_added',
                change_reason=f'평가 {evaluation_id} 추가로 인한 업데이트'
            )
            db.add(history)
        else:
            # 스케줄러나 초기화로 인한 업데이트
            history = InterviewerProfileHistory(
                interviewer_profile_id=profile.id,
                evaluation_id=None,
                old_values=json.dumps(old_values),
                new_values=json.dumps(new_values),
                change_type='profile_initialized',
                change_reason='면접관 프로필 초기화/재계산'
            )
            db.add(history)
        
        return profile
    
    @staticmethod
    def initialize_interviewer_profile(db: Session, evaluator_id: int) -> Optional[InterviewerProfile]:
        """면접관 프로필 초기화 및 생성"""
        try:
            # 기존 프로필 확인
            profile = db.query(InterviewerProfile).filter(
                InterviewerProfile.evaluator_id == evaluator_id
            ).first()
            
            if profile:
                # 기존 프로필 업데이트 (evaluation_id 없이 호출)
                return InterviewerProfileService._update_interviewer_profile(db, evaluator_id, None)
            else:
                # 새 프로필 생성
                profile = InterviewerProfile(evaluator_id=evaluator_id)
                db.add(profile)
                db.flush()
                
                # 프로필 계산 (evaluation_id 없이 호출)
                return InterviewerProfileService._update_interviewer_profile(db, evaluator_id, None)
                
        except Exception as e:
            print(f"면접관 {evaluator_id} 프로필 초기화 실패: {str(e)}")
            return None

    @staticmethod
    def _get_all_interviewers_stats(db: Session, exclude_interviewer_id: int = None) -> Dict:
        """전체 면접관들의 통계 데이터 수집 (기존 테이블에서)"""
        
        query = db.query(
            InterviewEvaluation.evaluator_id,
            func.avg(InterviewEvaluation.total_score).label('avg_score'),
            func.variance(InterviewEvaluation.total_score).label('variance'),
            func.count(InterviewEvaluation.id).label('interview_count'),
            func.avg(func.length(InterviewEvaluation.summary)).label('avg_memo_length')
        ).filter(
            InterviewEvaluation.evaluator_id.isnot(None),
            InterviewEvaluation.total_score.isnot(None)
        )
        
        if exclude_interviewer_id:
            query = query.filter(InterviewEvaluation.evaluator_id != exclude_interviewer_id)
        
        results = query.group_by(InterviewEvaluation.evaluator_id).all()
        
        return {
            'avg_scores': [float(r.avg_score) for r in results if r.avg_score],
            'variances': [float(r.variance) for r in results if r.variance],
            'interview_counts': [int(r.interview_count) for r in results if r.interview_count],
            'memo_lengths': [float(r.avg_memo_length) for r in results if r.avg_memo_length]
        }
    
    @staticmethod
    def get_balanced_panel_recommendation(
        db: Session, 
        available_interviewers: List[int], 
        required_count: int = 3
    ) -> Tuple[List[int], float]:
        """밸런스 있는 면접 패널 추천"""
        
        # 면접관들의 프로필 조회
        profiles = db.query(InterviewerProfile).filter(
            InterviewerProfile.evaluator_id.in_(available_interviewers),
            InterviewerProfile.is_active == True
        ).all()
        
        if len(profiles) < required_count:
            # 프로필이 없는 면접관들도 포함
            missing_ids = set(available_interviewers) - {p.evaluator_id for p in profiles}
            for interviewer_id in missing_ids:
                profile = InterviewerProfileService._update_interviewer_profile(db, interviewer_id)
                profiles.append(profile)
        
        # 가능한 모든 조합에서 최적 조합 찾기
        from itertools import combinations
        
        best_combination = None
        best_score = 0.0
        
        for combo in combinations(profiles, required_count):
            # 밸런스 점수 계산
            balance_score = InterviewerProfileService._calculate_team_balance_score(combo)
            
            if balance_score > best_score:
                best_score = balance_score
                best_combination = combo
        
        if best_combination:
            return [p.evaluator_id for p in best_combination], best_score
        else:
            return available_interviewers[:required_count], 0.0
    
    @staticmethod
    def _calculate_team_balance_score(profiles: List[InterviewerProfile]) -> float:
        """팀의 밸런스 점수 계산"""
        if len(profiles) < 2:
            return 0.0
        
        # 1. 엄격도 분산 (낮을수록 좋음)
        strictness_scores = [float(p.strictness_score or 50) for p in profiles]
        strictness_variance = statistics.variance(strictness_scores) if len(strictness_scores) > 1 else 0
        strictness_balance = max(0, 100 - strictness_variance)
        
        # 2. 전문성 커버리지 (기술+인성 모두 커버하는지)
        tech_scores = [float(p.tech_focus_score or 50) for p in profiles]
        personality_scores = [float(p.personality_focus_score or 50) for p in profiles]
        
        tech_coverage = max(tech_scores)
        personality_coverage = max(personality_scores)
        coverage_score = (tech_coverage + personality_coverage) / 2
        
        # 3. 경험 점수 평균
        experience_scores = [float(p.experience_score or 50) for p in profiles]
        experience_avg = statistics.mean(experience_scores)
        
        # 4. 일관성 점수 평균
        consistency_scores = [float(p.consistency_score or 50) for p in profiles]
        consistency_avg = statistics.mean(consistency_scores)
        
        # 최종 밸런스 점수 (가중 평균)
        balance_score = (
            strictness_balance * 0.3 +      # 엄격도 분산 최소화
            coverage_score * 0.3 +          # 전문성 커버리지
            experience_avg * 0.2 +          # 경험치
            consistency_avg * 0.2           # 일관성
        )
        
        return round(balance_score, 2)
    
    @staticmethod
    def get_interviewer_characteristics(db: Session, interviewer_id: int) -> Dict:
        """면접관 특성 요약 반환"""
        
        profile = db.query(InterviewerProfile).filter(
            InterviewerProfile.evaluator_id == interviewer_id,
            InterviewerProfile.is_active == True
        ).first()
        
        if not profile:
            # 프로필이 없으면 생성
            profile = InterviewerProfileService._update_interviewer_profile(db, interviewer_id)
        
        characteristics = profile.get_characteristic_summary()
        
        return {
            'characteristics': characteristics,
            'confidence': float(profile.confidence_level or 0),
            'strictness_score': float(profile.strictness_score or 50),
            'consistency_score': float(profile.consistency_score or 50),
            'tech_focus_score': float(profile.tech_focus_score or 50),
            'personality_focus_score': float(profile.personality_focus_score or 50),
            'experience_score': float(profile.experience_score or 50),
            'total_interviews': profile.total_interviews or 0,
            'summary': f"신뢰도 {profile.confidence_level or 0}% | {', '.join(characteristics)}"
        }
    
    @staticmethod
    def analyze_interview_panel_relative(db: Session, interview_id: int) -> Dict:
        """면접 패널의 상대적 분석"""
        
        # 해당 면접의 모든 평가 데이터 수집 (기존 테이블에서)
        evaluations = db.query(InterviewEvaluation).filter(
            InterviewEvaluation.interview_id == interview_id
        ).all()
        
        if len(evaluations) < 2:
            return {
                'success': False,
                'message': f'면접 {interview_id}에 평가가 {len(evaluations)}개뿐입니다. 상대적 분석을 위해 최소 2개 필요합니다.'
            }
        
        # 면접관별 점수 수집
        interviewer_scores = {}
        for eval_data in evaluations:
            interviewer_scores[eval_data.evaluator_id] = float(eval_data.total_score)
        
        # 기본 통계 계산
        scores = list(interviewer_scores.values())
        avg_score = statistics.mean(scores)
        score_variance = statistics.variance(scores) if len(scores) > 1 else 0
        score_range = max(scores) - min(scores)
        
        # 상대적 엄격도 계산
        relative_strictness = {}
        for interviewer_id, score in interviewer_scores.items():
            # 점수가 낮을수록 엄격한 것으로 간주
            relative_strictness[interviewer_id] = (avg_score - score) / avg_score if avg_score > 0 else 0
        
        # 상대적 일관성 계산 (다른 면접관들과의 점수 차이)
        relative_consistency = {}
        for interviewer_id, score in interviewer_scores.items():
            other_scores = [s for i, s in interviewer_scores.items() if i != interviewer_id]
            if other_scores:
                avg_others = statistics.mean(other_scores)
                relative_consistency[interviewer_id] = 1 - abs(score - avg_others) / avg_others if avg_others > 0 else 0
            else:
                relative_consistency[interviewer_id] = 0
        
        # 상대적 객관성 계산 (면접관 프로필과 실제 점수의 일치도)
        relative_objectivity = {}
        for eval_data in evaluations:
            interviewer_profile = db.query(InterviewerProfile).filter(
                InterviewerProfile.evaluator_id == eval_data.evaluator_id
            ).first()
            
            if interviewer_profile and interviewer_profile.strictness_score and eval_data.total_score:
                # 엄격한 면접관이 낮은 점수를 주면 객관적
                expected_score = 5.0 - (float(interviewer_profile.strictness_score) / 100) * 2.0  # 1-5점 스케일
                actual_score = float(eval_data.total_score)
                objectivity = 1 - abs(expected_score - actual_score) / 5.0
                relative_objectivity[eval_data.evaluator_id] = max(0, objectivity)
        
        return {
            'success': True,
            'interview_id': interview_id,
            'interviewer_count': len(evaluations),
            'score_variance': score_variance,
            'score_range': score_range,
            'avg_score': avg_score,
            'relative_strictness': relative_strictness,
            'relative_consistency': relative_consistency,
            'relative_objectivity': relative_objectivity
        } 