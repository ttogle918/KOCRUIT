import logging
import openai
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class OpenAIEmbedder:
    """OpenAI text-embedding-3-small 모델을 사용한 임베딩 클래스"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: OpenAI API 키 (None이면 설정에서 가져옴)
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API 키가 필요합니다. 환경변수 OPENAI_API_KEY를 설정하거나 직접 전달하세요.")
        
        self.client = openai.OpenAI(api_key=self.api_key)
        self.model = "text-embedding-3-small"
        logger.info(f"OpenAI 임베딩 클라이언트 초기화 완료: {self.model}")
    
    def embed_text(self, text: str) -> List[float]:
        """
        단일 텍스트를 임베딩 벡터로 변환
        
        Args:
            text: 임베딩할 텍스트
            
        Returns:
            임베딩 벡터 (리스트)
        """
        try:
            if not text or not text.strip():
                logger.warning("빈 텍스트가 입력되었습니다.")
                return []
            
            response = self.client.embeddings.create(
                model=self.model,
                input=text.strip()
            )
            
            embedding = response.data[0].embedding
            logger.info(f"텍스트 임베딩 완료: {len(embedding)}차원 벡터")
            return embedding
            
        except Exception as e:
            logger.error(f"텍스트 임베딩 실패: {e}")
            raise
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        텍스트 리스트를 임베딩 벡터로 변환
        
        Args:
            texts: 임베딩할 텍스트 리스트
            
        Returns:
            임베딩 벡터 리스트
        """
        try:
            if not texts:
                logger.warning("빈 텍스트 리스트가 입력되었습니다.")
                return []
            
            # 빈 텍스트 필터링
            valid_texts = [text.strip() for text in texts if text and text.strip()]
            
            if not valid_texts:
                logger.warning("유효한 텍스트가 없습니다.")
                return []
            
            response = self.client.embeddings.create(
                model=self.model,
                input=valid_texts
            )
            
            embeddings = [data.embedding for data in response.data]
            logger.info(f"{len(embeddings)}개 텍스트 임베딩 완료")
            return embeddings
            
        except Exception as e:
            logger.error(f"텍스트 리스트 임베딩 실패: {e}")
            raise
    
    def get_embedding_dimension(self) -> int:
        """임베딩 벡터의 차원 반환"""
        try:
            # 테스트 텍스트로 차원 확인
            test_embedding = self.embed_text("test")
            return len(test_embedding)
        except Exception as e:
            logger.error(f"임베딩 차원 확인 실패: {e}")
            # text-embedding-3-small의 기본 차원
            return 1536
    
    def validate_api_key(self) -> bool:
        """API 키 유효성 검증"""
        try:
            # 간단한 임베딩 요청으로 API 키 검증
            self.embed_text("test")
            logger.info("OpenAI API 키 검증 성공")
            return True
        except Exception as e:
            logger.error(f"OpenAI API 키 검증 실패: {e}")
            return False 