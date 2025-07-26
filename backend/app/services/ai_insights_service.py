from sqlalchemy.orm import Session
from app.models.ai_insights import AIInsights, AIInsightsComparison
from app.models.interview_evaluation import InterviewEvaluation, EvaluationType
from app.models.application import Application
import sys
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

# LangGraph 워크플로우 import
sys.path.append(os.path.join(os.path.dirname(__file__), '../../agent'))
from agents.ai_insights_workflow import run_ai_insights_analysis

class AIInsightsService:
    
    @staticmethod
    def get_or_create_ai_insights(db: Session, job_post_id: int, force_regenerate: bool = False) -> Dict[str, Any]:
        """AI 인사이트 조회 또는 생성"""
        try:
            # 기존 분석 결과 확인
            existing_insights = db.query(AIInsights).filter(
                AIInsights.job_post_id == job_post_id,
                AIInsights.analysis_type == "advanced"
            ).order_by(AIInsights.created_at.desc()).first()
            
            # 강제 재생성이 아니고 최근 분석이 있으면 반환
            if not force_regenerate and existing_insights:
                # 24시간 이내 분석이면 재사용
                time_diff = datetime.now() - existing_insights.created_at
                if time_diff.total_seconds() < 86400:  # 24시간
                    return existing_insights.to_dict()
            
            # 면접 데이터 수집
            interview_data = AIInsightsService._collect_interview_data(db, job_post_id)
            
            if not interview_data.get("has_data"):
                return {
                    "error": "분석할 면접 데이터가 없습니다.",
                    "job_post_id": job_post_id
                }
            
            # LangGraph 워크플로우 실행
            start_time = time.time()
            langgraph_result = run_ai_insights_analysis(job_post_id, interview_data)
            execution_time = time.time() - start_time
            
            # DB에 저장
            db_insights = AIInsights(
                job_post_id=job_post_id,
                analysis_type="advanced",
                analysis_status="completed",
                langgraph_execution_id=f"lg_{job_post_id}_{int(time.time())}",
                execution_time=execution_time,
                score_analysis=langgraph_result.get("insights", {}).get("basic", {}).get("score_distribution"),
                correlation_analysis=langgraph_result.get("insights", {}).get("basic", {}).get("pattern_analysis"),
                trend_analysis=langgraph_result.get("insights", {}).get("basic", {}).get("pattern_analysis"),
                recommendations=langgraph_result.get("recommendations", []),
                predictions=langgraph_result.get("insights", {}).get("basic", {}).get("score_distribution"),
                advanced_insights=langgraph_result.get("insights", {}).get("advanced", {}),
                pattern_analysis=langgraph_result.get("insights", {}).get("basic", {}).get("pattern_analysis"),
                risk_assessment=langgraph_result.get("insights", {}).get("advanced", {}).get("risk_assessment"),
                optimization_suggestions=langgraph_result.get("insights", {}).get("advanced", {}).get("optimization_suggestions")
            )
            
            db.add(db_insights)
            db.commit()
            db.refresh(db_insights)
            
            return db_insights.to_dict()
            
        except Exception as e:
            db.rollback()
            # 에러 정보도 DB에 저장
            error_insights = AIInsights(
                job_post_id=job_post_id,
                analysis_type="advanced",
                analysis_status="failed",
                advanced_insights={"error": str(e)}
            )
            db.add(error_insights)
            db.commit()
            
            return {
                "error": f"AI 인사이트 분석 실패: {str(e)}",
                "job_post_id": job_post_id
            }
    
    @staticmethod
    def _collect_interview_data(db: Session, job_post_id: int) -> Dict[str, Any]:
        """면접 데이터 수집"""
        try:
            # 지원자 정보 수집
            applications = db.query(Application).filter(
                Application.job_post_id == job_post_id
            ).all()
            
            if not applications:
                return {"has_data": False}
            
            # 면접 평가 데이터 수집
            ai_evaluations = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.evaluation_type == EvaluationType.AI
            ).all()
            
            practical_evaluations = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.evaluation_type == EvaluationType.PRACTICAL
            ).all()
            
            executive_evaluations = db.query(InterviewEvaluation).filter(
                InterviewEvaluation.evaluation_type == EvaluationType.EXECUTIVE
            ).all()
            
            # 점수 데이터 추출
            ai_scores = [e.total_score for e in ai_evaluations if e.total_score is not None]
            practical_scores = [e.total_score for e in practical_evaluations if e.total_score is not None]
            executive_scores = [e.total_score for e in executive_evaluations if e.total_score is not None]
            
            # 지원자 상세 정보
            applicants_data = []
            for app in applications:
                applicant_data = {
                    "id": app.id,
                    "user_id": app.user_id,
                    "status": app.status.value if app.status else None,
                    "document_status": app.document_status.value if app.document_status else None,
                    "interview_status": app.interview_status.value if app.interview_status else None,
                    "final_status": app.final_status.value if app.final_status else None,
                    "score": app.score
                }
                applicants_data.append(applicant_data)
            
            return {
                "has_data": True,
                "job_post_id": job_post_id,
                "total_applicants": len(applications),
                "ai_scores": ai_scores,
                "practical_scores": practical_scores,
                "executive_scores": executive_scores,
                "all_applicants": applicants_data,
                "evaluation_counts": {
                    "ai": len(ai_evaluations),
                    "practical": len(practical_evaluations),
                    "executive": len(executive_evaluations)
                }
            }
            
        except Exception as e:
            return {
                "has_data": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_ai_insights_history(db: Session, job_post_id: int) -> List[Dict[str, Any]]:
        """AI 인사이트 히스토리 조회"""
        try:
            insights = db.query(AIInsights).filter(
                AIInsights.job_post_id == job_post_id
            ).order_by(AIInsights.created_at.desc()).all()
            
            return [insight.to_dict() for insight in insights]
            
        except Exception as e:
            return []
    
    @staticmethod
    def compare_job_posts(db: Session, job_post_id: int, compared_job_post_id: int) -> Dict[str, Any]:
        """채용공고 비교 분석"""
        try:
            # 두 공고의 AI 인사이트 조회
            current_insights = AIInsightsService.get_or_create_ai_insights(db, job_post_id)
            compared_insights = AIInsightsService.get_or_create_ai_insights(db, compared_job_post_id)
            
            if "error" in current_insights or "error" in compared_insights:
                return {
                    "error": "비교할 수 있는 AI 인사이트가 없습니다.",
                    "job_post_id": job_post_id,
                    "compared_job_post_id": compared_job_post_id
                }
            
            # 비교 분석 결과 생성
            comparison_result = {
                "job_post_id": job_post_id,
                "compared_job_post_id": compared_job_post_id,
                "comparison_date": datetime.now().isoformat(),
                "similarity_score": AIInsightsService._calculate_similarity(current_insights, compared_insights),
                "key_differences": AIInsightsService._find_key_differences(current_insights, compared_insights),
                "recommendations": AIInsightsService._generate_comparison_recommendations(current_insights, compared_insights)
            }
            
            # DB에 저장
            db_comparison = AIInsightsComparison(
                job_post_id=job_post_id,
                compared_job_post_id=compared_job_post_id,
                comparison_metrics=comparison_result,
                similarity_score=comparison_result["similarity_score"],
                key_differences=comparison_result["key_differences"],
                advanced_comparison=comparison_result
            )
            
            db.add(db_comparison)
            db.commit()
            db.refresh(db_comparison)
            
            return comparison_result
            
        except Exception as e:
            db.rollback()
            return {
                "error": f"비교 분석 실패: {str(e)}",
                "job_post_id": job_post_id,
                "compared_job_post_id": compared_job_post_id
            }
    
    @staticmethod
    def _calculate_similarity(insights1: Dict[str, Any], insights2: Dict[str, Any]) -> float:
        """두 인사이트 간 유사도 계산"""
        try:
            # 간단한 유사도 계산 (0-1 사이 값)
            score1 = insights1.get("score_analysis", {})
            score2 = insights2.get("score_analysis", {})
            
            if not score1 or not score2:
                return 0.5
            
            # 평균 점수 비교
            ai_diff = abs(score1.get("ai", {}).get("mean", 0) - score2.get("ai", {}).get("mean", 0)) / 100
            practical_diff = abs(score1.get("practical", {}).get("mean", 0) - score2.get("practical", {}).get("mean", 0)) / 100
            
            similarity = 1 - ((ai_diff + practical_diff) / 2)
            return max(0, min(1, similarity))
            
        except Exception:
            return 0.5
    
    @staticmethod
    def _find_key_differences(insights1: Dict[str, Any], insights2: Dict[str, Any]) -> List[Dict[str, Any]]:
        """주요 차이점 찾기"""
        differences = []
        
        try:
            score1 = insights1.get("score_analysis", {})
            score2 = insights2.get("score_analysis", {})
            
            # AI 면접 점수 차이
            ai1 = score1.get("ai", {}).get("mean", 0)
            ai2 = score2.get("ai", {}).get("mean", 0)
            if abs(ai1 - ai2) > 5:
                differences.append({
                    "type": "ai_score_difference",
                    "description": f"AI 면접 평균 점수 차이: {ai1:.1f}점 vs {ai2:.1f}점",
                    "difference": ai1 - ai2
                })
            
            # 실무진 면접 점수 차이
            practical1 = score1.get("practical", {}).get("mean", 0)
            practical2 = score2.get("practical", {}).get("mean", 0)
            if abs(practical1 - practical2) > 5:
                differences.append({
                    "type": "practical_score_difference",
                    "description": f"실무진 면접 평균 점수 차이: {practical1:.1f}점 vs {practical2:.1f}점",
                    "difference": practical1 - practical2
                })
            
        except Exception:
            pass
        
        return differences
    
    @staticmethod
    def _generate_comparison_recommendations(insights1: Dict[str, Any], insights2: Dict[str, Any]) -> List[Dict[str, Any]]:
        """비교 기반 추천사항 생성"""
        recommendations = []
        
        try:
            # 점수 차이에 따른 추천
            score1 = insights1.get("score_analysis", {})
            score2 = insights2.get("score_analysis", {})
            
            ai1 = score1.get("ai", {}).get("mean", 0)
            ai2 = score2.get("ai", {}).get("mean", 0)
            
            if ai1 > ai2 + 10:
                recommendations.append({
                    "type": "learning_opportunity",
                    "title": "AI 면접 우수 사례 학습",
                    "description": f"현재 공고의 AI 면접 평균 점수({ai1:.1f}점)가 비교 공고({ai2:.1f}점)보다 높습니다. 우수한 평가 기준을 다른 공고에도 적용해보세요.",
                    "priority": "medium"
                })
            elif ai2 > ai1 + 10:
                recommendations.append({
                    "type": "improvement_needed",
                    "title": "AI 면접 기준 개선 필요",
                    "description": f"비교 공고의 AI 면접 평균 점수({ai2:.1f}점)가 현재 공고({ai1:.1f}점)보다 높습니다. AI 면접 평가 기준을 검토해보세요.",
                    "priority": "high"
                })
            
        except Exception:
            pass
        
        return recommendations 