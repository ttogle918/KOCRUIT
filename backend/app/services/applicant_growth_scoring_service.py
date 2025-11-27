import logging
from typing import Dict, Any, List, Optional
import numpy as np
import re
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../agent'))
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
        Returns: {total_score, detail: {항목별 점수, raw 값, 평균 대비 % 등}, comparison_chart_data, detail_explanation}
        """
        norm = self.normalize_applicant_specs(applicant_specs)
        detail = {}
        detail_explanation = {}
        total_score = 0.0
        # KPI
        kpi_score = 0.0
        kpi_explanation = ""
        if self.stats.get("kpi_score_mean") and norm.get("kpi"):
            kpi_score = min(norm["kpi"] / self.stats["kpi_score_mean"], 1.0) * 100
            kpi_explanation = (
                f"지원자 KPI: {norm.get('kpi', 0)} / 고성과자 평균: {self.stats.get('kpi_score_mean', 0)}\n"
                f"→ KPI는 {'우수' if norm['kpi'] >= self.stats['kpi_score_mean'] else '평균 이하'} (가중치 {self.weights['kpi']*100:.0f}%)"
            )
        else:
            kpi_explanation = "KPI 정보 부족"
        detail["kpi"] = {"score": kpi_score, "value": norm.get("kpi"), "mean": self.stats.get("kpi_score_mean")}
        detail_explanation["kpi"] = kpi_explanation
        # 승진속도(빠를수록 점수 높음)
        promotion_score = 0.0
        promotion_explanation = ""
        if self.stats.get("promotion_speed_years_mean") and norm.get("promotion_speed"):
            ratio = self.stats["promotion_speed_years_mean"] / norm["promotion_speed"] if norm["promotion_speed"] > 0 else 0
            promotion_score = min(ratio, 1.0) * 100
            promotion_explanation = (
                f"지원자 승진속도: {norm.get('promotion_speed', 0)}년 / 고성과자 평균: {self.stats.get('promotion_speed_years_mean', 0)}년\n"
                f"→ {'빠름' if norm['promotion_speed'] <= self.stats['promotion_speed_years_mean'] else '느림'} (가중치 {self.weights['promotion_speed']*100:.0f}%)"
            )
        else:
            promotion_explanation = "승진속도 정보 부족"
        detail["promotion_speed"] = {"score": promotion_score, "value": norm.get("promotion_speed"), "mean": self.stats.get("promotion_speed_years_mean")}
        detail_explanation["promotion_speed"] = promotion_explanation
        # 학력
        degree_score = 0.0
        degree_explanation = ""
        if norm.get("degree"):
            if norm["degree"] >= 4:
                degree_score = 100
                degree_explanation = "박사 학위 보유 (최고점, 가중치 {:.0f}%)".format(self.weights['degree']*100)
            elif norm["degree"] >= 3:
                degree_score = 90
                degree_explanation = "석사 학위 보유 (우수, 가중치 {:.0f}%)".format(self.weights['degree']*100)
            elif norm["degree"] >= 2:
                degree_score = 80
                degree_explanation = "학사 학위 보유 (충분, 가중치 {:.0f}%)".format(self.weights['degree']*100)
            else:
                degree_score = 60
                degree_explanation = "학력은 고졸 이하 (가중치 {:.0f}%)".format(self.weights['degree']*100)
        else:
            degree_explanation = "학력 정보 부족"
        detail["degree"] = {"score": degree_score, "value": norm.get("degree"), "mean": self.stats.get("degree_mean")}
        detail_explanation["degree"] = degree_explanation
        # 자격증
        cert_score = 0.0
        cert_explanation = ""
        if self.stats.get("certifications_count_mean") and norm.get("certifications_count") is not None:
            cert_score = min(norm["certifications_count"] / self.stats["certifications_count_mean"], 1.0) * 100
            cert_explanation = (
                f"지원자 자격증 개수: {norm.get('certifications_count', 0)} / 고성과자 평균: {self.stats.get('certifications_count_mean', 0)}\n"
                f"→ {'많음' if norm['certifications_count'] >= self.stats['certifications_count_mean'] else '평균 이하'} (가중치 {self.weights['certifications']*100:.0f}%)"
            )
        else:
            cert_explanation = "자격증 정보 부족"
        detail["certifications"] = {"score": cert_score, "value": norm.get("certifications_count"), "mean": self.stats.get("certifications_count_mean")}
        detail_explanation["certifications"] = cert_explanation
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
        # 점수 만점 정의
        DEGREE_MAX = 10
        CERT_MAX = 10
        EXP_MAX = 40
        # 학력 점수 변환 (0~10)
        degree_score_10 = round((degree_score / 100) * DEGREE_MAX)
        # 자격증 점수 변환 (0~10)
        cert_score_10 = round((cert_score / 100) * CERT_MAX)
        # 경력 점수 변환 (0~40)
        # 경력 만점 기준: 고성과자 평균 경력
        exp = norm.get("experience_years", 0)
        high_exp = self.stats.get("total_experience_years_mean", None)
        if high_exp is not None and high_exp > 0:
            exp_score_40 = round(min(exp / high_exp, 1.0) * EXP_MAX)
            high_exp_label = f"{int(high_exp)}년"
        else:
            exp_score_40 = 0
            high_exp_label = "데이터 없음"
        # 총점 계산 (항목별 만점 합)
        total = degree_score_10 + cert_score_10 + exp_score_40
        # 표 데이터 생성
        item_table = []
        # 학력
        degree_label = None
        if norm.get("degree") == 4:
            degree_label = "박사"
        elif norm.get("degree") == 3:
            degree_label = "석사"
        elif norm.get("degree") == 2:
            degree_label = "학사"
        elif norm.get("degree") == 1:
            degree_label = "전문학사"
        else:
            degree_label = "고졸 이하"
        high_degree_label = None
        if self.stats.get("degree_mean"):
            if self.stats["degree_mean"] >= 4:
                high_degree_label = "박사"
            elif self.stats["degree_mean"] >= 3:
                high_degree_label = "석사"
            elif self.stats["degree_mean"] >= 2:
                high_degree_label = "학사"
            elif self.stats["degree_mean"] >= 1:
                high_degree_label = "전문학사"
            else:
                high_degree_label = "고졸 이하"
        else:
            high_degree_label = "-"
        item_table.append({
            "항목": "학력",
            "지원자": degree_label,
            "고성과자평균": high_degree_label,
            "항목점수": f"{degree_score_10}/{DEGREE_MAX}",
            "비중": f"{int(DEGREE_MAX)}점"
        })
        # 자격증
        cert_count = norm.get("certifications_count", 0)
        high_cert_count = self.stats.get("certifications_count_mean", 0)
        item_table.append({
            "항목": "자격증",
            "지원자": f"{cert_count}개",
            "고성과자평균": f"{int(high_cert_count)}개",
            "항목점수": f"{cert_score_10}/{CERT_MAX}",
            "비중": f"{int(CERT_MAX)}점"
        })
        # 경력(년)
        item_table.append({
            "항목": "경력",
            "지원자": f"{int(exp)}년",
            "고성과자평균": high_exp_label,
            "항목점수": f"{exp_score_40}/{EXP_MAX}",
            "비중": f"{int(EXP_MAX)}점"
        })
        # LLM 기반 점수 구조 설명 생성
        llm_narrative = None
        try:
            llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3)
            # 표 데이터를 텍스트 테이블로 변환
            table_str = "| 항목 | 지원자 | 고성과자평균 | 항목점수 | 비중 |\n|---|---|---|---|---|\n"
            for row in item_table:
                table_str += f"| {row['항목']} | {row['지원자']} | {row['고성과자평균']} | {row['항목점수']} | {row['비중']} |\n"
            prompt = f"""
