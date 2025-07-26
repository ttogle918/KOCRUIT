#!/usr/bin/env python3
"""
written_test_status FAILED인 지원자 데이터 정리 및 서류 통과 판단 로직 수정 스크립트
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import get_db
from app.models.application import Application, WrittenTestStatus, DocumentStatus, ApplyStatus
from app.models.user import User

def fix_written_test_status():
    """written_test_status FAILED인 지원자 데이터 정리"""
    db = next(get_db())
    
    try:
        print("=== written_test_status FAILED인 지원자 데이터 정리 ===\n")
        
        # 1. 현재 상태 확인
        failed_applications = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.FAILED
        ).all()
        
        print(f"written_test_status가 FAILED인 지원자 수: {len(failed_applications)}")
        
        for app in failed_applications:
            user = db.query(User).filter(User.id == app.user_id).first()
            print(f"  - 지원자 ID {app.id} (사용자: {user.name if user else 'Unknown'}):")
            print(f"    * written_test_status: {app.written_test_status}")
            print(f"    * document_status: {app.document_status}")
            print(f"    * status: {app.status}")
            print(f"    * written_test_score: {app.written_test_score}")
        
        # 2. 데이터 정리 옵션
        print(f"\n=== 데이터 정리 옵션 ===")
        print("1. written_test_status를 PENDING으로 초기화")
        print("2. written_test_score를 NULL로 초기화")
        print("3. 서류 통과 여부는 document_status로만 판단하도록 유지")
        
        # 3. 데이터 정리 실행
        print(f"\n=== 데이터 정리 실행 ===")
        
        # written_test_status를 PENDING으로 초기화
        for app in failed_applications:
            app.written_test_status = WrittenTestStatus.PENDING
            print(f"✅ 지원자 ID {app.id}: written_test_status를 PENDING으로 변경")
        
        # written_test_score가 0 이하인 경우 NULL로 초기화
        zero_score_apps = db.query(Application).filter(
            Application.written_test_score <= 0
        ).all()
        
        for app in zero_score_apps:
            app.written_test_score = None
            print(f"✅ 지원자 ID {app.id}: written_test_score를 NULL로 초기화")
        
        # 4. 변경사항 저장
        db.commit()
        
        print(f"\n✅ 데이터 정리 완료!")
        print(f"   - FAILED → PENDING 변경: {len(failed_applications)}개")
        print(f"   - 0점 이하 → NULL 변경: {len(zero_score_apps)}개")
        
        # 5. 최종 상태 확인
        print(f"\n=== 최종 상태 확인 ===")
        final_failed = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.FAILED
        ).count()
        
        final_pending = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.PENDING
        ).count()
        
        final_passed = db.query(Application).filter(
            Application.written_test_status == WrittenTestStatus.PASSED
        ).count()
        
        print(f"written_test_status 분포:")
        print(f"  - FAILED: {final_failed}개")
        print(f"  - PENDING: {final_pending}개")
        print(f"  - PASSED: {final_passed}개")
        
        # 6. 서류 통과 여부 확인 (document_status 기준)
        print(f"\n=== 서류 통과 여부 (document_status 기준) ===")
        doc_passed = db.query(Application).filter(
            Application.document_status == DocumentStatus.PASSED
        ).count()
        
        doc_rejected = db.query(Application).filter(
            Application.document_status == DocumentStatus.REJECTED
        ).count()
        
        doc_pending = db.query(Application).filter(
            Application.document_status == DocumentStatus.PENDING
        ).count()
        
        print(f"document_status 분포:")
        print(f"  - PASSED: {doc_passed}개 (서류 합격)")
        print(f"  - REJECTED: {doc_rejected}개 (서류 불합격)")
        print(f"  - PENDING: {doc_pending}개 (서류 심사 대기)")
        
    except Exception as e:
        print(f"❌ 데이터 정리 실패: {e}")
        db.rollback()
    finally:
        db.close()

def update_document_status_logic():
    """서류 통과 판단 로직 업데이트"""
    db = next(get_db())
    
    try:
        print("\n=== 서류 통과 판단 로직 업데이트 ===\n")
        
        # 1. 현재 서류 상태가 PENDING이지만 실제로는 합격해야 할 지원자들 확인
        pending_applications = db.query(Application).filter(
            Application.document_status == DocumentStatus.PENDING
        ).all()
        
        print(f"서류 상태가 PENDING인 지원자 수: {len(pending_applications)}")
        
        # 2. AI 면접 점수가 있는 지원자들은 서류 합격으로 처리
        ai_interview_applications = db.query(Application).filter(
            Application.ai_interview_score.isnot(None),
            Application.ai_interview_score > 0,
            Application.document_status == DocumentStatus.PENDING
        ).all()
        
        print(f"AI 면접 점수가 있지만 서류 상태가 PENDING인 지원자 수: {len(ai_interview_applications)}")
        
        for app in ai_interview_applications:
            user = db.query(User).filter(User.id == app.user_id).first()
            print(f"  - 지원자 ID {app.id} (사용자: {user.name if user else 'Unknown'}):")
            print(f"    * ai_interview_score: {app.ai_interview_score}")
            print(f"    * 현재 document_status: {app.document_status}")
            
            # AI 면접 점수가 있으면 서류 합격으로 처리
            app.document_status = DocumentStatus.PASSED
            app.status = ApplyStatus.IN_PROGRESS
            print(f"    * 변경된 document_status: {app.document_status}")
            print(f"    * 변경된 status: {app.status}")
        
        # 3. 변경사항 저장
        db.commit()
        
        print(f"\n✅ 서류 통과 판단 로직 업데이트 완료!")
        print(f"   - 서류 합격으로 변경: {len(ai_interview_applications)}개")
        
        # 4. 최종 상태 확인
        print(f"\n=== 최종 서류 상태 확인 ===")
        final_doc_passed = db.query(Application).filter(
            Application.document_status == DocumentStatus.PASSED
        ).count()
        
        final_doc_rejected = db.query(Application).filter(
            Application.document_status == DocumentStatus.REJECTED
        ).count()
        
        final_doc_pending = db.query(Application).filter(
            Application.document_status == DocumentStatus.PENDING
        ).count()
        
        print(f"최종 document_status 분포:")
        print(f"  - PASSED: {final_doc_passed}개 (서류 합격)")
        print(f"  - REJECTED: {final_doc_rejected}개 (서류 불합격)")
        print(f"  - PENDING: {final_doc_pending}개 (서류 심사 대기)")
        
    except Exception as e:
        print(f"❌ 서류 통과 판단 로직 업데이트 실패: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='written_test_status 데이터 정리')
    parser.add_argument('--mode', choices=['fix', 'logic', 'all'], default='all',
                       help='fix: written_test_status 정리, logic: 서류 통과 로직 수정, all: 모두 실행')
    
    args = parser.parse_args()
    
    if args.mode == 'fix':
        fix_written_test_status()
    elif args.mode == 'logic':
        update_document_status_logic()
    else:
        fix_written_test_status()
        update_document_status_logic() 