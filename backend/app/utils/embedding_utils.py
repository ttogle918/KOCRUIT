import logging
from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class TextEmbedder:
    """텍스트 임베딩을 위한 유틸리티 클래스"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Args:
            model_name: HuggingFace sentence-transformers 모델명
        """
        try:
            self.model = SentenceTransformer(model_name)
            logger.info(f"임베딩 모델 로드 완료: {model_name}")
        except Exception as e:
            logger.error(f"임베딩 모델 로드 실패: {e}")
            raise
    
    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        텍스트 리스트를 임베딩 벡터로 변환
        
        Args:
            texts: 임베딩할 텍스트 리스트
            
        Returns:
            임베딩 벡터 배열 (n_texts, embedding_dim)
        """
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            logger.info(f"{len(texts)}개 텍스트 임베딩 완료")
            return embeddings
        except Exception as e:
            logger.error(f"텍스트 임베딩 실패: {e}")
            raise
    
    def embed_single_text(self, text: str) -> np.ndarray:
        """
        단일 텍스트를 임베딩 벡터로 변환
        
        Args:
            text: 임베딩할 텍스트
            
        Returns:
            임베딩 벡터 (1, embedding_dim)
        """
        return self.embed_texts([text])
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        두 텍스트 간의 코사인 유사도 계산
        
        Args:
            text1: 첫 번째 텍스트
            text2: 두 번째 텍스트
            
        Returns:
            코사인 유사도 (0~1)
        """
        embeddings = self.embed_texts([text1, text2])
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity)
    
    def find_most_similar(self, query_text: str, candidate_texts: List[str], top_k: int = 5) -> List[tuple]:
        """
        쿼리 텍스트와 가장 유사한 후보 텍스트들을 찾음
        
        Args:
            query_text: 쿼리 텍스트
            candidate_texts: 후보 텍스트 리스트
            top_k: 반환할 상위 k개
            
        Returns:
            (텍스트, 유사도) 튜플 리스트, 유사도 내림차순
        """
        query_embedding = self.embed_single_text(query_text)
        candidate_embeddings = self.embed_texts(candidate_texts)
        
        similarities = cosine_similarity([query_embedding[0]], candidate_embeddings)[0]
        
        # 유사도와 인덱스를 튜플로 묶어서 정렬
        similarity_pairs = [(candidate_texts[i], similarities[i]) for i in range(len(candidate_texts))]
        similarity_pairs.sort(key=lambda x: x[1], reverse=True)
        
        return similarity_pairs[:top_k]

def create_career_text(high_performer_data: dict) -> str:
    """
    고성과자 데이터를 경력 텍스트로 변환
    
    Args:
        high_performer_data: 고성과자 데이터 딕셔너리
        
    Returns:
        경력 텍스트
    """
    career_parts = []
    
    # 학력 정보
    if high_performer_data.get('education_level'):
        career_parts.append(f"학력: {high_performer_data['education_level']}")
    
    if high_performer_data.get('major'):
        career_parts.append(f"전공: {high_performer_data['major']}")
    
    # 자격증 정보
    if high_performer_data.get('certifications'):
        career_parts.append(f"자격증: {high_performer_data['certifications']}")
    
    # 경력 정보
    if high_performer_data.get('total_experience_years'):
        career_parts.append(f"총 경력: {high_performer_data['total_experience_years']}년")
    
    if high_performer_data.get('career_path'):
        career_parts.append(f"경력 경로: {high_performer_data['career_path']}")
    
    if high_performer_data.get('current_position'):
        career_parts.append(f"현재 직급: {high_performer_data['current_position']}")
    
    if high_performer_data.get('promotion_speed_years'):
        career_parts.append(f"승진 속도: {high_performer_data['promotion_speed_years']}년")
    
    if high_performer_data.get('kpi_score'):
        career_parts.append(f"KPI 점수: {high_performer_data['kpi_score']}")
    
    if high_performer_data.get('notable_projects'):
        career_parts.append(f"주요 프로젝트: {high_performer_data['notable_projects']}")
    
    return " | ".join(career_parts) 