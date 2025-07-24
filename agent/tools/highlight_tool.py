from typing import Dict, Any, Optional
from agent.agents.highlight_workflow import process_highlight_workflow
from agent.utils.llm_cache import redis_cache
import time

@redis_cache()
def highlight_resume_content(
    resume_content: str,
    jobpost_id: Optional[int] = None,
    company_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    이력서 내용을 형광펜으로 하이라이팅하는 도구
    
    Args:
        resume_content: 이력서 내용
        jobpost_id: 채용공고 ID (선택사항)
        company_id: 회사 ID (선택사항)
        
    Returns:
        하이라이팅 결과 딕셔너리
    """
    try:
        print(f"🔍 형광펜 하이라이팅 시작: {len(resume_content)} 문자")
        start_time = time.time()
        
        # 워크플로우 실행
        result = process_highlight_workflow(
            resume_content=resume_content,
            jobpost_id=jobpost_id,
            company_id=company_id
        )
        
        processing_time = time.time() - start_time
        print(f"✅ 형광펜 하이라이팅 완료: {result.get('metadata', {}).get('total_highlights', 0)}개 하이라이트 (소요시간: {processing_time:.2f}초)")
        
        return result
        
    except Exception as e:
        print(f"❌ 형광펜 하이라이팅 오류: {str(e)}")
        return {
            "yellow": [],
            "red": [],
            "gray": [],
            "purple": [],
            "blue": [],
            "highlights": [],
            "metadata": {
                "total_highlights": 0,
                "quality_score": 0.0,
                "color_distribution": {},
                "issues": [f"하이라이팅 오류: {str(e)}"]
            }
        }

@redis_cache()
def highlight_resume_by_application_id(
    application_id: int,
    resume_content: str,
    jobpost_id: Optional[int] = None,
    company_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    application_id를 기반으로 이력서 하이라이팅 (기존 API 호환성)
    
    Args:
        application_id: 지원서 ID
        resume_content: 이력서 내용
        jobpost_id: 채용공고 ID (선택사항)
        company_id: 회사 ID (선택사항)
        
    Returns:
        하이라이팅 결과 딕셔너리
    """
    try:
        print(f"🔍 Application ID {application_id} 형광펜 하이라이팅 시작")
        
        # 기본 하이라이팅 수행
        result = highlight_resume_content(
            resume_content=resume_content,
            jobpost_id=jobpost_id,
            company_id=company_id
        )
        
        # application_id 정보 추가
        result["application_id"] = application_id
        result["jobpost_id"] = jobpost_id
        result["company_id"] = company_id
        
        return result
        
    except Exception as e:
        print(f"❌ Application ID {application_id} 하이라이팅 오류: {str(e)}")
        return {
            "application_id": application_id,
            "jobpost_id": jobpost_id,
            "company_id": company_id,
            "yellow": [],
            "red": [],
            "gray": [],
            "purple": [],
            "blue": [],
            "highlights": [],
            "metadata": {
                "total_highlights": 0,
                "quality_score": 0.0,
                "color_distribution": {},
                "issues": [f"하이라이팅 오류: {str(e)}"]
            }
        }

def get_highlight_statistics(highlights: Dict[str, Any]) -> Dict[str, Any]:
    """
    하이라이팅 결과의 통계 정보를 반환
    
    Args:
        highlights: 하이라이팅 결과
        
    Returns:
        통계 정보 딕셔너리
    """
    try:
        metadata = highlights.get("metadata", {})
        
        stats = {
            "total_highlights": metadata.get("total_highlights", 0),
            "quality_score": metadata.get("quality_score", 0.0),
            "color_distribution": metadata.get("color_distribution", {}),
            "issues": metadata.get("issues", []),
            "color_counts": {
                "yellow": len(highlights.get("yellow", [])),
                "red": len(highlights.get("red", [])),
                "gray": len(highlights.get("gray", [])),
                "purple": len(highlights.get("purple", [])),
                "blue": len(highlights.get("blue", []))
            }
        }
        
        return stats
        
    except Exception as e:
        print(f"❌ 하이라이팅 통계 계산 오류: {str(e)}")
        return {
            "total_highlights": 0,
            "quality_score": 0.0,
            "color_distribution": {},
            "issues": [f"통계 계산 오류: {str(e)}"],
            "color_counts": {
                "yellow": 0,
                "red": 0,
                "gray": 0,
                "purple": 0,
                "blue": 0
            }
        }

def validate_highlight_result(highlights: Dict[str, Any]) -> Dict[str, Any]:
    """
    하이라이팅 결과의 유효성을 검증
    
    Args:
        highlights: 하이라이팅 결과
        
    Returns:
        검증 결과 딕셔너리
    """
    try:
        validation_result = {
            "is_valid": True,
            "issues": [],
            "warnings": [],
            "suggestions": []
        }
        
        # 기본 검증
        if not highlights:
            validation_result["is_valid"] = False
            validation_result["issues"].append("하이라이팅 결과가 비어있습니다")
            return validation_result
        
        # 색상별 결과 확인
        color_keys = ["yellow", "red", "gray", "purple", "blue"]
        for color in color_keys:
            if color not in highlights:
                validation_result["warnings"].append(f"{color} 색상 결과가 없습니다")
        
        # 하이라이트 개수 확인
        total_highlights = len(highlights.get("highlights", []))
        if total_highlights == 0:
            validation_result["warnings"].append("하이라이트된 내용이 없습니다")
        elif total_highlights < 3:
            validation_result["suggestions"].append("하이라이트 개수가 적습니다. 더 많은 내용을 분석해보세요")
        elif total_highlights > 50:
            validation_result["warnings"].append("하이라이트 개수가 많습니다. 더 정확한 분석이 필요할 수 있습니다")
        
        # 품질 점수 확인
        quality_score = highlights.get("metadata", {}).get("quality_score", 0.0)
        if quality_score < 0.5:
            validation_result["warnings"].append("하이라이팅 품질이 낮습니다")
        elif quality_score < 0.7:
            validation_result["suggestions"].append("하이라이팅 품질을 개선할 수 있습니다")
        
        return validation_result
        
    except Exception as e:
        print(f"❌ 하이라이팅 검증 오류: {str(e)}")
        return {
            "is_valid": False,
            "issues": [f"검증 오류: {str(e)}"],
            "warnings": [],
            "suggestions": []
        } 