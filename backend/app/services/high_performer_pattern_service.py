import logging
from typing import List, Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from hdbscan import HDBSCAN
from sqlalchemy.orm import Session

from app.models.high_performers import HighPerformer
from app.utils.embedding_utils import TextEmbedder, create_career_text

# LangGraph 패턴 요약 노드 import
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'agent'))
from agent.agents.pattern_summary_node import create_pattern_summary_node

logger = logging.getLogger(__name__)

class HighPerformerPatternService:
    """고성과자 패턴 분석 서비스"""
    
    def __init__(self):
        self.embedder = TextEmbedder()
        self.scaler = StandardScaler()
        # LLM 패턴 요약 노드 초기화
        self.pattern_summary_node = create_pattern_summary_node()
    
    def get_high_performers_data(self, db: Session) -> List[Dict[str, Any]]:
        """
        DB에서 고성과자 데이터 조회
        
        Args:
            db: 데이터베이스 세션
            
        Returns:
            고성과자 데이터 리스트
        """
        try:
            high_performers = db.query(HighPerformer).all()
            data = []
            for hp in high_performers:
                data.append({
                    'id': hp.id,
                    'name': hp.name,
                    'education_level': hp.education_level,
                    'major': hp.major,
                    'certifications': hp.certifications,
                    'total_experience_years': hp.total_experience_years,
                    'career_path': hp.career_path,
                    'current_position': hp.current_position,
                    'promotion_speed_years': hp.promotion_speed_years,
                    'kpi_score': hp.kpi_score,
                    'notable_projects': hp.notable_projects
                })
            logger.info(f"{len(data)}명의 고성과자 데이터 조회 완료")
            return data
        except Exception as e:
            logger.error(f"고성과자 데이터 조회 실패: {e}")
            raise
    
    def create_career_embeddings(self, high_performers_data: List[Dict[str, Any]]) -> Tuple[np.ndarray, List[str]]:
        """
        고성과자 경력 데이터를 임베딩으로 변환
        
        Args:
            high_performers_data: 고성과자 데이터 리스트
            
        Returns:
            (임베딩 벡터 배열, 경력 텍스트 리스트)
        """
        career_texts = []
        for data in high_performers_data:
            career_text = create_career_text(data)
            career_texts.append(career_text)
        
        embeddings = self.embedder.embed_texts(career_texts)
        logger.info(f"{len(career_texts)}개 경력 텍스트 임베딩 완료")
        
        return embeddings, career_texts
    
    def cluster_career_patterns(self, embeddings: np.ndarray, method: str = "kmeans", n_clusters: int = 3) -> Dict[str, Any]:
        """
        경력 임베딩을 클러스터링하여 패턴 그룹 추출
        
        Args:
            embeddings: 임베딩 벡터 배열
            method: 클러스터링 방법 ("kmeans" 또는 "hdbscan")
            n_clusters: KMeans 클러스터 수 (method가 "kmeans"일 때만 사용)
            
        Returns:
            클러스터링 결과 딕셔너리
        """
        try:
            if method == "kmeans":
                # KMeans 클러스터링
                kmeans = KMeans(n_clusters=min(n_clusters, len(embeddings)), random_state=42)
                cluster_labels = kmeans.fit_predict(embeddings)
                cluster_centers = kmeans.cluster_centers_
                
                # 각 클러스터의 대표 벡터 (중심점)
                representative_embeddings = cluster_centers
                
            elif method == "hdbscan":
                # HDBSCAN 클러스터링 (자동 클러스터 수 결정)
                hdbscan = HDBSCAN(min_cluster_size=2, min_samples=1)
                cluster_labels = hdbscan.fit_predict(embeddings)
                
                # 각 클러스터의 대표 벡터 (클러스터 내 평균)
                unique_labels = np.unique(cluster_labels)
                representative_embeddings = []
                for label in unique_labels:
                    if label != -1:  # 노이즈가 아닌 경우
                        cluster_mask = cluster_labels == label
                        cluster_center = np.mean(embeddings[cluster_mask], axis=0)
                        representative_embeddings.append(cluster_center)
                representative_embeddings = np.array(representative_embeddings)
            
            else:
                raise ValueError(f"지원하지 않는 클러스터링 방법: {method}")
            
            result = {
                'cluster_labels': cluster_labels,
                'representative_embeddings': representative_embeddings,
                'method': method,
                'n_clusters': len(np.unique(cluster_labels[cluster_labels != -1])) if method == "hdbscan" else n_clusters
            }
            
            logger.info(f"클러스터링 완료: {result['n_clusters']}개 그룹, 방법: {method}")
            return result
            
        except Exception as e:
            logger.error(f"클러스터링 실패: {e}")
            raise
    
    def extract_cluster_patterns(self, 
                               cluster_result: Dict[str, Any], 
                               career_texts: List[str],
                               high_performers_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        각 클러스터에서 대표 패턴 추출
        
        Args:
            cluster_result: 클러스터링 결과
            career_texts: 경력 텍스트 리스트
            high_performers_data: 고성과자 원본 데이터
            
        Returns:
            클러스터별 패턴 정보 리스트
        """
        cluster_labels = cluster_result['cluster_labels']
        unique_labels = np.unique(cluster_labels)
        
        cluster_patterns = []
        
        for label in unique_labels:
            if label == -1:  # HDBSCAN 노이즈 클러스터
                continue
                
            # 해당 클러스터에 속한 인덱스들
            cluster_indices = np.where(cluster_labels == label)[0]
            
            # 클러스터 내 고성과자들
            cluster_members = [high_performers_data[i] for i in cluster_indices]
            cluster_career_texts = [career_texts[i] for i in cluster_indices]
            
            # 클러스터 통계 계산
            stats = self._calculate_cluster_statistics(cluster_members)
            
            # 대표 경력 텍스트 (클러스터 중심과 가장 유사한 텍스트)
            representative_text = self._find_representative_text(
                cluster_result['representative_embeddings'][label] if label < len(cluster_result['representative_embeddings']) else None,
                cluster_career_texts
            )
            
            pattern_info = {
                'cluster_id': int(label),
                'member_count': len(cluster_members),
                'members': cluster_members,
                'representative_career_text': representative_text,
                'statistics': stats
            }
            
            cluster_patterns.append(pattern_info)
        
        logger.info(f"{len(cluster_patterns)}개 클러스터 패턴 추출 완료")
        return cluster_patterns
    
    def _calculate_cluster_statistics(self, cluster_members: List[Dict[str, Any]]) -> Dict[str, Any]:
        """클러스터 내 고성과자들의 통계 계산"""
        import json
        stats = {}
        # 수치형 데이터 통계
        numeric_fields = ['total_experience_years', 'promotion_speed_years', 'kpi_score']
        for field in numeric_fields:
            values = [member.get(field) for member in cluster_members if member.get(field) is not None]
            if values:
                stats[f'{field}_mean'] = float(np.mean(values))
                stats[f'{field}_std'] = float(np.std(values))
                stats[f'{field}_min'] = float(np.min(values))
                stats[f'{field}_max'] = float(np.max(values))
        # 학력 평균 (BACHELOR=2, MASTER=3, PHD=4)
        EDU_MAP = {'BACHELOR': 2, 'MASTER': 3, 'PHD': 4}
        edu_nums = [EDU_MAP.get(m.get('education_level'), 0) for m in cluster_members if m.get('education_level')]
        if edu_nums:
            stats['degree_mean'] = float(np.mean(edu_nums))
        # 자격증 개수 평균
        cert_counts = []
        for m in cluster_members:
            certs = m.get('certifications')
            if certs:
                try:
                    cert_list = json.loads(certs) if isinstance(certs, str) else certs
                    cert_counts.append(len(cert_list))
                except Exception:
                    pass
        if cert_counts:
            stats['certifications_count_mean'] = float(np.mean(cert_counts))
        # 범주형 데이터 빈도
        categorical_fields = ['education_level', 'current_position', 'major']
        for field in categorical_fields:
            values = [member.get(field) for member in cluster_members if member.get(field)]
            if values:
                value_counts = pd.Series(values).value_counts()
                stats[f'{field}_distribution'] = value_counts.to_dict()
        return stats
    
    def _find_representative_text(self, cluster_center: np.ndarray, career_texts: List[str]) -> str:
        """클러스터 중심과 가장 유사한 경력 텍스트 찾기"""
        if not career_texts or cluster_center is None:
            return career_texts[0] if career_texts else ""
        
        # 클러스터 중심을 텍스트로 변환할 수 없으므로, 가장 유사한 멤버 텍스트를 대표로 사용
        embeddings = self.embedder.embed_texts(career_texts)
        similarities = np.dot(embeddings, cluster_center) / (np.linalg.norm(embeddings, axis=1) * np.linalg.norm(cluster_center))
        
        most_similar_idx = np.argmax(similarities)
        return career_texts[most_similar_idx]
    
    def generate_pattern_summary(self, cluster_patterns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        LLM을 사용하여 클러스터 패턴 요약 생성
        
        Args:
            cluster_patterns: 클러스터별 패턴 정보 리스트
            
        Returns:
            패턴 요약 결과
        """
        try:
            # LangGraph 패턴 요약 워크플로우 실행
            result = self.pattern_summary_node.run_pattern_summary(cluster_patterns)
            
            if result['success']:
                logger.info("LLM 패턴 요약 완료")
                return {
                    'success': True,
                    'pattern_summary': result['pattern_summary'],
                    'summary_length': len(result['pattern_summary'])
                }
            else:
                logger.error(f"LLM 패턴 요약 실패: {result['error']}")
                return {
                    'success': False,
                    'pattern_summary': "",
                    'error': result['error']
                }
                
        except Exception as e:
            logger.error(f"패턴 요약 생성 실패: {e}")
            return {
                'success': False,
                'pattern_summary': "",
                'error': str(e)
            }
    
    def analyze_high_performer_patterns(self, db: Session, clustering_method: str = "kmeans", n_clusters: int = 3, include_llm_summary: bool = True) -> Dict[str, Any]:
        """
        고성과자 패턴 분석 전체 파이프라인 (LLM 요약 포함)
        
        Args:
            db: 데이터베이스 세션
            clustering_method: 클러스터링 방법
            n_clusters: 클러스터 수
            include_llm_summary: LLM 요약 포함 여부
            
        Returns:
            패턴 분석 결과 (LLM 요약 포함)
        """
        try:
            # 1. 고성과자 데이터 조회
            high_performers_data = self.get_high_performers_data(db)
            
            if not high_performers_data:
                logger.warning("분석할 고성과자 데이터가 없습니다.")
                return {"error": "분석할 고성과자 데이터가 없습니다."}
            
            # 2. 경력 텍스트 생성 및 임베딩
            embeddings, career_texts = self.create_career_embeddings(high_performers_data)
            
            # 3. 클러스터링
            cluster_result = self.cluster_career_patterns(embeddings, clustering_method, n_clusters)
            
            # 4. 클러스터별 패턴 추출
            cluster_patterns = self.extract_cluster_patterns(cluster_result, career_texts, high_performers_data)
            
            # 5. LLM 패턴 요약 (옵션)
            pattern_summary_result = None
            if include_llm_summary:
                pattern_summary_result = self.generate_pattern_summary(cluster_patterns)
            
            result = {
                'total_high_performers': len(high_performers_data),
                'clustering_method': clustering_method,
                'n_clusters': len(cluster_patterns),
                'cluster_patterns': cluster_patterns,
                'career_texts': career_texts,
                'embeddings_shape': embeddings.shape,
                'pattern_summary': pattern_summary_result
            }
            
            logger.info(f"고성과자 패턴 분석 완료: {len(cluster_patterns)}개 패턴 그룹, LLM 요약: {'포함' if include_llm_summary else '제외'}")
            return result
            
        except Exception as e:
            logger.error(f"고성과자 패턴 분석 실패: {e}")
            raise 