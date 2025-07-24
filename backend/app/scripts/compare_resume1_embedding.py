#!/usr/bin/env python3
import sys, os
import numpy as np
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.resume import Resume
from app.utils.chromadb_utils import ChromaDBManager
from app.utils.openai_embedding_utils import OpenAIEmbedder

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def main():
    db = SessionLocal()
    chroma = ChromaDBManager()
    embedder = OpenAIEmbedder()

    # 1. DB에서 content 추출
    resume = db.query(Resume).filter(Resume.id == 1).first()
    if not resume:
        print("resume_id=1 not found in DB")
        return
    content = resume.content
    print(f"DB content length: {len(content)}")

    # 2. ChromaDB에서 벡터 추출
    chroma_doc = chroma.collection.get(ids=["resume_1"], include=["embeddings"])
    chroma_emb = chroma_doc["embeddings"][0] if chroma_doc["embeddings"] else None
    if not chroma_emb:
        print("No embedding found in ChromaDB for resume_1")
        return
    print(f"ChromaDB embedding length: {len(chroma_emb)}")

    # 3. OpenAI로 새로 임베딩
    fresh_emb = embedder.embed_text(content)
    print(f"Fresh embedding length: {len(fresh_emb)}")

    # 4. 코사인 유사도 계산
    sim = cosine_similarity(chroma_emb, fresh_emb)
    print(f"Cosine similarity between ChromaDB and fresh OpenAI embedding: {sim:.6f}")

    db.close()

if __name__ == "__main__":
    main() 