from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from typing import Optional, Dict, Any, List
import json
import re
from agent.utils.llm_cache import redis_cache

# 데이터베이스 모델 import - 더 안전한 방식으로 수정
try:
    import sys
    import os
    # 다양한 경로 시도
    possible_paths = [
        '/app',
        '/app/backend',
        '/app/backend/app',
        os.path.join(os.getcwd(), 'backend'),
        os.path.join(os.getcwd(), 'backend', 'app'),
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ]
    
    for path in possible_paths:
        if path not in sys.path:
            sys.path.append(path)
    
    # 현재 작업 디렉토리 확인
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python path: {sys.path[:5]}...")  # 처음 5개만 표시
    
    from backend.app.models.resume import Resume
    from backend.app.models.application import Application
    from backend.app.models.user import User
    from backend.app.models.applicant_user import ApplicantUser
    from backend.app.models.job import JobPost
    from backend.app.models.spec import Spec
    from sqlalchemy.orm import Session, joinedload
    DATABASE_AVAILABLE = True
    print("✅ Database models imported successfully")
except ImportError as e:
    print(f"⚠️  Database models import failed: {e}")
    print(f"Current working directory: {os.getcwd()}")
    # 직접 app 모듈에서 import 시도
    try:
        from app.models.resume import Resume
        from app.models.application import Application
        from app.models.user import User
        from app.models.applicant_user import ApplicantUser
        from app.models.job import JobPost
        from app.models.spec import Spec
        from sqlalchemy.orm import Session, joinedload
        DATABASE_AVAILABLE = True
        print("✅ Database models imported successfully (via app module)")
    except ImportError as e2:
        print(f"⚠️  Alternative import also failed: {e2}")
        # Fallback classes for when database is not available
        Resume = None
        Application = None
        User = None
        ApplicantUser = None
        JobPost = None
        Spec = None
        Session = None
        joinedload = None
        DATABASE_AVAILABLE = False

# 공통 유틸리티 import
try:
    from agent.utils.resume_utils import combine_resume_and_specs
    RESUME_UTILS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Resume utils import failed: {e}")
    RESUME_UTILS_AVAILABLE = False
    # Fallback function
    def combine_resume_and_specs(resume, specs):
        return f"Resume content for resume_id: {resume.id if resume else 'unknown'}"

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini")

def get_job_applicants_data(job_post_id: int, db: Session, current_application_id: Optional[int] = None, limit: int = 10) -> List[Dict]:
    """해당 공고의 지원자 데이터를 가져오는 함수"""
    if not db or not DATABASE_AVAILABLE:
        print("⚠️  Database not available, returning mock data")
        return [
            {
                "application_id": 999,
                "name": "Mock 지원자 1",
                "education": "Mock 대학교",
                "major": "Mock 전공",
                "status": "서류 검토 중",
                "resume_text": "Mock resume content for comparison analysis",
                "summary": "Mock resume summary for testing purposes"
            }
        ]
    
    try:
        # 해당 공고의 지원자들을 가져오기 (현재 지원자 제외)
        query = (
            db.query(Application)
            .options(
                joinedload(Application.user),
                joinedload(Application.resume).joinedload(Resume.specs)
            )
            .filter(Application.job_post_id == job_post_id)
        )
        
        # 현재 지원자 제외
        if current_application_id:
            query = query.filter(Application.id != current_application_id)
        
        applications = query.limit(limit).all()
        
        applicants_data = []
        for app in applications:
            try:
                # ApplicantUser 확인
                is_applicant = db.query(ApplicantUser).filter(ApplicantUser.id == app.user_id).first()
                if not is_applicant or not app.user or not app.resume:
                    continue
                
                # 이력서 텍스트 생성
                resume_text = combine_resume_and_specs(app.resume, app.resume.specs)
                
                # 기본 정보 추출
                education = "정보 없음"
                major = "정보 없음"
                
                if app.resume.specs:
                    # 학력 정보 추출
                    edu_specs = [s for s in app.resume.specs if s.spec_type == "education" and s.spec_title == "institution"]
                    if edu_specs:
                        education = edu_specs[0].spec_description
                    
                    # 전공 정보 추출
                    degree_specs = [s for s in app.resume.specs if s.spec_type == "education" and s.spec_title == "degree"]
                    if degree_specs:
                        degree_raw = degree_specs[0].spec_description or ""
                        if degree_raw:
                            import re
                            m = re.match(r"(.+?)\((.+?)\)", degree_raw)
                            if m:
                                major = m.group(1).strip()
                            else:
                                major = degree_raw.strip()
                
                applicant_data = {
                    "application_id": app.id,
                    "name": app.user.name or f"지원자 {app.id}",
                    "education": education,
                    "major": major,
                    "status": app.status or "서류 검토 중",
                    "resume_text": resume_text,
                    "summary": resume_text[:300] + "..." if len(resume_text) > 300 else resume_text
                }
                applicants_data.append(applicant_data)
            except Exception as e:
                print(f"개별 지원자 처리 오류 (application_id: {app.id}): {str(e)}")
                continue
        
        return applicants_data
        
    except Exception as e:
        print(f"지원자 데이터 조회 오류: {str(e)}")
        return []

