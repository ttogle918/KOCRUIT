from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import time
import requests
from pydantic import BaseModel

from app.core.database import get_db
from app.models.v2.document.application import Application
from app.models.v2.recruitment.job import JobPost
from app.models.v2.auth.company import Company
from app.models.v2.analysis.highlight_result import HighlightResult
from app.models.v2.document.resume import Resume, Spec

# 공통 유틸리티 import 추가
from agent.utils.resume_utils import combine_resume_and_specs

# 임베딩 시스템 관련 코드 완전 제거

router = APIRouter()

class HighlightRequest(BaseModel):
    application_id: int
    jobpost_id: Optional[int] = None
    company_id: Optional[int] = None

@router.post("/highlight-resume-by-application")
async def highlight_resume_by_application(
    request: HighlightRequest,
    db: Session = Depends(get_db)
):
    """
    application_id를 기반으로 이력서 하이라이팅 분석을 수행하고 DB에 저장합니다.
    """
    start_time = time.time()
    
    try:
        print(f"🔍 하이라이팅 요청 시작: application_id={request.application_id}")
        
        # 지원서 정보 가져오기
        application = db.query(Application).filter(Application.id == request.application_id).first()
        if not application:
            print(f"❌ Application not found: {request.application_id}")
            raise HTTPException(status_code=404, detail="Application not found")
        
        print(f"✅ Application found: {application.id}")
        
        # 🚀 개선: Resume + Spec 통합 데이터 사용 (기존 content만 사용하던 방식 개선)
        if not application.resume:
            print(f"❌ Resume not found for application: {request.application_id}")
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Resume와 Spec 데이터 조회
        specs = db.query(Spec).filter(Spec.resume_id == application.resume.id).all()
        
        # 완전한 이력서 데이터 생성 (프로젝트, 교육, 자격증, 기술스택 등 포함)
        resume_content = combine_resume_and_specs(application.resume, specs)
        
        if not resume_content or len(resume_content.strip()) == 0:
            print(f"❌ Resume content is empty for application: {request.application_id}")
            raise HTTPException(status_code=404, detail="Resume content is empty")
        
        print(f"✅ Complete resume data found: {len(resume_content)} characters (Resume + Specs included)")
        
        # 새로운 형광펜 도구 사용
        from agent.tools.highlight_tool import highlight_resume_by_application_id
        
        print(f"🚀 형광펜 하이라이팅 도구 호출")
        
        # 형광펜 도구로 하이라이팅 수행
        result = highlight_resume_by_application_id(
            application_id=request.application_id,
            resume_content=resume_content,  # ← 완전한 이력서 데이터 사용
            jobpost_id=request.jobpost_id,
            company_id=request.company_id
        )
        analysis_duration = time.time() - start_time
        print(f"✅ 하이라이팅 분석 완료: {len(result.get('highlights', []))} highlights (소요시간: {analysis_duration:.2f}초)")
        
        # DB에 결과 저장
        try:
            # 기존 결과가 있으면 업데이트, 없으면 새로 생성
            existing_result = db.query(HighlightResult).filter(
                HighlightResult.application_id == request.application_id
            ).first()
            
            if existing_result:
                # 기존 결과 업데이트
                existing_result.yellow_highlights = result.get('yellow', [])
                existing_result.red_highlights = result.get('red', [])
                existing_result.orange_highlights = result.get('orange', [])
                existing_result.purple_highlights = result.get('purple', [])
                existing_result.blue_highlights = result.get('blue', [])
                existing_result.all_highlights = result.get('highlights', [])
                existing_result.analysis_duration = analysis_duration
                existing_result.updated_at = time.time()
                highlight_result = existing_result
                print(f"🔄 기존 하이라이팅 결과 업데이트: ID {existing_result.id}")
            else:
                # 새로운 결과 생성
                highlight_result = HighlightResult(
                    application_id=request.application_id,
                    jobpost_id=request.jobpost_id,
                    company_id=request.company_id,
                    yellow_highlights=result.get('yellow', []),
                    red_highlights=result.get('red', []),
                    orange_highlights=result.get('orange', []),
                    purple_highlights=result.get('purple', []),
                    blue_highlights=result.get('blue', []),
                    all_highlights=result.get('highlights', []),
                    analysis_duration=analysis_duration
                )
                db.add(highlight_result)
                print(f"💾 새로운 하이라이팅 결과 저장")
            
            db.commit()
            print(f"✅ 하이라이팅 결과 DB 저장 완료: ID {highlight_result.id}")
            
        except Exception as db_error:
            print(f"⚠️ DB 저장 실패 (분석 결과는 반환): {db_error}")
            db.rollback()
            # DB 저장 실패해도 분석 결과는 반환
        
        return result
        
    except requests.exceptions.Timeout as e:
        print(f"❌ AI Agent 서버 타임아웃: {str(e)}")
        raise HTTPException(status_code=408, detail="하이라이팅 분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")
    except requests.exceptions.RequestException as e:
        print(f"❌ AI Agent 서버 연결 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Agent 서버 오류: {str(e)}")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        import traceback
        print(f"📋 상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.get("/highlight-results/{application_id}")
async def get_highlight_results(
    application_id: int,
    db: Session = Depends(get_db)
):
    """
    저장된 하이라이팅 결과를 조회합니다.
    """
    try:
        print(f"🔍 하이라이팅 결과 조회: application_id={application_id}")
        
        # 지원서 정보 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            print(f"❌ Application not found: {application_id}")
            raise HTTPException(status_code=404, detail="Application not found")
        
        # 저장된 하이라이팅 결과 조회
        highlight_result = db.query(HighlightResult).filter(
            HighlightResult.application_id == application_id
        ).first()
        
        if not highlight_result:
            print(f"❌ Highlight result not found: {application_id}")
            raise HTTPException(status_code=404, detail="하이라이팅 결과를 찾을 수 없습니다. 먼저 분석을 실행해주세요.")
        
        # 결과 반환
        result = {
            "id": highlight_result.id,
            "application_id": highlight_result.application_id,
            "jobpost_id": highlight_result.jobpost_id,
            "company_id": highlight_result.company_id,
            "yellow": highlight_result.yellow_highlights or [],
            "red": highlight_result.red_highlights or [],
            "orange": highlight_result.orange_highlights or [],
            "purple": highlight_result.purple_highlights or [],
            "blue": highlight_result.blue_highlights or [],
            "highlights": highlight_result.all_highlights or [],
            "analysis_version": highlight_result.analysis_version,
            "analysis_duration": highlight_result.analysis_duration,
            "created_at": highlight_result.created_at.isoformat() if highlight_result.created_at else None,
            "updated_at": highlight_result.updated_at.isoformat() if highlight_result.updated_at else None
        }
        
        print(f"✅ 하이라이팅 결과 조회 완료: {len(result.get('highlights', []))} highlights")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 하이라이팅 결과 조회 오류: {str(e)}")
        import traceback
        print(f"📋 상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@router.delete("/highlight-results/{application_id}")
async def delete_highlight_results(
    application_id: int,
    db: Session = Depends(get_db)
):
    """
    저장된 하이라이팅 결과를 삭제합니다.
    """
    try:
        print(f"🗑️ 하이라이팅 결과 삭제: application_id={application_id}")
        
        # 저장된 하이라이팅 결과 조회
        highlight_result = db.query(HighlightResult).filter(
            HighlightResult.application_id == application_id
        ).first()
        
        if not highlight_result:
            print(f"❌ Highlight result not found: {application_id}")
            raise HTTPException(status_code=404, detail="삭제할 하이라이팅 결과를 찾을 수 없습니다.")
        
        # 삭제
        db.delete(highlight_result)
        db.commit()
        
        print(f"✅ 하이라이팅 결과 삭제 완료: ID {highlight_result.id}")
        return {"message": "하이라이팅 결과가 삭제되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 하이라이팅 결과 삭제 오류: {str(e)}")
        db.rollback()
        import traceback
        print(f"📋 상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


# 기본 하이라이트 API 엔드포인트들만 유지

