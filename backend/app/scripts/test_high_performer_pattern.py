#!/usr/bin/env python3
"""
고성과자 패턴 분석 서비스 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.services.high_performer_pattern_service import HighPerformerPatternService
from app.utils.embedding_utils import TextEmbedder, create_career_text

def test_embedding_utils():
    """임베딩 유틸리티 테스트"""
    print("=== 임베딩 유틸리티 테스트 ===")
    
    # TextEmbedder 초기화
    embedder = TextEmbedder()
    
    # 테스트 텍스트
    test_texts = [
        "학력: 석사 | 전공: 컴퓨터공학 | 자격증: 정보처리기사 | 총 경력: 5년 | 현재 직급: PL | KPI 점수: 92.5",
        "학력: 학사 | 전공: 전자공학 | 자격증: 임베디드기사 | 총 경력: 4년 | 현재 직급: PL | KPI 점수: 88.0",
        "학력: 석사 | 전공: 소프트웨어공학 | 자격증: 정보처리기사 | 총 경력: 3년 | 현재 직급: 개발자 | KPI 점수: 85.0"
    ]
    
    # 임베딩 테스트
    embeddings = embedder.embed_texts(test_texts)
    print(f"임베딩 완료: {embeddings.shape}")
    
    # 유사도 테스트
    similarity = embedder.calculate_similarity(test_texts[0], test_texts[1])
    print(f"텍스트 1과 2의 유사도: {similarity:.4f}")
    
    # 가장 유사한 텍스트 찾기
    most_similar = embedder.find_most_similar(test_texts[0], test_texts[1:], top_k=2)
    print(f"가장 유사한 텍스트: {most_similar[0][0][:50]}... (유사도: {most_similar[0][1]:.4f})")
    
    print("임베딩 유틸리티 테스트 완료\n")

def test_career_text_creation():
    """경력 텍스트 생성 테스트"""
    print("=== 경력 텍스트 생성 테스트 ===")
    
    # 테스트 데이터
    test_data = {
        'education_level': '석사',
        'major': '컴퓨터공학',
        'certifications': '정보처리기사, SQLD',
        'total_experience_years': 5.0,
        'career_path': 'SI 개발자 → PL → PM',
        'current_position': 'PM',
        'promotion_speed_years': 3.2,
        'kpi_score': 92.5,
        'notable_projects': '공공기관 SI 프로젝트 총괄, 스마트시티 데이터 관리 프로젝트'
    }
    
    career_text = create_career_text(test_data)
    print(f"생성된 경력 텍스트: {career_text}")
    print("경력 텍스트 생성 테스트 완료\n")

def test_pattern_analysis():
    """패턴 분석 서비스 테스트"""
    print("=== 패턴 분석 서비스 테스트 ===")
    
    # DB 세션 생성
    db = SessionLocal()
    
    try:
        # 서비스 초기화
        pattern_service = HighPerformerPatternService()
        
        # 고성과자 데이터 조회
        high_performers_data = pattern_service.get_high_performers_data(db)
        print(f"조회된 고성과자 수: {len(high_performers_data)}")
        
        if not high_performers_data:
            print("고성과자 데이터가 없습니다. 테스트를 종료합니다.")
            return
        
        # 첫 번째 고성과자 데이터 출력
        print(f"첫 번째 고성과자: {high_performers_data[0]}")
        
        # 경력 텍스트 생성 및 임베딩
        embeddings, career_texts = pattern_service.create_career_embeddings(high_performers_data)
        print(f"임베딩 완료: {embeddings.shape}")
        print(f"첫 번째 경력 텍스트: {career_texts[0][:100]}...")
        
        # 클러스터링 테스트 (KMeans)
        cluster_result = pattern_service.cluster_career_patterns(
            embeddings, method="kmeans", n_clusters=min(3, len(high_performers_data))
        )
        print(f"클러스터링 완료: {cluster_result['n_clusters']}개 그룹")
        
        # 클러스터 패턴 추출
        cluster_patterns = pattern_service.extract_cluster_patterns(
            cluster_result, career_texts, high_performers_data
        )
        
        # 결과 출력
        for i, pattern in enumerate(cluster_patterns):
            print(f"\n클러스터 {i+1}:")
            print(f"  멤버 수: {pattern['member_count']}")
            print(f"  대표 경력: {pattern['representative_career_text'][:80]}...")
            print(f"  통계: {pattern['statistics']}")
        
        print("\n패턴 분석 서비스 테스트 완료")
        
    except Exception as e:
        print(f"패턴 분석 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

def test_llm_pattern_summary():
    """LLM 패턴 요약 테스트"""
    print("=== LLM 패턴 요약 테스트 ===")
    
    # DB 세션 생성
    db = SessionLocal()
    
    try:
        # 서비스 초기화
        pattern_service = HighPerformerPatternService()
        
        # 전체 파이프라인 실행 (LLM 요약 포함)
        result = pattern_service.analyze_high_performer_patterns(
            db, 
            clustering_method="kmeans", 
            n_clusters=3, 
            include_llm_summary=True
        )
        
        if 'error' in result:
            print(f"분석 실패: {result['error']}")
            return
        
        print(f"분석 완료: {result['n_clusters']}개 클러스터")
        
        # LLM 요약 결과 출력
        if result.get('pattern_summary'):
            summary_result = result['pattern_summary']
            if summary_result['success']:
                print(f"\n=== LLM 패턴 요약 결과 ===")
                print(f"요약 길이: {summary_result['summary_length']}자")
                print(f"요약 내용:\n{summary_result['pattern_summary']}")
            else:
                print(f"LLM 요약 실패: {summary_result['error']}")
        else:
            print("LLM 요약 결과가 없습니다.")
        
        print("\nLLM 패턴 요약 테스트 완료")
        
    except Exception as e:
        print(f"LLM 패턴 요약 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

def test_mock_pattern_summary():
    """Mock 데이터로 LLM 패턴 요약 테스트"""
    print("=== Mock 데이터 LLM 패턴 요약 테스트 ===")
    
    try:
        # Mock 클러스터 패턴 데이터
        mock_cluster_patterns = [
            {
                'cluster_id': 0,
                'member_count': 2,
                'members': [
                    {
                        'name': '김성과',
                        'education_level': '석사',
                        'major': '컴퓨터공학',
                        'certifications': '정보처리기사, SQLD',
                        'total_experience_years': 5.0,
                        'career_path': 'SI 개발자 → PL → PM',
                        'current_position': 'PM',
                        'promotion_speed_years': 3.2,
                        'kpi_score': 92.5,
                        'notable_projects': '공공기관 SI 프로젝트 총괄'
                    },
                    {
                        'name': '이성과',
                        'education_level': '석사',
                        'major': '소프트웨어공학',
                        'certifications': '정보처리기사',
                        'total_experience_years': 4.5,
                        'career_path': '웹개발자 → PL',
                        'current_position': 'PL',
                        'promotion_speed_years': 3.8,
                        'kpi_score': 87.5,
                        'notable_projects': '전자정부 웹서비스 개선'
                    }
                ],
                'representative_career_text': '학력: 석사 | 전공: 컴퓨터공학 | 자격증: 정보처리기사 | 총 경력: 5년 | 현재 직급: PM | KPI 점수: 92.5',
                'statistics': {
                    'total_experience_years_mean': 4.75,
                    'total_experience_years_std': 0.35,
                    'total_experience_years_min': 4.5,
                    'total_experience_years_max': 5.0,
                    'promotion_speed_years_mean': 3.5,
                    'promotion_speed_years_std': 0.42,
                    'promotion_speed_years_min': 3.2,
                    'promotion_speed_years_max': 3.8,
                    'kpi_score_mean': 90.0,
                    'kpi_score_std': 3.54,
                    'kpi_score_min': 87.5,
                    'kpi_score_max': 92.5,
                    'education_level_distribution': {'석사': 2},
                    'current_position_distribution': {'PM': 1, 'PL': 1},
                    'major_distribution': {'컴퓨터공학': 1, '소프트웨어공학': 1}
                }
            }
        ]
        
        # 서비스 초기화
        pattern_service = HighPerformerPatternService()
        
        # LLM 패턴 요약 실행
        summary_result = pattern_service.generate_pattern_summary(mock_cluster_patterns)
        
        if summary_result['success']:
            print(f"LLM 요약 성공: {summary_result['summary_length']}자")
            print(f"요약 내용:\n{summary_result['pattern_summary']}")
        else:
            print(f"LLM 요약 실패: {summary_result['error']}")
        
        print("\nMock 데이터 LLM 패턴 요약 테스트 완료")
        
    except Exception as e:
        print(f"Mock 데이터 LLM 패턴 요약 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def main():
    """메인 테스트 함수"""
    print("고성과자 패턴 분석 서비스 테스트 시작\n")
    
    # 1. 임베딩 유틸리티 테스트
    test_embedding_utils()
    
    # 2. 경력 텍스트 생성 테스트
    test_career_text_creation()
    
    # 3. 패턴 분석 서비스 테스트
    test_pattern_analysis()
    
    # 4. Mock 데이터로 LLM 패턴 요약 테스트
    test_mock_pattern_summary()
    
    # 5. 실제 데이터로 LLM 패턴 요약 테스트 (DB 연결 필요)
    # test_llm_pattern_summary()
    
    print("\n모든 테스트 완료!")

if __name__ == "__main__":
    main() 