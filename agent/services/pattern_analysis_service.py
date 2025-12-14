import logging
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from hdbscan import HDBSCAN
from typing import List, Dict, Any, Tuple
# from sentence_transformers import SentenceTransformer  # TextEmbedder 내부에서 사용 가정

# agent 내부의 TextEmbedder나 관련 유틸리티 사용
# 만약 agent에 아직 TextEmbedder가 없다면 유사한 기능을 구현하거나 가져와야 함.
# 여기서는 간단히 sentence-transformers를 직접 사용한다고 가정하거나, 
# 기존 backend/app/utils/embedding_utils.py 내용을 agent/utils/embedding_utils.py로 옮겨야 합니다.
# 사용자의 agent 환경에는 langchain이 있으므로 langchain의 embeddings를 사용하는 것이 더 좋을 수도 있습니다.

from langchain_openai import OpenAIEmbeddings
# 또는 HuggingFaceEmbeddings 사용
from langchain_community.embeddings import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

class PatternAnalysisService:
    """고성과자 패턴 분석 서비스 (Agent용)"""
    
    def __init__(self):
        # LangChain의 HuggingFaceEmbeddings 사용 (CPU 최적화)
        self.embedder = HuggingFaceEmbeddings(
            model_name="sentence-transformers/xlm-r-100langs-bert-base-nli-stsb-mean-tokens",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        self.scaler = StandardScaler()
    
    def create_career_text(self, data: Dict[str, Any]) -> str:
        """경력 텍스트 생성"""
        # 기존 backend의 create_career_text 로직 재구현
        parts = []
        if data.get('education_level'): parts.append(f"학력: {data['education_level']}")
        if data.get('major'): parts.append(f"전공: {data['major']}")
        if data.get('current_position'): parts.append(f"직무: {data['current_position']}")
        if data.get('career_path'): parts.append(f"경력사항: {data['career_path']}")
        if data.get('notable_projects'): parts.append(f"주요프로젝트: {data['notable_projects']}")
        if data.get('certifications'): parts.append(f"자격증: {data['certifications']}")
        return " ".join(parts)

    def analyze_patterns(self, high_performers_data: List[Dict[str, Any]], method: str = "kmeans", n_clusters: int = 3) -> Dict[str, Any]:
        try:
            if not high_performers_data:
                return {"error": "데이터가 없습니다."}

            # 1. 텍스트 임베딩
            career_texts = [self.create_career_text(d) for d in high_performers_data]
            embeddings = self.embedder.embed_documents(career_texts)
            embeddings_np = np.array(embeddings)

            # 2. 클러스터링
            if method == "kmeans":
                n_clusters = min(n_clusters, len(embeddings_np))
                if n_clusters < 1: n_clusters = 1
                kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                cluster_labels = kmeans.fit_predict(embeddings_np)
                cluster_centers = kmeans.cluster_centers_
                representative_embeddings = cluster_centers
            elif method == "hdbscan":
                hdbscan = HDBSCAN(min_cluster_size=2, min_samples=1)
                cluster_labels = hdbscan.fit_predict(embeddings_np)
                # 대표 벡터 계산 생략 또는 평균값 사용
                representative_embeddings = [] # 단순화
            else:
                raise ValueError(f"Unknown method: {method}")

            # 3. 패턴 추출 및 통계
            cluster_patterns = []
            unique_labels = np.unique(cluster_labels)
            
            for label in unique_labels:
                if label == -1: continue # Noise
                
                indices = np.where(cluster_labels == label)[0]
                members = [high_performers_data[i] for i in indices]
                
                # 통계 계산
                stats = self._calculate_statistics(members)
                
                # 대표 텍스트 (단순화: 첫번째 멤버)
                # 정밀하게 하려면 중심점과의 거리를 계산해야 함
                rep_text = career_texts[indices[0]] 
                
                cluster_patterns.append({
                    "cluster_id": int(label),
                    "member_count": len(members),
                    "members": members,
                    "representative_career_text": rep_text,
                    "statistics": stats
                })

            return {
                "cluster_patterns": cluster_patterns,
                "total_analyzed": len(high_performers_data)
            }

        except Exception as e:
            logger.error(f"Pattern analysis failed: {e}")
            raise

    def _calculate_statistics(self, members: List[Dict[str, Any]]) -> Dict[str, Any]:
        stats = {}
        # 수치형 필드 평균 등 계산
        for field in ['total_experience_years', 'promotion_speed_years', 'kpi_score']:
            vals = [float(m[field]) for m in members if m.get(field) is not None]
            if vals:
                stats[f'{field}_mean'] = float(np.mean(vals))
                stats[f'{field}_min'] = float(np.min(vals))
                stats[f'{field}_max'] = float(np.max(vals))
        
        # 학력 (간이 점수화)
        edu_map = {'BACHELOR': 2, 'MASTER': 3, 'PHD': 4}
        edu_vals = [edu_map.get(m.get('education_level'), 0) for m in members if m.get('education_level')]
        if edu_vals:
            stats['degree_mean'] = float(np.mean(edu_vals))
            
        # 자격증 수
        import json
        cert_counts = []
        for m in members:
            certs = m.get('certifications')
            if certs:
                try:
                    # 문자열이면 파싱, 리스트면 길이
                    if isinstance(certs, str):
                        try:
                            c_list = json.loads(certs)
                            cert_counts.append(len(c_list))
                        except:
                            cert_counts.append(1) # 파싱 실패 시 1개로 간주 혹은 무시
                    elif isinstance(certs, list):
                        cert_counts.append(len(certs))
                except:
                    pass
        if cert_counts:
            stats['certifications_count_mean'] = float(np.mean(cert_counts))
            
        return stats

