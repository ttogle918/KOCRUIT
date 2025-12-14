from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from pydantic import BaseModel
import json
import os
from langchain_openai import ChatOpenAI
from app.core.database import get_db
from app.models.v2.document.application import Application
from app.models.v2.document.resume import Resume
from app.models.v2.auth.user import User
from app.models.v2.recruitment.job import JobPost
from app.models.v2.statistics_analysis import StatisticsAnalysis
from app.schemas.statistics_analysis import StatisticsAnalysisCreate, StatisticsAnalysisResponse, StatisticsAnalysisListResponse
from app.services.v2.statistics_analysis_service import StatisticsAnalysisService

router = APIRouter()

class StatisticsAnalysisRequest(BaseModel):
    job_post_id: int
    chart_type: str  # 'trend', 'age', 'gender', 'education', 'province', 'certificate'
    chart_data: List[Dict[str, Any]]

# LLM 모델 초기화
def get_llm():
    """LLM 모델 인스턴스 반환"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=api_key
    )

def analyze_with_llm(chart_data: List[Dict[str, Any]], chart_type: str, job_post: JobPost) -> Dict[str, Any]:
    """LLM을 사용한 통계 데이터 분석"""
    llm = get_llm()
    if not llm:
        # LLM이 없으면 규칙 기반 분석으로 폴백
        return analyze_with_rules(chart_data, chart_type, job_post)
    
    chart_type_labels = {
        'trend': '지원 시기별 추이',
        'age': '연령대별 지원자',
        'gender': '성별 지원자',
        'education': '학력별 지원자',
        'province': '지역별 지원자',
        'certificate': '자격증 보유 현황'
    }
    
    # 회사명과 직무 설명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    job_description = job_post.job_details or job_post.qualifications or "직무 설명 없음"
    
    prompt = f"""
    다음은 채용공고의 {chart_type_labels.get(chart_type, chart_type)} 통계 데이터입니다.

    채용공고 정보:
    - 제목: {job_post.title}
    - 회사: {company_name}
    - 직무: {job_description[:200]}...

    통계 데이터:
    {json.dumps(chart_data, ensure_ascii=False, indent=2)}

    이 데이터를 분석하여 다음을 제공해주세요:

    1. **기본 분석 결과**: 핵심 통계 정보와 주요 특징
    2. **주요 인사이트**: 데이터에서 발견된 중요한 패턴과 의미 (3-5개)
    3. **권장사항**: 채용 전략 개선을 위한 구체적인 제안 (3-5개)

    응답 형식 (JSON):
    {{
        "analysis": "📊 **분석 제목**\\n\\n**전체 지원자 수**: X명\\n**주요 특징**: ...",
        "insights": [
            "💡 첫 번째 인사이트",
            "💡 두 번째 인사이트",
            "💡 세 번째 인사이트"
        ],
        "recommendations": [
            "✅ 첫 번째 권장사항",
            "✅ 두 번째 권장사항",
            "✅ 세 번째 권장사항"
        ]
    }}
    """
    
    try:
        response = llm.invoke(prompt)
        response_text = response.content.strip()
        
        # JSON 부분만 추출
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        
        result = json.loads(response_text)
        return {
            "analysis": result.get("analysis", ""),
            "insights": result.get("insights", []),
            "recommendations": result.get("recommendations", []),
            "is_llm_used": True
        }
        
    except Exception as e:
        print(f"LLM 분석 중 오류 발생: {e}")
        # LLM 실패 시 규칙 기반 분석으로 폴백
        return analyze_with_rules(chart_data, chart_type, job_post)

def analyze_with_rules(chart_data: List[Dict[str, Any]], chart_type: str, job_post: JobPost) -> Dict[str, Any]:
    """규칙 기반 분석 (LLM 폴백용)"""
    if chart_type == 'trend':
        return analyze_trend_data(chart_data, job_post)
    elif chart_type == 'age':
        return analyze_age_data(chart_data, job_post)
    elif chart_type == 'gender':
        return analyze_gender_data(chart_data, job_post)
    elif chart_type == 'education':
        return analyze_education_data(chart_data, job_post)
    elif chart_type == 'province':
        return analyze_province_data(chart_data, job_post)
    elif chart_type == 'certificate':
        return analyze_certificate_data(chart_data, job_post)
    else:
        return {
            "analysis": "지원하지 않는 차트 타입입니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }

def analyze_trend_data(chart_data: List[Dict[str, Any]], job_post: JobPost) -> Dict[str, Any]:
    """지원 시기별 추이 데이터 분석 (규칙 기반)"""
    if not chart_data:
        return {
            "analysis": "지원 데이터가 충분하지 않아 분석할 수 없습니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }
    
    # 최고점과 최저점 찾기
    max_point = max(chart_data, key=lambda x: x.get('count', 0))
    min_point = min(chart_data, key=lambda x: x.get('count', 0))
    total_applicants = sum(item.get('count', 0) for item in chart_data)
    
    # 추세 분석
    dates = [item.get('date', '') for item in chart_data]
    counts = [item.get('count', 0) for item in chart_data]
    
    # 피크 분석
    peak_date = max_point.get('date', '')
    peak_count = max_point.get('count', 0)
    
    # 평균 지원자 수
    avg_applicants = total_applicants / len(chart_data) if chart_data else 0
    
    # 회사명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    
    analysis = f"""
    📊 **지원 시기별 추이 분석** - {company_name}
    
    **전체 지원자 수**: {total_applicants}명
    **평균 일일 지원자 수**: {avg_applicants:.1f}명
    **최고 지원일**: {peak_date} ({peak_count}명)
    **최저 지원일**: {min_point.get('date', '')} ({min_point.get('count', 0)}명)
    """
    
    insights = []
    if peak_count > avg_applicants * 2:
        insights.append(f"📈 {peak_date}에 지원자가 급증했습니다. 이는 채용공고 게시나 홍보 활동의 효과일 수 있습니다.")
    
    if total_applicants < 10:
        insights.append("⚠️ 전체 지원자 수가 적습니다. 채용공고 홍보를 강화하는 것을 고려해보세요.")
    
    if len([c for c in counts if c > 0]) < len(counts) * 0.5:
        insights.append("📉 지원이 특정 날짜에 집중되어 있습니다. 지속적인 지원자 유입이 필요합니다.")
    
    recommendations = []
    if peak_count > avg_applicants * 1.5:
        recommendations.append("🎯 피크 시기에 맞춰 추가 채용공고나 홍보를 계획해보세요.")
    
    if total_applicants < 20:
        recommendations.append("📢 채용공고 노출을 높이기 위해 다양한 채널을 활용해보세요.")
    
    recommendations.append("📅 지원자 유입이 일정하도록 지속적인 홍보 활동을 진행하세요.")
    
    return {
        "analysis": analysis,
        "insights": insights,
        "recommendations": recommendations,
        "is_llm_used": False
    }

def analyze_age_data(chart_data: List[Dict[str, Any]], job_post: JobPost) -> Dict[str, Any]:
    """연령대별 지원자 데이터 분석 (규칙 기반)"""
    if not chart_data:
        return {
            "analysis": "연령대별 데이터가 충분하지 않아 분석할 수 없습니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }
    
    total_applicants = sum(item.get('count', 0) for item in chart_data)
    dominant_age = max(chart_data, key=lambda x: x.get('count', 0))
    
    # 회사명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    
    analysis = f"""
    👥 **연령대별 지원자 분석** - {company_name}
    
    **전체 지원자 수**: {total_applicants}명
    **주요 연령대**: {dominant_age.get('name', '')} ({dominant_age.get('count', 0)}명, {dominant_age.get('count', 0)/total_applicants*100:.1f}%)
    """
    
    insights = []
    if dominant_age.get('name', '') in ['20대', '30대']:
        insights.append("🎯 젊은 층의 관심이 높습니다. 이는 직무의 성장 가능성과 매력적인 근무 환경을 반영합니다.")
    elif dominant_age.get('name', '') in ['40대', '50대']:
        insights.append("💼 경험 있는 지원자들이 많습니다. 안정성과 전문성을 중시하는 직무임을 시사합니다.")
    
    age_distribution = [item.get('count', 0) for item in chart_data]
    if max(age_distribution) > sum(age_distribution) * 0.6:
        insights.append("⚠️ 특정 연령대에 지원이 집중되어 있습니다. 다양한 연령층의 관심을 끌 필요가 있습니다.")
    
    recommendations = []
    if dominant_age.get('name', '') in ['20대', '30대']:
        recommendations.append("🚀 젊은 층을 위한 성장 기회와 혜택을 강조해보세요.")
    elif dominant_age.get('name', '') in ['40대', '50대']:
        recommendations.append("🏢 경험과 전문성을 인정하는 회사 문화를 어필해보세요.")
    
    recommendations.append("📊 다양한 연령층의 관심을 끌기 위해 채용공고 내용을 다각도로 검토해보세요.")
    
    return {
        "analysis": analysis,
        "insights": insights,
        "recommendations": recommendations,
        "is_llm_used": False
    }

def analyze_gender_data(chart_data: List[Dict[str, Any]], job_post: JobPost) -> Dict[str, Any]:
    """성별 지원자 데이터 분석 (규칙 기반)"""
    if not chart_data:
        return {
            "analysis": "성별 데이터가 충분하지 않아 분석할 수 없습니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }
    
    total_applicants = sum(item.get('value', 0) for item in chart_data)
    male_count = next((item.get('value', 0) for item in chart_data if item.get('name') == '남성'), 0)
    female_count = next((item.get('value', 0) for item in chart_data if item.get('name') == '여성'), 0)
    
    male_ratio = male_count / total_applicants * 100 if total_applicants > 0 else 0
    female_ratio = female_count / total_applicants * 100 if total_applicants > 0 else 0
    
    # 회사명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    
    analysis = f"""
    👫 **성별 지원자 분석** - {company_name}
    
    **전체 지원자 수**: {total_applicants}명
    **남성**: {male_count}명 ({male_ratio:.1f}%)
    **여성**: {female_count}명 ({female_ratio:.1f}%)
    """
    
    insights = []
    if abs(male_ratio - female_ratio) > 30:
        dominant_gender = "남성" if male_ratio > female_ratio else "여성"
        insights.append(f"⚠️ {dominant_gender} 지원자가 압도적으로 많습니다. 이는 직무의 특성이나 업계의 일반적인 현상을 반영할 수 있습니다.")
    else:
        insights.append("✅ 성별 분포가 비교적 균형잡혀 있습니다. 이는 포용적이고 다양성을 중시하는 채용임을 시사합니다.")
    
    recommendations = []
    if abs(male_ratio - female_ratio) > 30:
        recommendations.append("🎯 소수 성별의 지원을 늘리기 위해 해당 그룹을 대상으로 한 홍보를 고려해보세요.")
        recommendations.append("📋 채용공고에서 포용적이고 다양성을 중시하는 메시지를 강조해보세요.")
    
    recommendations.append("📊 성별에 관계없이 모든 지원자에게 공정한 기회를 제공하는 채용 프로세스를 유지하세요.")
    
    return {
        "analysis": analysis,
        "insights": insights,
        "recommendations": recommendations,
        "is_llm_used": False
    }

def analyze_education_data(chart_data: List[Dict[str, Any]], job_post: JobPost) -> Dict[str, Any]:
    """학력별 지원자 데이터 분석 (규칙 기반)"""
    if not chart_data:
        return {
            "analysis": "학력별 데이터가 충분하지 않아 분석할 수 없습니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }
    
    total_applicants = sum(item.get('value', 0) for item in chart_data)
    dominant_education = max(chart_data, key=lambda x: x.get('value', 0))
    
    # 고학력자 비율 계산
    high_education = sum(item.get('value', 0) for item in chart_data 
                        if item.get('name') in ['석사', '박사'])
    high_education_ratio = high_education / total_applicants * 100 if total_applicants > 0 else 0
    
    # 회사명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    
    analysis = f"""
    🎓 **학력별 지원자 분석** - {company_name}
    
    **전체 지원자 수**: {total_applicants}명
    **주요 학력**: {dominant_education.get('name', '')} ({dominant_education.get('value', 0)}명, {dominant_education.get('value', 0)/total_applicants*100:.1f}%)
    **고학력자 비율**: {high_education_ratio:.1f}% (석사/박사)
    """
    
    insights = []
    if dominant_education.get('name') == '학사':
        insights.append("🎯 학사 학위 소지자가 가장 많습니다. 이는 해당 직무가 학사 수준의 지식을 요구함을 시사합니다.")
    elif dominant_education.get('name') in ['석사', '박사']:
        insights.append("🔬 고학력자들의 관심이 높습니다. 이는 연구나 전문성이 중요한 직무임을 반영합니다.")
    
    if high_education_ratio > 50:
        insights.append("📚 고학력자 비율이 높습니다. 이는 전문적이고 깊이 있는 지식을 요구하는 직무임을 시사합니다.")
    
    recommendations = []
    if dominant_education.get('name') == '학사':
        recommendations.append("🎓 학사 수준의 지원자들에게 적합한 성장 기회와 교육 프로그램을 강조해보세요.")
    elif dominant_education.get('name') in ['석사', '박사']:
        recommendations.append("🔬 고학력자들의 전문성을 활용할 수 있는 연구 환경과 프로젝트를 어필해보세요.")
    
    recommendations.append("📖 학력에 관계없이 실무 능력과 잠재력을 중시하는 평가 기준을 명시해보세요.")
    
    return {
        "analysis": analysis,
        "insights": insights,
        "recommendations": recommendations,
        "is_llm_used": False
    }

def analyze_province_data(chart_data: List[Dict[str, Any]], job_post: JobPost) -> Dict[str, Any]:
    """지역별 지원자 데이터 분석 (규칙 기반)"""
    if not chart_data:
        return {
            "analysis": "지역별 데이터가 충분하지 않아 분석할 수 없습니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }
    
    total_applicants = sum(item.get('value', 0) for item in chart_data)
    dominant_province = max(chart_data, key=lambda x: x.get('value', 0))
    
    # 수도권 vs 지방 분석
    capital_area = sum(item.get('value', 0) for item in chart_data 
                      if item.get('name') in ['서울특별시', '경기도', '인천광역시'])
    capital_ratio = capital_area / total_applicants * 100 if total_applicants > 0 else 0
    
    # 회사명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    
    analysis = f"""
    🗺️ **지역별 지원자 분석** - {company_name}
    
    **전체 지원자 수**: {total_applicants}명
    **주요 지역**: {dominant_province.get('name', '')} ({dominant_province.get('value', 0)}명, {dominant_province.get('value', 0)/total_applicants*100:.1f}%)
    **수도권 비율**: {capital_ratio:.1f}%
    """
    
    insights = []
    if capital_ratio > 70:
        insights.append("🏙️ 수도권 지원자가 압도적으로 많습니다. 이는 회사 위치나 업계 특성상 수도권 중심의 채용임을 시사합니다.")
    elif capital_ratio < 30:
        insights.append("🌍 지방 지원자 비율이 높습니다. 이는 원격근무나 지방 지사를 통한 채용임을 반영합니다.")
    
    if dominant_province.get('value', 0) > total_applicants * 0.5:
        insights.append("⚠️ 특정 지역에 지원이 집중되어 있습니다. 지역적 다양성을 높일 필요가 있습니다.")
    
    recommendations = []
    if capital_ratio > 70:
        recommendations.append("🚄 지방 지원자들을 위한 원격근무 옵션이나 이전 지원 프로그램을 고려해보세요.")
    elif capital_ratio < 30:
        recommendations.append("🏢 수도권 지원자들의 관심을 끌기 위해 회사의 성장성과 기회를 강조해보세요.")
    
    recommendations.append("🌐 다양한 지역의 인재를 유치하기 위해 지역별 맞춤 홍보 전략을 수립해보세요.")
    
    return {
        "analysis": analysis,
        "insights": insights,
        "recommendations": recommendations,
        "is_llm_used": False
    }

def analyze_certificate_data(chart_data: List[Dict[str, Any]], job_post: JobPost) -> Dict[str, Any]:
    """자격증 보유수별 지원자 데이터 분석 (규칙 기반)"""
    if not chart_data:
        return {
            "analysis": "자격증 데이터가 충분하지 않아 분석할 수 없습니다.",
            "insights": [],
            "recommendations": [],
            "is_llm_used": False
        }
    
    total_applicants = sum(item.get('count', 0) for item in chart_data)
    no_cert = next((item.get('count', 0) for item in chart_data if item.get('name') == '0개'), 0)
    with_cert = total_applicants - no_cert
    cert_ratio = with_cert / total_applicants * 100 if total_applicants > 0 else 0
    
    # 회사명 안전하게 추출
    company_name = job_post.company.name if job_post.company else "알 수 없는 회사"
    
    analysis = f"""
    📜 **자격증 보유 현황 분석** - {company_name}
    
    **전체 지원자 수**: {total_applicants}명
    **자격증 보유자**: {with_cert}명 ({cert_ratio:.1f}%)
    **자격증 미보유자**: {no_cert}명 ({100-cert_ratio:.1f}%)
    """
    
    insights = []
    if cert_ratio > 70:
        insights.append("🏆 자격증 보유자 비율이 높습니다. 이는 해당 직무가 전문 자격을 요구하거나 지원자들이 준비를 철저히 했음을 시사합니다.")
    elif cert_ratio < 30:
        insights.append("📚 자격증 보유자 비율이 낮습니다. 이는 실무 경험이나 포트폴리오를 중시하는 직무임을 반영합니다.")
    
    # 자격증 개수별 분포 분석
    cert_distribution = {item.get('name', ''): item.get('count', 0) for item in chart_data}
    if cert_distribution.get('3개 이상', 0) > total_applicants * 0.2:
        insights.append("🎯 다중 자격증 보유자가 많습니다. 이는 지원자들의 높은 전문성과 학습 의지를 반영합니다.")
    
    recommendations = []
    if cert_ratio > 70:
        recommendations.append("🎓 자격증 보유자들의 전문성을 인정하고 활용할 수 있는 직무 환경을 제공해보세요.")
    elif cert_ratio < 30:
        recommendations.append("💼 실무 능력과 경험을 중시하는 평가 기준을 명확히 제시해보세요.")
    
    recommendations.append("📋 자격증 유무에 관계없이 지원자의 잠재력과 적성에 집중한 평가를 진행하세요.")
    
    return {
        "analysis": analysis,
        "insights": insights,
        "recommendations": recommendations,
        "is_llm_used": False
    }

@router.post("/analyze", response_model=StatisticsAnalysisResponse)
async def analyze_statistics(request: StatisticsAnalysisRequest, db: Session = Depends(get_db)):
    """통계 데이터에 대한 AI 분석 제공 및 DB 저장"""
    try:
        # 채용공고 정보 조회 (company 관계 포함)
        job_post = db.query(JobPost).options(
            joinedload(JobPost.company)
        ).filter(JobPost.id == request.job_post_id).first()
        
        if not job_post:
            raise HTTPException(status_code=404, detail="Job post not found")
        
        # LLM 기반 분석 시도 (실패 시 규칙 기반으로 폴백)
        result = analyze_with_llm(request.chart_data, request.chart_type, job_post)
        
        # 분석 결과를 DB에 저장
        analysis_data = StatisticsAnalysisCreate(
            job_post_id=request.job_post_id,
            chart_type=request.chart_type,
            chart_data=request.chart_data,
            analysis=result["analysis"],
            insights=result["insights"],
            recommendations=result["recommendations"],
            is_llm_used=result["is_llm_used"]
        )
        
        db_analysis = StatisticsAnalysisService.create_analysis(db, analysis_data)
        
        return StatisticsAnalysisResponse(
            id=db_analysis.id,
            job_post_id=db_analysis.job_post_id,
            chart_type=db_analysis.chart_type,
            chart_data=db_analysis.chart_data,
            analysis=db_analysis.analysis,
            insights=db_analysis.insights,
            recommendations=db_analysis.recommendations,
            is_llm_used=db_analysis.is_llm_used,
            created_at=db_analysis.created_at,
            updated_at=db_analysis.updated_at
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/job/{job_post_id}/analysis/{chart_type}", response_model=StatisticsAnalysisResponse)
async def get_latest_analysis(job_post_id: int, chart_type: str, db: Session = Depends(get_db)):
    """특정 채용공고의 특정 차트 타입에 대한 최신 분석 결과 조회"""
    try:
        analysis = StatisticsAnalysisService.get_analysis_by_job_post_and_type(
            db, job_post_id, chart_type
        )
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return StatisticsAnalysisResponse(
            id=analysis.id,
            job_post_id=analysis.job_post_id,
            chart_type=analysis.chart_type,
            chart_data=analysis.chart_data,
            analysis=analysis.analysis,
            insights=analysis.insights,
            recommendations=analysis.recommendations,
            is_llm_used=analysis.is_llm_used,
            created_at=analysis.created_at,
            updated_at=analysis.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {str(e)}")

@router.get("/job/{job_post_id}/analyses", response_model=StatisticsAnalysisListResponse)
async def get_all_analyses(job_post_id: int, limit: int = 100, db: Session = Depends(get_db)):
    """특정 채용공고의 모든 분석 결과 조회"""
    try:
        analyses = StatisticsAnalysisService.get_analyses_by_job_post(db, job_post_id, limit)
        
        analysis_responses = []
        for analysis in analyses:
            analysis_responses.append(StatisticsAnalysisResponse(
                id=analysis.id,
                job_post_id=analysis.job_post_id,
                chart_type=analysis.chart_type,
                chart_data=analysis.chart_data,
                analysis=analysis.analysis,
                insights=analysis.insights,
                recommendations=analysis.recommendations,
                is_llm_used=analysis.is_llm_used,
                created_at=analysis.created_at,
                updated_at=analysis.updated_at
            ))
        
        return StatisticsAnalysisListResponse(
            analyses=analysis_responses,
            total_count=len(analysis_responses)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analyses: {str(e)}")

@router.get("/analysis/{analysis_id}", response_model=StatisticsAnalysisResponse)
async def get_analysis_by_id(analysis_id: int, db: Session = Depends(get_db)):
    """ID로 특정 분석 결과 조회"""
    try:
        analysis = StatisticsAnalysisService.get_analysis_by_id(db, analysis_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return StatisticsAnalysisResponse(
            id=analysis.id,
            job_post_id=analysis.job_post_id,
            chart_type=analysis.chart_type,
            chart_data=analysis.chart_data,
            analysis=analysis.analysis,
            insights=analysis.insights,
            recommendations=analysis.recommendations,
            is_llm_used=analysis.is_llm_used,
            created_at=analysis.created_at,
            updated_at=analysis.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {str(e)}")

@router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """분석 결과 삭제"""
    try:
        success = StatisticsAnalysisService.delete_analysis(db, analysis_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return {"message": "Analysis deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis: {str(e)}") 