def normalize_competitiveness_grade(grade_text):
    """경쟁력 등급을 단일 값으로 정규화"""
    if not grade_text or grade_text == 'N/A':
        return 'N/A'
    
    # 문자열에서 첫 번째 유효한 등급만 추출
    import re
    
    # A+, A, A-, B+, B, B-, C+, C, C- 패턴 찾기
    grade_pattern = r'[ABC][+-]?'
    matches = re.findall(grade_pattern, str(grade_text))
    
    if matches:
        return matches[0]  # 첫 번째 등급만 반환
    
    return 'N/A'

# 해당 공고 내 지원자 비교 분석 프롬프트
applicant_comparison_prompt = PromptTemplate.from_template(
    """
    다음은 같은 공고에 지원한 지원자들의 정보입니다:
    
    **현재 분석 대상 지원자:**
    ---
    {current_applicant_text}
    ---
    
    **같은 공고의 다른 지원자들:**
    ---
    {other_applicants_text}
    ---
    
    **공고 정보:**
    ---
    {job_info}
    ---
    
    위 정보를 바탕으로 현재 지원자가 같은 공고의 다른 지원자들과 비교했을 때의 경쟁력을 정확하고 상세하게 분석해 주세요.
    
    **중요**: 
    1. 경쟁력 등급을 다음 기준으로 정확히 하나만 선택하세요:
       - "A+": 최상급 (상위 5% 이내, 매우 뛰어난 경쟁력)
       - "A": 상급 (상위 10% 이내, 뛰어난 경쟁력)
       - "B+": 중상급 (상위 20% 이내, 좋은 경쟁력)
       - "B": 중급 (상위 40% 이내, 평균적 경쟁력)
       - "C": 하급 (하위권, 경쟁력 부족)
    
    2. 각 지원자에 대해 다음 기준으로 위협도를 정확히 판단하세요:
       - "높음": 현재 지원자보다 명백히 우수한 경험/스킬을 가진 경우
       - "보통": 현재 지원자와 비슷한 수준이거나 일부 영역에서 우위가 있는 경우  
       - "낮음": 현재 지원자보다 명백히 부족한 경우
    
    다음 관점에서 구체적으로 분석해 주세요:
    
    1. 해당 공고 내에서의 순위 추정 (상위 몇 %/몇 등급)
    2. 다른 지원자들 대비 강점 (구체적으로 어떤 부분이 우수한지)
    3. 다른 지원자들 대비 약점 (어떤 부분이 부족한지)
    4. 차별화 포인트 (다른 지원자들과 구별되는 독특한 점)
    5. 경쟁 우위 전략 (어떻게 어필해야 하는지)
    6. 면접에서 강조할 점
    7. 채용 가능성 예측
    8. 각 지원자별 구체적인 위협도 분석
    
    JSON 형식으로 응답해 주세요:
    {{
        "competition_analysis": {{
            "estimated_ranking": "상위 10%",
            "rank_explanation": "순위 산정 근거",
            "total_applicants_analyzed": {total_applicants},
            "competitiveness_grade": "A+"
        }},
        "comparative_strengths": [
            "다른 지원자들보다 뛰어난 강점1",
            "다른 지원자들보다 뛰어난 강점2"
        ],
        "comparative_weaknesses": [
            "다른 지원자들 대비 부족한 점1", 
            "다른 지원자들 대비 부족한 점2"
        ],
        "differentiation_points": [
            "독특한 차별화 포인트1",
            "독특한 차별화 포인트2"
        ],
        "competitive_strategy": {{
            "appeal_points": ["어필할 점1", "어필할 점2"],
            "positioning": "어떤 포지션으로 어필할지",
            "unique_value": "다른 지원자들과 차별화되는 가치"
        }},
        "interview_focus": [
            "면접에서 강조할 포인트1",
            "면접에서 강조할 포인트2"
        ],
        "hiring_probability": {{
            "success_rate": "70%",
            "key_factors": ["성공 요인1", "성공 요인2"],
            "risk_factors": ["위험 요인1", "위험 요인2"]
        }},
        "other_applicants_summary": [
            {{
                "name": "지원자명",
                "strengths": ["강점1", "강점2"],
                "weaknesses": ["약점1", "약점2"],
                "education": "학력",
                "major": "전공",
                "competitive_threat": "높음/보통/낮음",
                "threat_reason": "위협도 판단 근거"
            }}
        ]
    }}
    """
)

