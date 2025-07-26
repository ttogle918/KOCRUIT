#!/usr/bin/env python3
"""
특정 지원자 합격 처리 스크립트
59, 61, 68번 지원자를 실무진 면접 합격으로 처리합니다.
"""

import sys
import os
from datetime import datetime

# 프로젝트 루트 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import get_db
from app.models.application import Application
from sqlalchemy.orm import Session

def pass_specific_applicants():
    """특정 지원자들을 실무진 면접 합격으로 처리"""
    
    db = next(get_db())
    
    try:
        # 합격시킬 지원자 ID 목록
        pass_applicant_ids = [59, 61, 68]
        
        # 해당 지원자들 조회
        applications = db.query(Application).filter(
            Application.id.in_(pass_applicant_ids)
        ).all()
        
        print(f"처리할 지원자 수: {len(applications)}")
        
        if not applications:
            print("처리할 지원자가 없습니다.")
            return
        
        for application in applications:
            # 지원자 상태를 실무진 면접 합격으로 변경
            application.status = "PRACTICAL_PASSED"
            application.updated_at = datetime.now()
            
            print(f"지원자 {application.id} - 실무진 면접 합격 처리 완료")
        
        # 데이터베이스에 저장
        db.commit()
        print(f"총 {len(applications)}명의 지원자가 실무진 면접 합격으로 처리되었습니다.")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=== 특정 지원자 합격 처리 시작 ===")
    pass_specific_applicants()
    print("=== 작업 완료 ===") 