import logging
from typing import Dict, Any, List, Optional
import numpy as np
import re
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../agent'))
from agent.agents.pattern_summary_node import PatternSummaryNode
from langchain_openai import ChatOpenAI
import json

logger = logging.getLogger(__name__)

# 학위 매핑: 고졸=1, 전문학사=1.5, 학사=2, 석사=3, 박사=4
DEGREE_MAP = {
    "고등학교": 1,
    "고졸": 1,
    "전문학사": 1.5,
    "학사": 2,
    "석사": 3,
    "박사": 4
}

def normalize_degree(degree: str) -> float:
    if not degree:
        return 0.0
    # 괄호 안 학위 추출
    m = re.search(r'\((.*?)\)', degree)
    if m:
        degree_str = m.group(1)
    else:
        degree_str = degree
    for k, v in DEGREE_MAP.items():
        if k in degree_str:
            return v
    return 0.0

class ApplicantGrowthScoringService:
    """지원자-고성과자 비교 및 성장 가능성 스코어링 서비스"""
    
    def __init__(self, high_performer_stats: Dict[str, Any], high_performer_members: Optional[List[Dict[str, Any]]] = None, weights: Optional[Dict[str, float]] = None):
        """
        Args:
            high_performer_stats: 고성과자 통계(평균 등)
            high_performer_members: 고성과자 raw 데이터 리스트
            weights: 각 항목별 가중치 (기본값: KPI=0.4, 승진속도=0.3, 학력=0.2, 자격증=0.1)
        """
        self.stats = high_performer_stats
        self.high_performer_members = high_performer_members
        self.weights = weights or {
            "kpi": 0.4,
            "promotion_speed": 0.3,
            "degree": 0.2,
            "certifications": 0.1
        }
    
    def normalize_applicant_specs(self, specs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        지원자 스펙(specs) 리스트를 정규화된 dict로 변환
        Returns: {degree, certifications_count, promotion_speed, kpi, experience_years}
        """
        degree = 0.0
        certifications_count = 0
        promotion_speed = None
        kpi = None
        experience_years = 0.0
        for spec in specs:
            stype = spec.get("spec_type")
            stitle = spec.get("spec_title")
            sdesc = spec.get("spec_description")
            if stype == "education" and stitle == "degree":
                degree = normalize_degree(str(sdesc) if sdesc is not None else "")
            elif stype == "certifications" and stitle == "name":
                certifications_count += 1
            elif stype == "promotion_speed" and stitle == "years":
                try:
                    promotion_speed = float(sdesc) if sdesc is not None else None
                except:
                    promotion_speed = None
            elif stype == "kpi" and stitle == "score":
                try:
                    kpi = float(sdesc) if sdesc is not None else None
                except:
                    kpi = None
            elif stype == "experience" and stitle == "years":
                try:
                    experience_years = float(sdesc) if sdesc is not None else 0.0
                except:
                    experience_years = 0.0
        return {
            "degree": degree,
            "certifications_count": certifications_count,
            "promotion_speed": promotion_speed,
            "kpi": kpi,
            "experience_years": experience_years,
        }
    
    def score_applicant(self, applicant_specs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        지원자 스펙과 고성과자 통계 비교, 성장 가능성 점수 산출
        Returns: {total_score, detail: {항목별 점수, raw 값, 평균 대비 % 등}, comparison_chart_data}
        """
        norm = self.normalize_applicant_specs(applicant_specs)
        detail = {}
        total_score = 0.0
        # KPI
        kpi_score = 0.0
        if self.stats.get("kpi_score_mean") and norm.get("kpi"):
            kpi_score = min(norm["kpi"] / self.stats["kpi_score_mean"], 1.0) * 100
        detail["kpi"] = {"score": kpi_score, "value": norm.get("kpi"), "mean": self.stats.get("kpi_score_mean")}
        # 승진속도(빠를수록 점수 높음)
        promotion_score = 0.0
        if self.stats.get("promotion_speed_years_mean") and norm.get("promotion_speed"):
            ratio = self.stats["promotion_speed_years_mean"] / norm["promotion_speed"] if norm["promotion_speed"] > 0 else 0
            promotion_score = min(ratio, 1.0) * 100
        detail["promotion_speed"] = {"score": promotion_score, "value": norm.get("promotion_speed"), "mean": self.stats.get("promotion_speed_years_mean")}
        # 학력
        degree_score = 0.0
        if norm.get("degree"):
            if norm["degree"] >= 4:
                degree_score = 100
            elif norm["degree"] >= 3:
                degree_score = 90
            elif norm["degree"] >= 2:
                degree_score = 80
            else:
                degree_score = 60
        detail["degree"] = {"score": degree_score, "value": norm.get("degree"), "mean": self.stats.get("degree_mean")}
        # 자격증
        cert_score = 0.0
        if self.stats.get("certifications_count_mean") and norm.get("certifications_count") is not None:
            cert_score = min(norm["certifications_count"] / self.stats["certifications_count_mean"], 1.0) * 100
        detail["certifications"] = {"score": cert_score, "value": norm.get("certifications_count"), "mean": self.stats.get("certifications_count_mean")}
        # 가중합
        total_score = (
            kpi_score * self.weights["kpi"] +
            promotion_score * self.weights["promotion_speed"] +
            degree_score * self.weights["degree"] +
            cert_score * self.weights["certifications"]
        )
        # 비교 그래프용 데이터 생성
        chart_labels = ["경력(년)", "학력", "자격증"]
        def safe_float(val):
            try:
                return float(val)
            except (TypeError, ValueError):
                return 0.0
        # 경력(년) 추출
        applicant_exp = safe_float(norm.get("experience_years"))
        applicant_values = [
            applicant_exp,
            safe_float(norm.get("degree")),
            safe_float(norm.get("certifications_count")),
        ]
        # 고성과자 평균값 추출
        high_exp = None
        if hasattr(self, 'high_performer_members'):
            members = self.high_performer_members
            exp_vals = [float(m.get('total_experience_years', 0)) for m in members if m.get('total_experience_years') is not None]
            if exp_vals:
                high_exp = sum(exp_vals) / len(exp_vals)
        if high_exp is None:
            high_exp = self.stats.get('total_experience_years_mean', 0.0)
        high_performer_values = [
            safe_float(high_exp),
            safe_float(self.stats.get("degree_mean")),
            safe_float(self.stats.get("certifications_count_mean")),
        ]
        comparison_chart_data = {
            "labels": chart_labels,
            "applicant": applicant_values,
            "high_performer": high_performer_values
        }
        # 주요 근거 생성 (LLM 기반)
        llm_reasons = []
        try:
            llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3)
            prompt = f"""
지원자와 고성과자 평균을 비교해 성장 가능성 점수를 산출했습니다.

[학력 점수 산정 기준]
- 학사(2) 이상이면 충분히 우수한 학력으로 간주(80점 이상)
- 석사(3) 90점, 박사(4) 100점
- 학사 이상이면 '학력이 낮다'고 평가하지 않는다

지원자 주요 스펙:
- 경력(년): {norm.get('experience_years')} (고성과자 평균: {self.stats.get('total_experience_years_mean', 0.0)})
- 학력: {norm.get('degree')} (고성과자 평균: {self.stats.get('degree_mean')})
- 자격증 개수: {norm.get('certifications_count')} (고성과자 평균: {self.stats.get('certifications_count_mean')})

항목별 점수:
- 경력: {detail.get('experience_years', {}).get('score', 0):.1f}
- 학력: {detail['degree']['score']:.1f}
- 자격증: {detail['certifications']['score']:.1f}

이 지원자가 왜 이런 성장 점수를 받았는지, 고성과자와 비교해 강점/약점/성장 포인트를 한글로 bullet(✅, ⚠️)로 3~5개 요약해줘.
단, 학사 이상이면 '학력이 낮다'고 하지 말고, 긍정적으로 평가해라.
각 bullet은 한 줄로 명확하게 써줘.
"""
            response = llm.invoke(prompt)
            logger.info(f"[LLM raw response] {response.content}")
            llm_reasons = [
                line.strip()
                for line in response.content.split('\n')
                if re.match(r'^[\s\-•]*[✅⚠️]', line)
            ]
            if not llm_reasons:
                logger.warning("[LLM fallback] LLM 응답이 비어 있음, rule-based로 대체")
                raise ValueError('LLM 응답이 비어 있음')
        except Exception as e:
            logger.warning(f"[LLM fallback] LLM 호출 실패: {e}, rule-based로 대체")
            reasons = []
            if norm.get("kpi") is not None and self.stats.get("kpi_score_mean"):
                if norm["kpi"] >= self.stats["kpi_score_mean"]:
                    reasons.append("✅ KPI 성장 잠재력 높음")
                else:
                    reasons.append("⚠️ KPI가 고성과자 평균보다 낮음")
            if norm.get("certifications_count", 0) > 0:
                reasons.append("✅ 자격증 보유")
            else:
                reasons.append("⚠️ 자격증 미보유")
            if norm.get("promotion_speed") and self.stats.get("promotion_speed_years_mean"):
                if norm["promotion_speed"] <= self.stats["promotion_speed_years_mean"]:
                    reasons.append("✅ 승진 속도 우수")
                else:
                    reasons.append("⚠️ 승진 속도는 다소 느린 편")
            if norm.get("degree") and self.stats.get("degree_mean"):
                if norm["degree"] >= self.stats["degree_mean"]:
                    reasons.append("✅ 학력 우수")
                else:
                    reasons.append("⚠️ 학력은 고성과자 평균보다 낮음")
            llm_reasons = reasons
        return {
            "total_score": round(total_score, 2),
            "detail": detail,
            "comparison_chart_data": comparison_chart_data,
            "reasons": llm_reasons
        } 