# 기존 시장 경쟁력 비교 프롬프트 (호환성 유지)
market_competitiveness_prompt = PromptTemplate.from_template(
    """
    다음은 지원자의 이력서 정보입니다:
    ---
    {resume_text}
    ---
    
    직무 정보:
    ---
    {job_info}
    ---
    
    비교 기준 정보 (있는 경우):
    ---
    {comparison_context}
    ---
    
    위 정보를 바탕으로 해당 직무에 지원하는 다른 지원자들과 비교했을 때의 경쟁력을 분석해 주세요.
    
    다음 관점에서 분석해 주세요:
    
    1. 시장 평균 대비 경쟁력 (해당 직무 분야에서의 일반적 수준)
    2. 강점 영역 (다른 지원자들보다 뛰어난 부분)
    3. 약점 영역 (개선이 필요한 부분)
    4. 차별화 요소 (독특하고 특별한 경쟁 우위)
    5. 시장 포지셔닝 (상위 몇 % 수준인지)
    6. 경쟁 우위 지속 가능성
    7. 보완 전략 제안
    
    JSON 형식으로 응답해 주세요:
    {{
        "market_competitiveness": {{
            "overall_ranking": "상위 10%/20%/30% 등",
            "market_position": "시장에서의 위치 설명",
            "competitiveness_score": 85,
            "benchmark_comparison": "시장 평균 대비 평가"
        }},
        "competitive_advantages": [
            "경쟁 우위1",
            "경쟁 우위2"
        ],
        "improvement_recommendations": [
            "개선 제안1",
            "개선 제안2"
        ]
    }}
    """
)

# LLM 체인 초기화
applicant_comparison_chain = LLMChain(llm=llm, prompt=applicant_comparison_prompt)
market_competitiveness_chain = LLMChain(llm=llm, prompt=market_competitiveness_prompt)

