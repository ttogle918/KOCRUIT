from typing import List, Dict, Any
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import chromadb
import os

class RAGSystem:
    def __init__(self, persist_directory: str = "./chroma_db"):
        """RAG 시스템 초기화"""
        self.persist_directory = persist_directory
        self.embeddings = OpenAIEmbeddings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # ChromaDB 클라이언트 초기화
        self.vectorstore = Chroma(
            persist_directory=persist_directory,
            embedding_function=self.embeddings
        )
    
    def add_documents(self, documents: List[str], metadata: List[Dict] = None):
        """문서들을 벡터 데이터베이스에 추가"""
        try:
            # 문서를 청크로 분할
            docs = []
            for i, doc_text in enumerate(documents):
                chunks = self.text_splitter.split_text(doc_text)
                for j, chunk in enumerate(chunks):
                    doc_metadata = metadata[i] if metadata and i < len(metadata) else {}
                    doc_metadata["chunk_id"] = j
                    docs.append(Document(page_content=chunk, metadata=doc_metadata))
            
            # 벡터 데이터베이스에 추가
            self.vectorstore.add_documents(docs)
            self.vectorstore.persist()
            print(f"Added {len(docs)} document chunks to vector database")
            
        except Exception as e:
            print(f"Error adding documents: {e}")
    
    def search_similar(self, query: str, k: int = 5) -> List[Document]:
        """쿼리와 유사한 문서 검색"""
        try:
            results = self.vectorstore.similarity_search(query, k=k)
            return results
        except Exception as e:
            print(f"Error searching documents: {e}")
            return []
    
    def search_with_score(self, query: str, k: int = 5) -> List[tuple]:
        """유사도 점수와 함께 검색"""
        try:
            results = self.vectorstore.similarity_search_with_score(query, k=k)
            return results
        except Exception as e:
            print(f"Error searching documents with score: {e}")
            return []
    
    def get_context_for_query(self, query: str, k: int = 3) -> str:
        """쿼리에 대한 컨텍스트 생성"""
        try:
            similar_docs = self.search_similar(query, k=k)
            if not similar_docs:
                return ""
            
            context_parts = []
            for doc in similar_docs:
                context_parts.append(doc.page_content)
            
            return "\n\n".join(context_parts)
        except Exception as e:
            print(f"Error getting context: {e}")
            return ""
    
    def clear_database(self):
        """벡터 데이터베이스 초기화"""
        try:
            import shutil
            if os.path.exists(self.persist_directory):
                shutil.rmtree(self.persist_directory)
            print("Vector database cleared")
        except Exception as e:
            print(f"Error clearing database: {e}")