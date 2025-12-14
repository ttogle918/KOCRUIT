#!/usr/bin/env python3
"""
질문별 비디오 분석 및 전체 비디오 분석 데이터 정리 스크립트
"""

import sys
import os
from datetime import datetime, timedelta

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.v2.interview.question_video_analysis import QuestionMediaAnalysis
from app.models.v2.interview.media_analysis import MediaAnalysis

def clear_all_data():
    """모든 분석 데이터 삭제"""
    try:
        db = next(get_db())
        
        print("🗑️ 모든 분석 데이터 삭제 중...")
        
        # 질문별 분석 데이터 삭제
        deleted_count = db.query(QuestionMediaAnalysis).delete()
        print(f"❓ 질문별 분석 데이터 삭제: {deleted_count}개")
        
        # 전체 비디오 분석 데이터 삭제
        video_deleted_count = db.query(MediaAnalysis).delete()
        print(f"📹 전체 비디오 분석 데이터 삭제: {video_deleted_count}개")
        
        db.commit()
        print("✅ 모든 데이터 삭제 완료")
        
        # 남은 데이터 확인
        remaining_question = db.query(QuestionMediaAnalysis).count()
        remaining_video = db.query(MediaAnalysis).count()
        print(f"📊 남은 데이터: 질문별 분석 {remaining_question}개, 전체 분석 {remaining_video}개")
        
    except Exception as e:
        print(f"❌ 데이터 삭제 오류: {str(e)}")
        db.rollback()
    finally:
        db.close()

def clear_application_data(application_id: int):
    """특정 지원자의 분석 데이터만 삭제"""
    try:
        db = next(get_db())
        
        print(f"🗑️ 지원자 {application_id}의 분석 데이터 삭제 중...")
        
        # 질문별 분석 데이터 삭제
        question_deleted = db.query(QuestionMediaAnalysis).filter(
            QuestionMediaAnalysis.application_id == application_id
        ).delete()
        print(f"❓ 질문별 분석 데이터 삭제: {question_deleted}개")
        
        # 전체 비디오 분석 데이터 삭제
        video_deleted = db.query(MediaAnalysis).filter(
            MediaAnalysis.application_id == application_id
        ).delete()
        print(f"📹 전체 비디오 분석 데이터 삭제: {video_deleted}개")
        
        db.commit()
        print(f"✅ 지원자 {application_id}의 데이터 삭제 완료")
        
    except Exception as e:
        print(f"❌ 데이터 삭제 오류: {str(e)}")
        db.rollback()
    finally:
        db.close()

def show_data_status():
    """현재 데이터 상태 확인"""
    try:
        db = next(get_db())
        
        print("📊 현재 데이터 상태:")
        
        # 전체 데이터 수
        question_count = db.query(QuestionMediaAnalysis).count()
        video_count = db.query(MediaAnalysis).count()
        print(f"❓ 질문별 분석: {question_count}개")
        print(f"📹 전체 비디오 분석: {video_count}개")
        
        # 최근 데이터 확인
        if question_count > 0:
            recent_questions = db.query(QuestionMediaAnalysis).order_by(
                QuestionMediaAnalysis.analysis_timestamp.desc()
            ).limit(5).all()
            
            print("\n🕒 최근 질문별 분석:")
            for q in recent_questions:
                print(f"  - ID: {q.id}, 지원자: {q.application_id}, 시간: {q.analysis_timestamp}")
        
        if video_count > 0:
            recent_videos = db.query(MediaAnalysis).order_by(
                MediaAnalysis.analysis_timestamp.desc()
            ).limit(5).all()
            
            print("\n🕒 최근 전체 분석:")
            for v in recent_videos:
                print(f"  - ID: {v.id}, 지원자: {v.application_id}, 시간: {v.analysis_timestamp}")
        
    except Exception as e:
        print(f"❌ 상태 확인 오류: {str(e)}")
    finally:
        db.close()

def main():
    """메인 함수"""
    if len(sys.argv) < 2:
        print("사용법:")
        print("  python clear_question_video_analysis.py [명령] [application_id]")
        print("\n명령:")
        print("  clear-all: 모든 데이터 삭제")
        print("  clear-app [ID]: 특정 지원자의 데이터 삭제")
        print("  status: 현재 데이터 상태 확인")
        return
    
    command = sys.argv[1]
    
    if command == "clear-all":
        if input("정말로 모든 분석 데이터를 삭제하시겠습니까? (y/N): ").lower() == 'y':
            clear_all_data()
        else:
            print("취소되었습니다.")
    
    elif command == "clear-app":
        if len(sys.argv) < 3:
            print("❌ 지원자 ID를 입력해주세요")
            return
        
        try:
            application_id = int(sys.argv[2])
            if input(f"지원자 {application_id}의 분석 데이터를 삭제하시겠습니까? (y/N): ").lower() == 'y':
                clear_application_data(application_id)
            else:
                print("취소되었습니다.")
        except ValueError:
            print("❌ 올바른 지원자 ID를 입력해주세요")
    
    elif command == "status":
        show_data_status()
    
    else:
        print(f"❌ 알 수 없는 명령: {command}")

if __name__ == "__main__":
    main()