@redis_cache()
def generate_applicant_comparison_analysis(
    current_resume_text: str, 
    job_post_id: int,
    application_id: Optional[int] = None,
    job_info: str = "",
    db: Session = None,
    comparison_count: int = 5
):
    """해당 공고 내 지원자들 간 비교 분석 생성"""
    print(f"🔍 지원자 비교 분석 시작 - job_post_id: {job_post_id}, application_id: {application_id}")
    
    try:
        # 다른 지원자들 데이터 가져오기
        other_applicants = get_job_applicants_data(
            job_post_id=job_post_id,
            db=db,
            current_application_id=application_id,
            limit=comparison_count
        )
        
        print(f"📊 찾은 다른 지원자 수: {len(other_applicants)}")
        
        if not other_applicants:
            print("⚠️  다른 지원자가 없어 일반 시장 분석으로 대체")
            # 다른 지원자가 없으면 일반 시장 분석으로 대체
            return generate_competitiveness_comparison(current_resume_text, job_info, "해당 공고에 다른 지원자가 없어 일반 시장 기준으로 분석합니다.")
        
        # 다른 지원자들 정보를 텍스트로 구성
        other_applicants_text = "\n\n".join([
            f"지원자 {i+1}: {applicant['name']}\n"
            f"학력: {applicant['education']}\n"
            f"전공: {applicant['major']}\n"
            f"상태: {applicant['status']}\n"
            f"이력서 요약: {applicant['summary']}\n"
            for i, applicant in enumerate(other_applicants)
        ])
        
        print("🤖 AI 분석 시작...")
        result = applicant_comparison_chain.invoke({
            "current_applicant_text": current_resume_text,
            "other_applicants_text": other_applicants_text,
            "job_info": job_info or "직무 정보가 없습니다.",
            "total_applicants": len(other_applicants) + 1
        })
        
        # JSON 파싱
        text = result.get("text", "")
        print(f"🤖 AI 응답 길이: {len(text)} chars")
        print(f"🤖 AI 응답 미리보기: {text[:200]}...")
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                print("✅ JSON 파싱 성공")
                
                # 경쟁력 등급 정규화
                if "competition_analysis" in analysis_data and "competitiveness_grade" in analysis_data["competition_analysis"]:
                    original_grade = analysis_data["competition_analysis"]["competitiveness_grade"]
                    normalized_grade = normalize_competitiveness_grade(original_grade)
                    analysis_data["competition_analysis"]["competitiveness_grade"] = normalized_grade
                    print(f"등급 정규화: {original_grade} → {normalized_grade}")
                
                # 다른 지원자들의 간단한 정보 추가
                if "other_applicants_summary" not in analysis_data:
                    analysis_data["other_applicants_summary"] = [
                        {
                            "application_id": applicant['application_id'],
                            "name": applicant['name'],
                            "education": applicant['education'],
                            "major": applicant['major'],
                            "status": applicant['status'],
                            "strengths": ["분석 필요"],
                            "weaknesses": ["분석 필요"],
                            "competitive_threat": "분석 필요"
                        }
                        for applicant in other_applicants
                    ]
                
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"❌ JSON 파싱 오류: {je}")
                print(f"Raw response: {text}")
        
        else:
            print("❌ JSON 블록을 찾을 수 없음")
            print(f"Raw response: {text}")
        
        # 기본 응답 반환
        print("🔄 기본 응답 반환")
        return {
            "competition_analysis": {
                "estimated_ranking": "분석 중",
                "rank_explanation": "AI 분석을 진행 중입니다",
                "total_applicants_analyzed": len(other_applicants) + 1,
                "competitiveness_grade": "B"
            },
            "comparative_strengths": ["AI 분석 진행 중"],
            "comparative_weaknesses": ["AI 분석 진행 중"],
            "differentiation_points": ["AI 분석 진행 중"],
            "competitive_strategy": {
                "appeal_points": ["AI 분석 진행 중"],
                "positioning": "AI 분석 진행 중",
                "unique_value": "AI 분석 진행 중"
            },
            "interview_focus": ["AI 분석 진행 중"],
            "hiring_probability": {
                "success_rate": "분석 중",
                "key_factors": ["AI 분석 진행 중"],
                "risk_factors": ["AI 분석 진행 중"]
            },
            "other_applicants_summary": [
                {
                    "application_id": applicant['application_id'],
                    "name": applicant['name'],
                    "education": applicant['education'],
                    "major": applicant['major'],
                    "status": applicant['status'],
                    "strengths": ["분석 진행 중"],
                    "weaknesses": ["분석 진행 중"],
                    "competitive_threat": "보통"
                }
                for applicant in other_applicants
            ]
        }
        
    except Exception as e:
        print(f"❌ 지원자 비교 분석 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"지원자 비교 분석 중 오류가 발생했습니다: {str(e)}",
            "competition_analysis": {
                "estimated_ranking": "오류",
                "rank_explanation": f"분석 중 오류 발생: {str(e)}",
                "total_applicants_analyzed": 0,
                "competitiveness_grade": "N/A"
            },
            "comparative_strengths": [f"분석 오류: {str(e)}"],
            "comparative_weaknesses": ["분석을 완료할 수 없습니다"],
            "differentiation_points": ["분석을 완료할 수 없습니다"],
            "competitive_strategy": {
                "appeal_points": ["분석을 완료할 수 없습니다"],
                "positioning": "분석을 완료할 수 없습니다",
                "unique_value": "분석을 완료할 수 없습니다"
            },
            "interview_focus": ["분석을 완료할 수 없습니다"],
            "hiring_probability": {
                "success_rate": "N/A",
                "key_factors": ["분석을 완료할 수 없습니다"],
                "risk_factors": ["분석을 완료할 수 없습니다"]
            },
            "other_applicants_summary": []
        }

