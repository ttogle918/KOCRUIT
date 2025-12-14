import logging
import requests
import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.v2.analysis.high_performers import HighPerformer

logger = logging.getLogger(__name__)

class HighPerformerPatternService:
    """고성과자 패턴 분석 서비스 (API 호출 방식)"""
    
    def __init__(self):
        # Agent 서비스 URL (docker-compose service name)
        self.agent_url = "http://agent:8001"
    
    def get_high_performers_data(self, db: Session) -> List[Dict[str, Any]]:
        """DB에서 고성과자 데이터 조회"""
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
            return data
        except Exception as e:
            logger.error(f"고성과자 데이터 조회 실패: {e}")
            raise

    def analyze_high_performer_patterns(self, db: Session, clustering_method: str = "kmeans", n_clusters: int = 3, include_llm_summary: bool = True) -> Dict[str, Any]:
        """
        고성과자 패턴 분석 (Agent API 호출)
        """
        try:
            # 1. 데이터 조회
            high_performers_data = self.get_high_performers_data(db)
            if not high_performers_data:
                return {"error": "분석할 고성과자 데이터가 없습니다."}

            # 2. Agent API 호출
            payload = {
                "data": high_performers_data,
                "method": clustering_method,
                "n_clusters": n_clusters
            }
            
            logger.info(f"Agent에 패턴 분석 요청 전송: {len(high_performers_data)}건")
            response = requests.post(f"{self.agent_url}/analysis/high-performer-patterns", json=payload, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"Agent API 오류: {response.text}")
                raise Exception(f"Agent API Error: {response.status_code}")
                
            result = response.json()
            
            # 3. LLM 요약 (선택) - Agent가 이미 수행했을 수 있음.
            # 여기서는 Agent 결과 그대로 반환
            return result

        except Exception as e:
            logger.error(f"고성과자 패턴 분석 요청 실패: {e}")
            raise
