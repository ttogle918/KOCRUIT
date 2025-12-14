import logging
from typing import Dict, Any
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

logger = logging.getLogger(__name__)

class ResumePlagiarismService:
    """이력서 표절 검사 서비스 (Agent 측 구현)"""
    
    def __init__(self, chroma_persist_dir: str = "./chroma_db"):
        self.chroma_persist_dir = chroma_persist_dir
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.vectorstore = Chroma(
            persist_directory=chroma_persist_dir,
            embedding_function=self.embeddings,
            collection_name="resume_plagiarism"
        )
        logger.info("이력서 표절 검사 서비스 초기화 완료")
    
    def add_resume(self, resume_id: int, content: str):
        """이력서 벡터 DB에 추가"""
        try:
            # 메타데이터 준비
            metadata = {"resume_id": resume_id, "source": "applicant"}
            
            # 텍스트가 너무 길면 분할 (간단히)
            texts = [content] 
            
            self.vectorstore.add_texts(texts=texts, metadatas=[metadata])
            return True
        except Exception as e:
            logger.error(f"이력서 추가 실패: {e}")
            return False

    def check_plagiarism(self, content: str, threshold: float = 0.8) -> Dict[str, Any]:
        """표절 검사 수행"""
        try:
            # 유사 문서 검색
            results = self.vectorstore.similarity_search_with_score(content, k=3)
            
            plagiarism_detected = False
            similar_resumes = []
            
            for doc, score in results:
                # ChromaDB score는 거리(distance) 기반일 수 있음 (낮을수록 유사)
                # 코사인 유사도(similarity)라면 높을수록 유사
                # 여기서는 라이브러리 버전에 따라 다르므로 일반적인 로직 적용
                
                similarity = 1.0 - score # 거리 -> 유사도 변환 가정
                if similarity >= threshold:
                    plagiarism_detected = True
                    similar_resumes.append({
                        "resume_id": doc.metadata.get("resume_id"),
                        "similarity": similarity,
                        "content_snippet": doc.page_content[:200] + "..."
                    })
            
            return {
                "plagiarism_detected": plagiarism_detected,
                "similar_resumes": similar_resumes
            }
        except Exception as e:
            logger.error(f"표절 검사 실패: {e}")
            return {"error": str(e)}