@redis_cache()
def generate_applicant_comparison_analysis_with_data(
    current_resume_text: str,
    other_applicants: List[Dict],
    job_info: str = "",
    job_post_id: int = None
):
    """API에서 전달받은 지원자 데이터를 사용한 비교 분석"""
    print(f"🔍 API 데이터 기반 지원자 비교 분석 시작 - job_post_id: {job_post_id}")
    print(f"📊 다른 지원자 수: {len(other_applicants)}")
    
    try:
        if not other_applicants:
            print("⚠️  다른 지원자가 없어 일반 시장 분석으로 대체")
            return generate_competitiveness_comparison(current_resume_text, job_info, "해당 공고에 다른 지원자가 없어 일반 시장 기준으로 분석합니다.")
        
        # 다른 지원자들 정보를 텍스트로 구성
        other_applicants_text = "\n\n".join([
            f"지원자 {i+1}: {applicant['name']}\n"
            f"학력: {applicant['education']}\n"
            f"전공: {applicant['major']}\n"
            f"상태: {applicant['status']}\n"
            f"이력서 요약: {applicant['summary']}\n"
            for i, applicant in enumerate(other_applicants)
        ])
        
        print("🤖 AI 분석 시작...")
        result = applicant_comparison_chain.invoke({
            "current_applicant_text": current_resume_text,
            "other_applicants_text": other_applicants_text,
            "job_info": job_info or "직무 정보가 없습니다.",
            "total_applicants": len(other_applicants) + 1
        })
        
        # JSON 파싱
        text = result.get("text", "")
        print(f"🤖 AI 응답 길이: {len(text)} chars")
        print(f"🤖 AI 응답 미리보기: {text[:200]}...")
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                print("✅ JSON 파싱 성공")
                
                # 경쟁력 등급 정규화
                if "competition_analysis" in analysis_data and "competitiveness_grade" in analysis_data["competition_analysis"]:
                    original_grade = analysis_data["competition_analysis"]["competitiveness_grade"]
                    normalized_grade = normalize_competitiveness_grade(original_grade)
                    analysis_data["competition_analysis"]["competitiveness_grade"] = normalized_grade
                    print(f"등급 정규화: {original_grade} → {normalized_grade}")
                
                # 다른 지원자들의 정보 추가
                if "other_applicants_summary" not in analysis_data:
                    analysis_data["other_applicants_summary"] = [
                        {
                            "application_id": applicant['application_id'],
                            "name": applicant['name'],
                            "education": applicant['education'],
                            "major": applicant['major'],
                            "status": applicant['status'],
                            "strengths": ["분석 필요"],
                            "weaknesses": ["분석 필요"],
                            "competitive_threat": "분석 필요"
                        }
                        for applicant in other_applicants
                    ]
                
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"❌ JSON 파싱 오류: {je}")
                print(f"Raw response: {text}")
        else:
            print("❌ JSON 블록을 찾을 수 없음")
            print(f"Raw response: {text}")
        
        # 기본 응답 반환
        print("🔄 기본 응답 반환")
        return {
            "competition_analysis": {
                "estimated_ranking": "분석 중",
                "rank_explanation": "AI 분석을 진행 중입니다",
                "total_applicants_analyzed": len(other_applicants) + 1,
                "competitiveness_grade": "B+"
            },
            "comparative_strengths": ["실제 지원자들과 비교 분석 중"],
            "comparative_weaknesses": ["실제 지원자들과 비교 분석 중"],
            "differentiation_points": ["실제 지원자들과 비교 분석 중"],
            "competitive_strategy": {
                "appeal_points": ["실제 지원자들과 비교 분석 중"],
                "positioning": "실제 지원자들과 비교 분석 중",
                "unique_value": "실제 지원자들과 비교 분석 중"
            },
            "interview_focus": ["실제 지원자들과 비교 분석 중"],
            "hiring_probability": {
                "success_rate": "분석 중",
                "key_factors": ["실제 지원자들과 비교 분석 중"],
                "risk_factors": ["실제 지원자들과 비교 분석 중"]
            },
            "other_applicants_summary": [
                {
                    "application_id": applicant['application_id'],
                    "name": applicant['name'],
                    "education": applicant['education'],
                    "major": applicant['major'],
                    "status": applicant['status'],
                    "strengths": ["실제 데이터 기반 분석 중"],
                    "weaknesses": ["실제 데이터 기반 분석 중"],
                    "competitive_threat": "보통"
                }
                for applicant in other_applicants
            ]
        }
        
    except Exception as e:
        print(f"❌ API 데이터 기반 지원자 비교 분석 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"지원자 비교 분석 중 오류가 발생했습니다: {str(e)}",
            "competition_analysis": {
                "estimated_ranking": "오류",
                "rank_explanation": f"분석 중 오류 발생: {str(e)}",
                "total_applicants_analyzed": len(other_applicants) if other_applicants else 0,
                "competitiveness_grade": "N/A"
            },
            "comparative_strengths": [f"분석 오류: {str(e)}"],
            "comparative_weaknesses": ["분석을 완료할 수 없습니다"],
            "differentiation_points": ["분석을 완료할 수 없습니다"],
            "competitive_strategy": {
                "appeal_points": ["분석을 완료할 수 없습니다"],
                "positioning": "분석을 완료할 수 없습니다",
                "unique_value": "분석을 완료할 수 없습니다"
            },
            "interview_focus": ["분석을 완료할 수 없습니다"],
            "hiring_probability": {
                "success_rate": "N/A",
                "key_factors": ["분석을 완료할 수 없습니다"],
                "risk_factors": ["분석을 완료할 수 없습니다"]
            },
            "other_applicants_summary": []
        }

