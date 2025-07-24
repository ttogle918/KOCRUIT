import logging
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional, Tuple
import os

logger = logging.getLogger(__name__)

class ChromaDBManager:
    """ChromaDB를 사용한 이력서 임베딩 관리 클래스"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """
        Args:
            persist_directory: ChromaDB 데이터 저장 디렉토리
        """
        self.persist_directory = persist_directory
        self.collection_name = "resumes"
        
        # ChromaDB 클라이언트 초기화
        try:
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(anonymized_telemetry=False)
            )
            logger.info(f"ChromaDB 클라이언트 초기화 완료: {persist_directory}")
        except Exception as e:
            logger.error(f"ChromaDB 클라이언트 초기화 실패: {e}")
            raise
        
        # 컬렉션 가져오기 또는 생성
        self._get_or_create_collection()
    
    def _get_or_create_collection(self):
        """이력서 컬렉션을 가져오거나 생성"""
        try:
            # 기존 컬렉션이 있는지 확인
            collections = self.client.list_collections()
            collection_exists = any(col.name == self.collection_name for col in collections)
            
            if collection_exists:
                self.collection = self.client.get_collection(name=self.collection_name)
                logger.info(f"기존 컬렉션 로드: {self.collection_name}")
            else:
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "Resume embeddings for plagiarism detection"}
                )
                logger.info(f"새 컬렉션 생성: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"컬렉션 초기화 실패: {e}")
            raise
    
    def add_resume_embedding(
        self, 
        resume_id: int, 
        content: str, 
        embedding: List[float], 
        metadata: Dict
    ) -> bool:
        """
        이력서 임베딩을 ChromaDB에 추가
        
        Args:
            resume_id: 이력서 ID
            content: 이력서 내용
            embedding: 임베딩 벡터
            metadata: 메타데이터 (user_id, title 등)
            
        Returns:
            성공 여부
        """
        try:
            # 기존 문서가 있으면 삭제 (업데이트)
            self._delete_resume_if_exists(resume_id)
            
            # 새 문서 추가
            self.collection.add(
                documents=[content],
                embeddings=[embedding],
                metadatas=[metadata],
                ids=[f"resume_{resume_id}"]
            )
            
            logger.info(f"이력서 임베딩 추가 완료: resume_{resume_id}")
            return True
            
        except Exception as e:
            logger.error(f"이력서 임베딩 추가 실패 (resume_{resume_id}): {e}")
            return False
    
    def _delete_resume_if_exists(self, resume_id: int):
        """기존 이력서 문서가 있으면 삭제"""
        try:
            existing = self.collection.get(ids=[f"resume_{resume_id}"])
            if existing['ids']:
                self.collection.delete(ids=[f"resume_{resume_id}"])
                logger.info(f"기존 이력서 삭제: resume_{resume_id}")
        except Exception as e:
            logger.warning(f"기존 이력서 삭제 중 오류 (resume_{resume_id}): {e}")
    
    def search_similar_resumes(
        self, 
        query_embedding: List[float], 
        top_k: int = 5,
        exclude_resume_id: Optional[int] = None
    ) -> List[Dict]:
        """
        유사한 이력서 검색
        
        Args:
            query_embedding: 쿼리 임베딩 벡터
            top_k: 반환할 상위 k개
            exclude_resume_id: 제외할 이력서 ID (자기 자신)
            
        Returns:
            유사한 이력서 리스트 (메타데이터와 유사도 포함)
        """
        try:
            # where 조건 설정 (자기 자신 제외)
            where_condition = None
            if exclude_resume_id:
                where_condition = {"resume_id": {"$ne": exclude_resume_id}}
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_condition,
                include=["metadatas", "distances"]
            )
            
            # 결과 포맷팅
            similar_resumes = []
            if results['ids'] and results['ids'][0]:
                for i, resume_id in enumerate(results['ids'][0]):
                    # 거리를 유사도로 변환 (1 - 거리)
                    distance = results['distances'][0][i]
                    similarity = 1 - distance
                    
                    similar_resumes.append({
                        "resume_id": results['metadatas'][0][i]['resume_id'],
                        "user_id": results['metadatas'][0][i]['user_id'],
                        "title": results['metadatas'][0][i]['title'],
                        "similarity": round(similarity, 4)
                    })
            
            logger.info(f"유사 이력서 검색 완료: {len(similar_resumes)}개 발견")
            return similar_resumes
            
        except Exception as e:
            logger.error(f"유사 이력서 검색 실패: {e}")
            return []
    
    def get_collection_stats(self) -> Dict:
        """컬렉션 통계 정보 반환"""
        try:
            count = self.collection.count()
            return {
                "collection_name": self.collection_name,
                "total_resumes": count,
                "persist_directory": self.persist_directory
            }
        except Exception as e:
            logger.error(f"컬렉션 통계 조회 실패: {e}")
            return {"error": str(e)}
    
    def delete_resume(self, resume_id: int) -> bool:
        """이력서 임베딩 삭제"""
        try:
            self.collection.delete(ids=[f"resume_{resume_id}"])
            logger.info(f"이력서 임베딩 삭제 완료: resume_{resume_id}")
            return True
        except Exception as e:
            logger.error(f"이력서 임베딩 삭제 실패 (resume_{resume_id}): {e}")
            return False
    
    def clear_collection(self) -> bool:
        """컬렉션 전체 삭제"""
        try:
            self.client.delete_collection(name=self.collection_name)
            self._get_or_create_collection()
            logger.info("컬렉션 전체 삭제 완료")
            return True
        except Exception as e:
            logger.error(f"컬렉션 전체 삭제 실패: {e}")
            return False 