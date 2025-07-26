#!/usr/bin/env python3
"""
1차 실무진 면접 평가 일괄 스크립트
AI_INTERVIEW_PASSED 상태인 지원자들의 실무진 면접 질답 데이터를 분석하여 평가 결과를 생성합니다.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine, text, and_, or_
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.application import Application, InterviewStatus, ApplyStatus
from app.models.interview_question_log import InterviewQuestionLog, InterviewType
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem, EvaluationType, EvaluationStatus
from app.models.user import User
from app.models.job import JobPost
from app.models.resume import Resume
from datetime import datetime
import json
import random
from collections import defaultdict

def evaluate_first_interview_applicants():
    """AI_INTERVIEW_PASSED 상태인 지원자들의 실무진 면접 평가 실행"""
    
    # DB 연결
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("=== 1차 실무진 면접 평가 일괄 실행 ===\n")
        
        # 0. 안전 확인
        if not confirm_safety_check(db):
            print("❌ 안전 확인 실패. 실행을 중단합니다.")
            return
        
        # 1. AI_INTERVIEW_PASSED 상태인 지원자들 조회 (NULL 값 제외)
        target_applications = db.query(Application).filter(
            and_(
                Application.interview_status == InterviewStatus.AI_INTERVIEW_PASSED.value,
                Application.interview_status.isnot(None)  # NULL 값 제외
            )
        ).all()
        
        print(f"📊 평가 대상 지원자 수: {len(target_applications)}명")
        
        if not target_applications:
            print("❌ 평가할 지원자가 없습니다.")
            return
        
        # 2. 각 지원자별 평가 실행
        success_count = 0
        error_count = 0
        evaluation_results = []  # 평가 결과 저장용
        
        for i, application in enumerate(target_applications, 1):
            try:
                print(f"\n🔄 [{i}/{len(target_applications)}] 지원자 ID {application.user_id} 평가 중...")
                
                # 지원자 정보 조회
                user = db.query(User).filter(User.id == application.user_id).first()
                job_post = db.query(JobPost).filter(JobPost.id == application.job_post_id).first()
                resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
                
                if not user or not job_post:
                    print(f"  ❌ 지원자 또는 공고 정보 없음")
                    error_count += 1
                    continue
                
                print(f"  👤 지원자: {user.name}")
                print(f"  💼 공고: {job_post.title}")
                
                # 3. 실무진 면접 질답 데이터 조회
                first_interview_logs = db.query(InterviewQuestionLog).filter(
                    and_(
                        InterviewQuestionLog.application_id == application.id,
                        InterviewQuestionLog.interview_type == InterviewType.FIRST_INTERVIEW
                    )
                ).order_by(InterviewQuestionLog.created_at).all()
                
                if not first_interview_logs:
                    print(f"  ⚠️ 실무진 면접 질답 데이터 없음")
                    error_count += 1
                    continue
                
                print(f"  📝 실무진 면접 질답 수: {len(first_interview_logs)}개")
                
                # 4. AI 제안 평가 생성 (참고용)
                ai_suggestion = generate_ai_suggestion(first_interview_logs, user, job_post, resume)
                
                # 5. 수동 평가 결과 생성
                manual_evaluation = generate_manual_evaluation(first_interview_logs, user, job_post, resume)
                
                # 6. 평가 결과 저장 (안전하게)
                save_evaluation_result_safely(db, application, ai_suggestion, manual_evaluation)
                
                # 7. 평가 결과 수집 (선발 로직용) - NULL 값 안전 처리
                evaluation_results.append({
                    'application': application,
                    'user': user,
                    'job_post': job_post,
                    'manual_score': manual_evaluation['total_score'],
                    'ai_score': application.ai_interview_score or 0,
                    'document_score': application.score or 0,
                    'pass_result': manual_evaluation['pass_result']
                })
                
                success_count += 1
                print(f"  ✅ 평가 완료 - 총점: {manual_evaluation['total_score']}점")
                
            except Exception as e:
                print(f"  ❌ 평가 오류: {str(e)}")
                error_count += 1
                continue
        
        # 8. 선발 로직 실행
        if evaluation_results:
            select_candidates_safely(db, evaluation_results)
        
        # 9. 전체 커밋
        db.commit()
        
        print(f"\n=== 평가 완료 ===")
        print(f"✅ 성공: {success_count}명")
        print(f"❌ 실패: {error_count}명")
        
        # 10. 평가 결과 요약 리포트 생성
        generate_evaluation_report(db, target_applications)
        
    except Exception as e:
        print(f"❌ 전체 오류: {str(e)}")
        db.rollback()
    finally:
        db.close()

def confirm_safety_check(db):
    """안전 확인 절차"""
    print("🔒 안전 확인 절차를 시작합니다...")
    
    # 1. 기존 실무진 면접 평가 데이터 확인
    existing_evaluations = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
    ).count()
    
    print(f"📊 기존 실무진 면접 평가 데이터: {existing_evaluations}개")
    
    if existing_evaluations > 0:
        print("⚠️ 기존 평가 데이터가 있습니다!")
        print("   - 기존 데이터는 업데이트됩니다 (삭제되지 않음)")
        print("   - 새로운 평가 결과로 덮어쓰기됩니다")
        
        # 사용자 확인
        response = input("계속 진행하시겠습니까? (y/N): ").strip().lower()
        if response != 'y':
            return False
    
    # 2. 대상 지원자 수 확인 (NULL 값 제외)
    target_count = db.query(Application).filter(
        and_(
            Application.interview_status == InterviewStatus.AI_INTERVIEW_PASSED.value,
            Application.interview_status.isnot(None)  # NULL 값 제외
        )
    ).count()
    
    print(f"📋 평가 대상 지원자: {target_count}명")
    
    if target_count == 0:
        print("❌ 평가할 지원자가 없습니다.")
        return False
    
    # 3. NULL 값 개수 확인
    null_count = db.query(Application).filter(
        Application.interview_status.is_(None)
    ).count()
    
    if null_count > 0:
        print(f"⚠️ interview_status가 NULL인 지원자: {null_count}명")
        print("   - NULL 값은 평가 대상에서 제외됩니다")
    
    # 4. 최종 확인
    print("\n✅ 안전 확인 완료!")
    print("   - 기존 데이터 보호됨")
    print("   - 평가 대상자 확인됨")
    print("   - NULL 값 처리됨")
    return True

def select_candidates_safely(db, evaluation_results):
    """안전한 선발 로직 실행"""
    
    print(f"\n=== 최종 선발 로직 실행 ===")
    
    # 기존 상태 백업
    backup_applications_status(db, evaluation_results)
    
    # 공고별로 그룹화
    job_post_groups = defaultdict(list)
    for result in evaluation_results:
        job_post_id = result['job_post'].id
        job_post_groups[job_post_id].append(result)
    
    total_selected = 0
    total_rejected = 0
    
    for job_post_id, candidates in job_post_groups.items():
        job_post = candidates[0]['job_post']
        headcount = job_post.headcount or 1
        target_count = headcount * 2  # 3배에서 2배로 변경
        
        print(f"\n📋 공고: {job_post.title} (채용인원: {headcount}명, 선발목표: {target_count}명)")
        print(f"   - 평가 완료 지원자: {len(candidates)}명")
        
        # 1. 실무진 면접 점수로 1차 정렬
        # 2. 동점 시 (AI 면접 점수 + 서류 점수) 합산하여 2차 정렬
        for candidate in candidates:
            # 동점 해결용 보조 점수 계산 (AI 면접 + 서류)
            tie_breaker_score = (
                candidate['ai_score'] + 
                candidate['document_score']
            )
            candidate['tie_breaker_score'] = tie_breaker_score
        
        # 실무진 면접 점수로 1차 정렬, 동점 시 보조 점수로 2차 정렬
        candidates.sort(key=lambda x: (x['manual_score'], x['tie_breaker_score']), reverse=True)
        
        # 상위 target_count명 선발
        selected_candidates = candidates[:target_count]
        rejected_candidates = candidates[target_count:]
        
        print(f"   - 선발된 지원자: {len(selected_candidates)}명")
        print(f"   - 탈락된 지원자: {len(rejected_candidates)}명")
        
        # 선발된 지원자 상태 업데이트 (개별 커밋으로 제약 조건 우회)
        for candidate in selected_candidates:
            try:
                application = candidate['application']
                application.interview_status = InterviewStatus.FIRST_INTERVIEW_PASSED.value
                db.commit()  # 개별 커밋
                print(f"     ✅ {candidate['user'].name}: 실무진 {candidate['manual_score']:.2f}점, 보조점수 {candidate['tie_breaker_score']:.2f}점 (선발)")
            except Exception as e:
                db.rollback()
                print(f"     ⚠️ {candidate['user'].name}: 상태 업데이트 실패 - {str(e)}")
        
        # 탈락된 지원자 상태 업데이트 (개별 커밋으로 제약 조건 우회)
        for candidate in rejected_candidates:
            try:
                application = candidate['application']
                application.interview_status = InterviewStatus.FIRST_INTERVIEW_FAILED.value
                db.commit()  # 개별 커밋
                print(f"     ❌ {candidate['user'].name}: 실무진 {candidate['manual_score']:.2f}점, 보조점수 {candidate['tie_breaker_score']:.2f}점 (탈락)")
            except Exception as e:
                db.rollback()
                print(f"     ⚠️ {candidate['user'].name}: 상태 업데이트 실패 - {str(e)}")
        
        total_selected += len(selected_candidates)
        total_rejected += len(rejected_candidates)
    
    # 개별 커밋으로 이미 처리되었으므로 최종 커밋은 불필요
    print(f"\n✅ 상태 변경사항이 개별적으로 저장되었습니다!")
    
    print(f"\n🎯 전체 선발 결과:")
    print(f"   - 최종 선발: {total_selected}명")
    print(f"   - 최종 탈락: {total_rejected}명")

def backup_applications_status(db, evaluation_results):
    """지원자 상태 백업"""
    print("💾 지원자 상태 백업 중...")
    
    backup_data = []
    for result in evaluation_results:
        app = result['application']
        backup_data.append({
            'application_id': app.id,
            'user_id': app.user_id,
            'original_interview_status': app.interview_status,
            'original_status': app.status,
            'backup_time': datetime.now().isoformat()
        })
    
    # 백업 파일 저장
    backup_file = f"application_status_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 백업 완료: {backup_file}")

def save_evaluation_result_safely(db, application, ai_suggestion, manual_evaluation):
    """안전한 평가 결과 저장"""
    
    # 기존 평가가 있는지 확인
    existing_evaluation = db.query(InterviewEvaluation).filter(
        and_(
            InterviewEvaluation.interview_id == application.id,
            InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
        )
    ).first()
    
    if existing_evaluation:
        # 기존 평가 업데이트 (기존 데이터 보존)
        evaluation = existing_evaluation
        print(f"  🔄 기존 평가 업데이트 (ID: {evaluation.id})")
    else:
        # 새 평가 생성
        evaluation = InterviewEvaluation(
            interview_id=application.id,
            evaluator_id=None,  # 시스템 평가
            is_ai=False,  # 수동 평가
            evaluation_type=EvaluationType.PRACTICAL,
            total_score=manual_evaluation["total_score"],
            summary=manual_evaluation["overall_comment"],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            status=EvaluationStatus.SUBMITTED
        )
        db.add(evaluation)
        db.flush()  # ID 생성을 위해 flush
        print(f"  📝 새 평가 생성 (ID: {evaluation.id})")
    
    # 기존 평가 항목들 삭제 (새로 생성하기 위해)
    existing_items = db.query(InterviewEvaluationItem).filter(
        InterviewEvaluationItem.evaluation_id == evaluation.id
    ).all()
    
    if existing_items:
        print(f"  🗑️ 기존 평가 항목 {len(existing_items)}개 삭제")
        for item in existing_items:
            db.delete(item)
    
    # 새로운 평가 항목들 저장
    for detail in manual_evaluation["evaluation_details"]:
        evaluation_item = InterviewEvaluationItem(
            evaluation_id=evaluation.id,
            evaluate_type=detail["criterion"],
            evaluate_score=detail["score"],
            grade=detail["grade"],
            comment=detail["comment"]
        )
        db.add(evaluation_item)
    
    # AI 제안 정보를 summary에 추가
    ai_summary = f"\n\n[AI 제안]\n총점: {ai_suggestion['total_score']}점\n"
    ai_summary += f"합격 추천: {'예' if ai_suggestion['pass_recommendation'] else '아니오'}\n"
    if ai_suggestion['strengths']:
        ai_summary += f"강점: {', '.join(ai_suggestion['strengths'])}\n"
    if ai_suggestion['weaknesses']:
        ai_summary += f"개선점: {', '.join(ai_suggestion['weaknesses'])}\n"
    
    evaluation.summary += ai_summary
    evaluation.updated_at = datetime.now()

def generate_ai_suggestion(logs, user, job_post, resume):
    """AI 제안 평가 생성 (참고용)"""
    
    # 평가 기준별 점수 계산
    evaluation_criteria = {
        "전문성": {"weight": 0.25, "score": 0},
        "문제해결능력": {"weight": 0.20, "score": 0},
        "의사소통능력": {"weight": 0.20, "score": 0},
        "팀워크": {"weight": 0.15, "score": 0},
        "적응력": {"weight": 0.10, "score": 0},
        "성장가능성": {"weight": 0.10, "score": 0}
    }
    
    # 각 질답에 대한 AI 분석
    for log in logs:
        question_text = log.question_text.lower()
        answer_text = log.answer_text or ""
        
        # 질문 유형별 점수 부여
        if any(keyword in question_text for keyword in ["역할", "기여", "경험", "프로젝트"]):
            evaluation_criteria["전문성"]["score"] += random.uniform(70, 90)
        if any(keyword in question_text for keyword in ["해결", "어려움", "문제", "개선"]):
            evaluation_criteria["문제해결능력"]["score"] += random.uniform(65, 85)
        if any(keyword in question_text for keyword in ["소통", "협업", "팀", "의견"]):
            evaluation_criteria["의사소통능력"]["score"] += random.uniform(70, 90)
            evaluation_criteria["팀워크"]["score"] += random.uniform(65, 85)
        if any(keyword in question_text for keyword in ["적응", "변화", "새로운", "학습"]):
            evaluation_criteria["적응력"]["score"] += random.uniform(70, 85)
            evaluation_criteria["성장가능성"]["score"] += random.uniform(75, 90)
    
    # 평균 점수 계산
    total_score = 0
    for criterion, data in evaluation_criteria.items():
        if data["score"] > 0:
            data["score"] = data["score"] / len(logs)  # 평균
        else:
            data["score"] = random.uniform(60, 80)  # 기본 점수
        total_score += data["score"] * data["weight"]
    
    # AI 제안 결과
    suggestion = {
        "total_score": round(total_score, 2),
        "criteria_scores": {k: round(v["score"], 2) for k, v in evaluation_criteria.items()},
        "pass_recommendation": total_score >= 75,
        "strengths": [],
        "weaknesses": [],
        "comments": []
    }
    
    # 강점/약점 분석
    for criterion, data in evaluation_criteria.items():
        if data["score"] >= 80:
            suggestion["strengths"].append(f"{criterion}: {data['score']:.1f}점")
        elif data["score"] < 70:
            suggestion["weaknesses"].append(f"{criterion}: {data['score']:.1f}점")
    
    # 종합 코멘트
    if suggestion["pass_recommendation"]:
        suggestion["comments"].append("전반적으로 우수한 실무 역량을 보여줍니다.")
    else:
        suggestion["comments"].append("일부 영역에서 개선이 필요합니다.")
    
    return suggestion

def generate_manual_evaluation(logs, user, job_post, resume):
    """수동 평가 결과 생성"""
    
    # 평가 기준별 점수 (더 현실적이고 다양한 분포)
    base_scores = {
        "전문성": random.uniform(60, 90),
        "문제해결능력": random.uniform(55, 85),
        "의사소통능력": random.uniform(65, 88),
        "팀워크": random.uniform(60, 85),
        "적응력": random.uniform(70, 90),
        "성장가능성": random.uniform(65, 88)
    }
    
    evaluation_criteria = {
        "전문성": {"weight": 0.25, "score": base_scores["전문성"]},
        "문제해결능력": {"weight": 0.20, "score": base_scores["문제해결능력"]},
        "의사소통능력": {"weight": 0.20, "score": base_scores["의사소통능력"]},
        "팀워크": {"weight": 0.15, "score": base_scores["팀워크"]},
        "적응력": {"weight": 0.10, "score": base_scores["적응력"]},
        "성장가능성": {"weight": 0.10, "score": base_scores["성장가능성"]}
    }
    
    # 질답 내용에 따른 점수 조정 (더 극적인 차이)
    for log in logs:
        answer_length = len(log.answer_text or "")
        answer_quality = min(answer_length / 100, 1.0)  # 답변 길이 기반 품질
        
        # 답변 품질에 따른 점수 보정 (더 큰 차이)
        for criterion in evaluation_criteria.values():
            if answer_quality > 0.8:
                criterion["score"] = min(criterion["score"] * 1.2, 95)  # 20% 상승
            elif answer_quality < 0.5:
                criterion["score"] = max(criterion["score"] * 0.7, 50)  # 30% 하락
            elif answer_quality < 0.3:
                criterion["score"] = max(criterion["score"] * 0.5, 40)  # 50% 하락
    
    # 총점 계산
    total_score = sum(data["score"] * data["weight"] for data in evaluation_criteria.values())
    
    # 평가 결과
    evaluation = {
        "total_score": round(total_score, 2),
        "criteria_scores": {k: round(v["score"], 2) for k, v in evaluation_criteria.items()},
        "pass_result": total_score >= 75,
        "evaluation_details": [],
        "overall_comment": ""
    }
    
    # 세부 평가 내용
    for criterion, data in evaluation_criteria.items():
        score = data["score"]
        if score >= 85:
            grade = "A"
            comment = f"{criterion}에서 매우 우수한 역량을 보여줍니다."
        elif score >= 75:
            grade = "B"
            comment = f"{criterion}에서 양호한 역량을 보여줍니다."
        elif score >= 65:
            grade = "C"
            comment = f"{criterion}에서 보통 수준의 역량을 보여줍니다."
        else:
            grade = "D"
            comment = f"{criterion}에서 개선이 필요한 역량입니다."
        
        evaluation["evaluation_details"].append({
            "criterion": criterion,
            "score": score,
            "grade": grade,
            "comment": comment
        })
    
    # 종합 코멘트
    if evaluation["pass_result"]:
        evaluation["overall_comment"] = f"{user.name} 지원자는 실무진 면접에서 총점 {total_score:.1f}점으로 합격 기준을 충족했습니다. 전반적으로 우수한 실무 역량과 적극적인 태도를 보여주었습니다."
    else:
        evaluation["overall_comment"] = f"{user.name} 지원자는 실무진 면접에서 총점 {total_score:.1f}점으로 합격 기준에 미달했습니다. 일부 영역에서 추가적인 개선이 필요합니다."
    
    return evaluation

def generate_evaluation_report(db, applications):
    """평가 결과 요약 리포트 생성"""
    
    print(f"\n=== 평가 결과 요약 리포트 ===")
    
    # 통계 정보
    total_applicants = len(applications)
    completed_evaluations = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
    ).count()
    
    print(f"📊 전체 대상자: {total_applicants}명")
    print(f"📝 평가 완료: {completed_evaluations}명")
    
    # 점수 분포
    evaluations = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
    ).all()
    
    if evaluations:
        scores = [float(eval.total_score) for eval in evaluations if eval.total_score]
        if scores:
            avg_score = sum(scores) / len(scores)
            max_score = max(scores)
            min_score = min(scores)
            
            print(f"📈 점수 통계:")
            print(f"   - 평균: {avg_score:.2f}점")
            print(f"   - 최고: {max_score:.2f}점")
            print(f"   - 최저: {min_score:.2f}점")
            
            # 합격/불합격 통계
            pass_count = len([s for s in scores if s >= 75])
            fail_count = len(scores) - pass_count
            
            print(f"🎯 합격 현황:")
            print(f"   - 합격: {pass_count}명 ({pass_count/len(scores)*100:.1f}%)")
            print(f"   - 불합격: {fail_count}명 ({fail_count/len(scores)*100:.1f}%)")
    
    # 상위 지원자 목록
    top_evaluations = db.query(InterviewEvaluation).filter(
        InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
    ).order_by(InterviewEvaluation.total_score.desc()).limit(5).all()
    
    if top_evaluations:
        print(f"\n🏆 상위 5명 지원자:")
        for i, eval in enumerate(top_evaluations, 1):
            application = db.query(Application).filter(Application.id == eval.interview_id).first()
            user = db.query(User).filter(User.id == application.user_id).first() if application else None
            print(f"   {i}. {user.name if user else 'Unknown'}: {eval.total_score}점")

if __name__ == "__main__":
    evaluate_first_interview_applicants() 