@redis_cache()
def generate_competitiveness_comparison(resume_text: str, job_info: str = "", comparison_context: str = ""):
    """기존 시장 경쟁력 비교 분석 생성 (호환성 유지)"""
    try:
        result = market_competitiveness_chain.invoke({
            "resume_text": resume_text,
            "job_info": job_info or "직무 정보가 없습니다.",
            "comparison_context": comparison_context or "일반적인 시장 기준으로 분석합니다."
        })
        
        # JSON 파싱
        text = result.get("text", "")
        print(f"시장 경쟁력 비교 AI 응답: {text[:200]}...")
        
        # JSON 블록 찾기
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                return analysis_data
            except json.JSONDecodeError as je:
                print(f"시장 경쟁력 비교 JSON 파싱 오류: {je}")
        
        # 기본 응답 반환
        return {
            "market_competitiveness": {
                "overall_ranking": "분석 필요",
                "market_position": "분석 필요",
                "competitiveness_score": 50,
                "benchmark_comparison": "분석 필요"
            },
            "competitive_advantages": ["분석 필요"],
            "improvement_recommendations": ["분석 필요"]
        }
        
    except Exception as e:
        print(f"시장 경쟁력 비교 분석 오류: {str(e)}")
        return {
            "error": f"시장 경쟁력 비교 분석 중 오류가 발생했습니다: {str(e)}",
            "market_competitiveness": {},
            "competitive_advantages": [],
            "improvement_recommendations": []
        } 