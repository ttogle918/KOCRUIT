from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services.v2.analysis.resume_plagiarism_service import ResumePlagiarismService

router = APIRouter()

# Pydantic 모델들
class PlagiarismCheckRequest(BaseModel):
    resume_content: str = Field(..., description="검사할 이력서 내용")
    resume_id: Optional[int] = Field(None, description="이력서 ID (자기 자신 제외용)")
    similarity_threshold: float = Field(0.9, description="표절 의심 임계값 (0.0-1.0)")

class PlagiarismCheckResponse(BaseModel):
    input_resume_id: Optional[int]
    most_similar_resume: Optional[dict]
    plagiarism_suspected: bool
    similarity_threshold: float
    all_similar_resumes: Optional[List[dict]] = None
    message: Optional[str] = None
    error: Optional[str] = None

class BatchEmbedRequest(BaseModel):
    resume_ids: Optional[List[int]] = Field(None, description="임베딩할 이력서 ID 리스트 (None이면 모든 이력서)")

class BatchEmbedResponse(BaseModel):
    success: int
    failed: int
    total: int
    error: Optional[str] = None

class CollectionStatsResponse(BaseModel):
    collection_name: str
    total_resumes: int
    persist_directory: str

# 서비스 인스턴스
plagiarism_service = ResumePlagiarismService()

@router.post("/check-plagiarism", response_model=PlagiarismCheckResponse)
async def check_plagiarism(
    request: PlagiarismCheckRequest,
    db: Session = Depends(get_db)
):
    """
    이력서 표절 검사
    
    - **resume_content**: 검사할 이력서 내용
    - **resume_id**: 이력서 ID (자기 자신 제외용)
    - **similarity_threshold**: 표절 의심 임계값 (기본값: 0.9)
    """
    try:
        result = plagiarism_service.detect_plagiarism(
            resume_content=request.resume_content,
            resume_id=request.resume_id,
            similarity_threshold=request.similarity_threshold
        )
        
        return PlagiarismCheckResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"표절 검사 중 오류가 발생했습니다: {str(e)}")

@router.post("/check-resume/{resume_id}", response_model=PlagiarismCheckResponse)
async def check_resume_plagiarism(
    resume_id: int,
    similarity_threshold: float = Query(0.9, description="표절 의심 임계값"),
    force: bool = Query(False, description="강제 재검사 여부"),
    db: Session = Depends(get_db)
):
    """
    데이터베이스의 특정 이력서에 대해 표절 검사
    - **resume_id**: 검사할 이력서 ID
    - **similarity_threshold**: 표절 의심 임계값 (기본값: 0.9)
    - **force**: 강제 재검사 여부 (기본값: False)
    """
    try:
        result = plagiarism_service.check_resume_plagiarism(
            db=db,
            resume_id=resume_id,
            similarity_threshold=similarity_threshold,
            force=force
        )
        return PlagiarismCheckResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 표절 검사 중 오류가 발생했습니다: {str(e)}")

@router.post("/embed-resume/{resume_id}")
async def embed_resume(
    resume_id: int,
    db: Session = Depends(get_db)
):
    """
    특정 이력서를 임베딩하고 ChromaDB에 저장
    
    - **resume_id**: 임베딩할 이력서 ID
    """
    try:
        success = plagiarism_service.embed_and_store_resume(db=db, resume_id=resume_id)
        
        if success:
            return {"message": f"이력서 {resume_id} 임베딩 완료", "success": True}
        else:
            raise HTTPException(status_code=400, detail=f"이력서 {resume_id} 임베딩 실패")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 임베딩 중 오류가 발생했습니다: {str(e)}")

@router.post("/batch-embed", response_model=BatchEmbedResponse)
async def batch_embed_resumes(
    request: BatchEmbedRequest,
    db: Session = Depends(get_db)
):
    """
    여러 이력서를 일괄 임베딩
    
    - **resume_ids**: 임베딩할 이력서 ID 리스트 (None이면 모든 이력서)
    """
    try:
        result = plagiarism_service.batch_embed_resumes(
            db=db,
            resume_ids=request.resume_ids
        )
        
        return BatchEmbedResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"일괄 임베딩 중 오류가 발생했습니다: {str(e)}")

@router.get("/collection-stats", response_model=CollectionStatsResponse)
async def get_collection_stats():
    """
    ChromaDB 컬렉션 통계 조회
    """
    try:
        stats = plagiarism_service.get_collection_stats()
        
        if "error" in stats:
            raise HTTPException(status_code=500, detail=stats["error"])
        
        return CollectionStatsResponse(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"컬렉션 통계 조회 중 오류가 발생했습니다: {str(e)}")

@router.delete("/delete-embedding/{resume_id}")
async def delete_resume_embedding(resume_id: int):
    """
    특정 이력서의 임베딩 삭제
    
    - **resume_id**: 삭제할 이력서 ID
    """
    try:
        success = plagiarism_service.delete_resume_embedding(resume_id=resume_id)
        
        if success:
            return {"message": f"이력서 {resume_id} 임베딩 삭제 완료", "success": True}
        else:
            raise HTTPException(status_code=400, detail=f"이력서 {resume_id} 임베딩 삭제 실패")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"임베딩 삭제 중 오류가 발생했습니다: {str(e)}")

@router.delete("/clear-all-embeddings")
async def clear_all_embeddings():
    """
    모든 이력서 임베딩 삭제
    """
    try:
        success = plagiarism_service.clear_all_embeddings()
        
        if success:
            return {"message": "모든 이력서 임베딩 삭제 완료", "success": True}
        else:
            raise HTTPException(status_code=400, detail="모든 이력서 임베딩 삭제 실패")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"임베딩 삭제 중 오류가 발생했습니다: {str(e)}")

@router.get("/health")
async def health_check():
    """
    서비스 상태 확인 (Agent 호출)
    """
    try:
        # Agent의 헬스체크 API 호출
        status = await plagiarism_service.get_health_status()
        return status
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        } 