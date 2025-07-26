#!/usr/bin/env python3
"""
기존 이력서들을 일괄 임베딩하는 초기화 스크립트
"""

import sys
import os
import logging
from typing import List, Dict
from tqdm import tqdm

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.resume_plagiarism_service import ResumePlagiarismService
from app.models.resume import Resume

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_all_resume_ids(db: Session) -> List[int]:
    """모든 이력서 ID 조회"""
    try:
        resume_ids = [r.id for r in db.query(Resume.id).all()]
        logger.info(f"총 {len(resume_ids)}개의 이력서를 찾았습니다.")
        return resume_ids
    except Exception as e:
        logger.error(f"이력서 ID 조회 실패: {e}")
        return []

def get_resumes_with_content(db: Session) -> List[Resume]:
    """내용이 있는 이력서들 조회"""
    try:
        resumes = db.query(Resume).filter(
            Resume.content.isnot(None),
            Resume.content != ""
        ).all()
        
        logger.info(f"내용이 있는 이력서 {len(resumes)}개를 찾았습니다.")
        return resumes
    except Exception as e:
        logger.error(f"이력서 조회 실패: {e}")
        return []

def initialize_embeddings(batch_size: int = 10):
    """이력서 임베딩 초기화"""
    logger.info("🚀 이력서 임베딩 초기화 시작")
    
    try:
        db = SessionLocal()
        
        # 내용이 있는 이력서들 조회
        resumes = get_resumes_with_content(db)
        
        if not resumes:
            logger.warning("임베딩할 이력서가 없습니다.")
            return
        
        # 서비스 초기화
        service = ResumePlagiarismService()
        
        # 기존 통계 확인
        initial_stats = service.get_collection_stats()
        logger.info(f"초기 ChromaDB 통계: {initial_stats}")
        
        # 배치 처리
        total_resumes = len(resumes)
        success_count = 0
        failed_count = 0
        
        logger.info(f"총 {total_resumes}개 이력서를 {batch_size}개씩 배치로 처리합니다.")
        
        # 진행률 표시
        with tqdm(total=total_resumes, desc="이력서 임베딩") as pbar:
            for i in range(0, total_resumes, batch_size):
                batch = resumes[i:i + batch_size]
                batch_ids = [r.id for r in batch]
                
                try:
                    # 배치 임베딩
                    result = service.batch_embed_resumes(db, batch_ids)
                    
                    success_count += result.get("success", 0)
                    failed_count += result.get("failed", 0)
                    
                    # 진행률 업데이트
                    pbar.update(len(batch))
                    
                    # 배치 결과 로깅
                    if result.get("success", 0) > 0:
                        logger.info(f"배치 {i//batch_size + 1}: {result['success']}개 성공, {result['failed']}개 실패")
                    
                except Exception as e:
                    logger.error(f"배치 {i//batch_size + 1} 처리 중 오류: {e}")
                    failed_count += len(batch)
                    pbar.update(len(batch))
        
        # 최종 통계
        final_stats = service.get_collection_stats()
        
        logger.info(f"\n{'='*50}")
        logger.info("📊 임베딩 초기화 완료")
        logger.info(f"{'='*50}")
        logger.info(f"총 이력서: {total_resumes}개")
        logger.info(f"성공: {success_count}개")
        logger.info(f"실패: {failed_count}개")
        logger.info(f"성공률: {(success_count/total_resumes)*100:.1f}%")
        logger.info(f"최종 ChromaDB 통계: {final_stats}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"임베딩 초기화 중 오류: {e}")
        raise

def clear_all_embeddings():
    """모든 임베딩 삭제"""
    logger.info("🗑️ 모든 이력서 임베딩 삭제")
    
    try:
        service = ResumePlagiarismService()
        success = service.clear_all_embeddings()
        
        if success:
            logger.info("모든 임베딩 삭제 완료")
        else:
            logger.error("임베딩 삭제 실패")
            
    except Exception as e:
        logger.error(f"임베딩 삭제 중 오류: {e}")

def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description="이력서 임베딩 초기화 스크립트")
    parser.add_argument("--batch-size", type=int, default=10, help="배치 크기 (기본값: 10)")
    parser.add_argument("--clear", action="store_true", help="기존 임베딩 모두 삭제")
    parser.add_argument("--force", action="store_true", help="강제 실행 (확인 없이)")
    
    args = parser.parse_args()
    
    if args.clear:
        if not args.force:
            confirm = input("정말로 모든 임베딩을 삭제하시겠습니까? (y/N): ")
            if confirm.lower() != 'y':
                logger.info("삭제가 취소되었습니다.")
                return
        
        clear_all_embeddings()
        return
    
    if not args.force:
        confirm = input(f"총 이력서 수에 따라 임베딩을 초기화하시겠습니까? (y/N): ")
        if confirm.lower() != 'y':
            logger.info("초기화가 취소되었습니다.")
            return
    
    initialize_embeddings(batch_size=args.batch_size)

if __name__ == "__main__":
    main() 