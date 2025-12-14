import logging
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
from app.models.v2.document.resume import Resume
from app.utils.openai_embedding_utils import OpenAIEmbedder
from app.utils.chromadb_utils import ChromaDBManager
from datetime import datetime
import json

logger = logging.getLogger(__name__)

def extract_all_content(resume_content):
    """
    resume.content가 JSON 배열이면 각 항목의 content만 이어붙여 반환.
    아니면 원본 문자열 반환.
    """
    try:
        data = json.loads(resume_content)
        if isinstance(data, list):
            return '\n'.join([item.get('content', '') for item in data if isinstance(item, dict)])
        else:
            return resume_content
    except Exception:
        return resume_content

class ResumePlagiarismService:
    """이력서 표절 검사 서비스"""
    
    def __init__(self, chroma_persist_dir: str = "./chroma_db"):
        """
        Args:
            chroma_persist_dir: ChromaDB 데이터 저장 디렉토리
        """
        self.embedder = OpenAIEmbedder()
        self.chroma_manager = ChromaDBManager(persist_directory=chroma_persist_dir)
        logger.info("이력서 표절 검사 서비스 초기화 완료")
    
    def embed_and_store_resume(self, db: Session, resume_id: int) -> bool:
        """
        이력서를 임베딩하고 ChromaDB에 저장
        
        Args:
            db: 데이터베이스 세션
            resume_id: 이력서 ID
            
        Returns:
            성공 여부
        """
        try:
            # 이력서 조회
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                logger.error(f"이력서를 찾을 수 없습니다: {resume_id}")
                return False
            
            # content에서 실제 내용만 추출 (JSON 파싱)
            pure_content = extract_all_content(resume.content)
            if not pure_content or not pure_content.strip():
                logger.warning(f"이력서 내용이 비어있습니다: {resume_id}")
                return False
            
            # 임베딩 생성
            embedding = self.embedder.embed_text(pure_content)
            if not embedding:
                logger.error(f"이력서 임베딩 생성 실패: {resume_id}")
                return False
            
            # 메타데이터 준비
            metadata = {
                "resume_id": resume.id,
                "user_id": resume.user_id,
                "title": resume.title or "제목 없음"
            }
            
            # ChromaDB에 저장
            success = self.chroma_manager.add_resume_embedding(
                resume_id=resume.id,
                content=pure_content,
                embedding=embedding,
                metadata=metadata
            )
            
            if success:
                logger.info(f"이력서 임베딩 저장 완료: {resume_id}")
            else:
                logger.error(f"이력서 임베딩 저장 실패: {resume_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"이력서 임베딩 및 저장 중 오류 (resume_{resume_id}): {e}")
            return False
    
    def batch_embed_resumes(self, db: Session, resume_ids: Optional[List[int]] = None) -> Dict:
        """
        여러 이력서를 일괄 임베딩
        
        Args:
            db: 데이터베이스 세션
            resume_ids: 이력서 ID 리스트 (None이면 모든 이력서)
            
        Returns:
            처리 결과 통계
        """
        try:
            # 이력서 조회
            query = db.query(Resume)
            if resume_ids:
                query = query.filter(Resume.id.in_(resume_ids))
            
            resumes = query.all()
            
            if not resumes:
                logger.warning("임베딩할 이력서가 없습니다.")
                return {"success": 0, "failed": 0, "total": 0}
            
            success_count = 0
            failed_count = 0
            
            for resume in resumes:
                if self.embed_and_store_resume(db, resume.id):
                    success_count += 1
                else:
                    failed_count += 1
            
            result = {
                "success": success_count,
                "failed": failed_count,
                "total": len(resumes)
            }
            
            logger.info(f"일괄 임베딩 완료: {result}")
            return result
            
        except Exception as e:
            logger.error(f"일괄 임베딩 중 오류: {e}")
            return {"success": 0, "failed": 0, "total": 0, "error": str(e)}
    
    def detect_plagiarism(self, resume_content: str, resume_id: Optional[int] = None, similarity_threshold: float = 0.9) -> Dict:
        """
        이력서 표절 검사
        
        Args:
            resume_content: 검사할 이력서 내용
            resume_id: 이력서 ID (자기 자신 제외용)
            similarity_threshold: 표절 의심 임계값
            
        Returns:
            표절 검사 결과
        """
        try:
            if not resume_content or not resume_content.strip():
                return {
                    "input_resume_id": resume_id,
                    "most_similar_resume": None,
                    "plagiarism_suspected": False,
                    "similarity_threshold": similarity_threshold,
                    "error": "이력서 내용이 비어있습니다."
                }
            
            # 임베딩 생성
            embedding = self.embedder.embed_text(resume_content)
            if not embedding:
                return {
                    "input_resume_id": resume_id,
                    "most_similar_resume": None,
                    "plagiarism_suspected": False,
                    "similarity_threshold": similarity_threshold,
                    "error": "임베딩 생성에 실패했습니다."
                }
            
            # 유사한 이력서 검색
            similar_resumes = self.chroma_manager.search_similar_resumes(
                query_embedding=embedding,
                top_k=5,
                exclude_resume_id=resume_id
            )
            
            if not similar_resumes:
                return {
                    "input_resume_id": resume_id,
                    "most_similar_resume": None,
                    "plagiarism_suspected": False,
                    "similarity_threshold": similarity_threshold,
                    "message": "유사한 이력서가 없습니다."
                }
            
            # 가장 유사한 이력서
            most_similar = similar_resumes[0]
            plagiarism_suspected = most_similar["similarity"] >= similarity_threshold
            
            result = {
                "input_resume_id": resume_id,
                "most_similar_resume": most_similar,
                "plagiarism_suspected": plagiarism_suspected,
                "similarity_threshold": similarity_threshold,
                "all_similar_resumes": similar_resumes[:3]  # 상위 3개만 반환
            }
            
            if plagiarism_suspected:
                logger.warning(f"표절 의심 이력서 발견: {resume_id} -> {most_similar['resume_id']} (유사도: {most_similar['similarity']})")
            
            return result
            
        except Exception as e:
            logger.error(f"표절 검사 중 오류: {e}")
            return {
                "input_resume_id": resume_id,
                "most_similar_resume": None,
                "plagiarism_suspected": False,
                "similarity_threshold": similarity_threshold,
                "error": str(e)
            }
    
    def _get_cached_plagiarism_result(self, db: Session, resume_id: int) -> Optional[Dict]:
        """DB에서 캐시된 표절 검사 결과 조회"""
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                return None
            
            # 표절 검사가 이미 수행되었는지 확인
            if resume.plagiarism_checked_at:
                # 캐시된 결과 반환
                similarity_score = resume.plagiarism_score or 0.0
                most_similar_id = resume.most_similar_resume_id
                threshold = resume.similarity_threshold or 0.9
                
                most_similar_resume = None
                if most_similar_id:
                    similar_resume = db.query(Resume).filter(Resume.id == most_similar_id).first()
                    if similar_resume:
                        most_similar_resume = {
                            "resume_id": similar_resume.id,
                            "user_id": similar_resume.user_id,
                            "title": similar_resume.title or "제목 없음",
                            "similarity": similarity_score
                        }
                
                logger.info(f"DB에서 캐시된 표절 검사 결과 사용: resume_id={resume_id}")
                return {
                    "input_resume_id": resume_id,
                    "most_similar_resume": most_similar_resume,
                    "plagiarism_suspected": similarity_score >= threshold,
                    "similarity_threshold": threshold,
                    "all_similar_resumes": [most_similar_resume] if most_similar_resume else [],
                    "message": "유사한 이력서가 없습니다." if not most_similar_resume else None,
                    "error": None,
                    "cached": True
                }
        except Exception as e:
            logger.warning(f"캐시된 표절 결과 조회 실패: {e}")
        
        return None
    
    def _save_plagiarism_result(self, db: Session, resume_id: int, result: Dict):
        """표절 검사 결과를 DB에 저장"""
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                return
            
            # 표절 검사 결과 저장
            most_similar = result.get("most_similar_resume")
            if most_similar:
                resume.plagiarism_score = most_similar.get("similarity", 0.0)
                resume.most_similar_resume_id = most_similar.get("resume_id")
            else:
                resume.plagiarism_score = 0.0
                resume.most_similar_resume_id = None
            
            resume.plagiarism_checked_at = datetime.utcnow()
            resume.similarity_threshold = result.get("similarity_threshold", 0.9)
            
            db.commit()
            logger.info(f"표절 검사 결과 DB 저장 완료: resume_id={resume_id}")
            
        except Exception as e:
            logger.error(f"표절 검사 결과 DB 저장 실패: {e}")
            db.rollback()
    
    def check_resume_plagiarism(self, db: Session, resume_id: int, similarity_threshold: float = 0.9, force: bool = False) -> Dict:
        """
        데이터베이스의 이력서에 대해 표절 검사 (DB 캐싱 지원, force=True면 항상 새로 검사)
        Args:
            db: 데이터베이스 세션
            resume_id: 검사할 이력서 ID
            similarity_threshold: 표절 의심 임계값
            force: 강제 재검사 여부
        Returns:
            표절 검사 결과
        """
        try:
            # 1. force가 아니면 DB에서 캐시된 결과 확인
            if not force:
                cached_result = self._get_cached_plagiarism_result(db, resume_id)
                if cached_result:
                    return cached_result
            
            # 2. 이력서 조회
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                return {
                    "input_resume_id": resume_id,
                    "most_similar_resume": None,
                    "plagiarism_suspected": False,
                    "similarity_threshold": similarity_threshold,
                    "error": "이력서를 찾을 수 없습니다."
                }
            
            # 3. force=True면 먼저 해당 이력서를 새로 임베딩하고 ChromaDB에 저장
            if force:
                logger.info(f"강제 재검사: 이력서 {resume_id} 새로 임베딩 및 저장")
                self.embed_and_store_resume(db, resume_id)
            
            # 4. 표절 검사 실행
            logger.info(f"새로운 표절 검사 실행: resume_id={resume_id}, force={force}")
            result = self.detect_plagiarism(
                resume_content=extract_all_content(resume.content),
                resume_id=resume_id,
                similarity_threshold=similarity_threshold
            )
            
            # 5. 결과를 DB에 저장 (plagiarism_score, plagiarism_checked_at, most_similar_resume_id, similarity_threshold)
            self._save_plagiarism_result(db, resume_id, result)
            
            return result
            
        except Exception as e:
            logger.error(f"이력서 표절 검사 중 오류 (resume_{resume_id}): {e}")
            return {
                "input_resume_id": resume_id,
                "most_similar_resume": None,
                "plagiarism_suspected": False,
                "similarity_threshold": similarity_threshold,
                "error": str(e)
            }
    
    def get_collection_stats(self) -> Dict:
        """ChromaDB 컬렉션 통계 반환"""
        return self.chroma_manager.get_collection_stats()
    
    def delete_resume_embedding(self, resume_id: int) -> bool:
        """이력서 임베딩 삭제"""
        return self.chroma_manager.delete_resume(resume_id)
    
    def clear_all_embeddings(self) -> bool:
        """모든 임베딩 삭제"""
        return self.chroma_manager.clear_collection() 