아래는 지원자 성장 가능성 예측 점수 구조와 평가 근거입니다.

점수 구조 표:
{table_str}

총점: {total}점 (만점: {DEGREE_MAX+CERT_MAX+EXP_MAX}점)

이 표와 점수 구조를 바탕으로, 왜 이런 점수가 나왔는지, 어떤 항목이 중요한지, 개선 포인트는 무엇인지 아래 예시처럼 자연스럽고 논리적으로 설명해줘.

예시)
지원자의 학력(박사)과 자격증(2개)은 고성과자 평균과 동일하여 만점(각 10점)입니다.\n그러나 경력(0년)이 고성과자 평균(7년)에 한참 못 미쳐 해당 항목(비중 40점)에서 0점을 받았습니다.\n따라서, 총점은 30점으로 평가됩니다.\n경력 항목의 비중이 높으므로, 경력 보완이 성장 가능성 점수 개선의 핵심 포인트입니다.

위 예시처럼, 표와 점수 구조를 바탕으로 한글로 3~5문장으로 명확하게 설명해줘. 각 항목별로 점수/비중/강점/약점/개선포인트를 구체적으로 언급해줘.
"""
            response = llm.invoke(prompt)
            llm_narrative = response.content.strip()
            if not llm_narrative:
                raise ValueError('LLM narrative empty')
        except Exception as e:
            logger.warning(f"[LLM narrative fallback] LLM 호출 실패: {e}, rule-based로 대체")
            # 기존 rule-based narrative
            narrative = ""
            if degree_score_10 == DEGREE_MAX and cert_score_10 == CERT_MAX:
                narrative += f"지원자의 학력({degree_label})과 자격증({cert_count}개)은 고성과자 평균과 동일하여 만점(각 {DEGREE_MAX}점, {CERT_MAX}점)입니다.\n"
            if high_exp is None or high_exp == 0:
                narrative += "고성과자 경력 데이터가 부족하여 경력 항목 점수 산정이 어렵습니다.\n"
            elif exp_score_40 == 0:
                narrative += f"그러나 경력({int(exp)}년)이 고성과자 평균({high_exp_label})에 한참 못 미쳐 해당 항목({EXP_MAX}점)에서 0점을 받았습니다.\n"
            narrative += f"따라서, 총점은 {total}점({DEGREE_MAX+CERT_MAX+EXP_MAX}점 만점)으로 평가됩니다.\n"
            if EXP_MAX >= 30:
                narrative += "경력 항목의 비중이 높으므로, 경력 보완이 성장 가능성 점수 개선의 핵심 포인트입니다."
            llm_narrative = narrative
        return {
            "total_score": total,
            "detail": detail,
            "comparison_chart_data": comparison_chart_data,
            "reasons": llm_reasons,
            "detail_explanation": detail_explanation,
            "item_table": item_table,
            "narrative": llm_narrative
        } 