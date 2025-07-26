#!/usr/bin/env python3
"""
AI 면접 평가 결과 예시 스크립트 (실제 JSON 데이터 사용)
"""

import sys
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.application import Application
from app.models.job import JobPost
from app.services.ai_interview_evaluation_service import (
    load_ai_interview_data, 
    get_applicant_analysis_data, 
    save_ai_interview_evaluation
)

def test_ai_evaluation_example():
    """AI 면접 평가 결과 예시 (실제 JSON 데이터 사용)"""
    print("=== AI 면접 분석 결과 예시 (실제 JSON 데이터) ===")
    
    try:
        # JSON 데이터 로드
        data = load_ai_interview_data()
        
        # 사용 가능한 지원자 ID 출력
        applicant_ids = [item.get('applicant_id') for item in data if item.get('applicant_id')]
        print(f"📋 JSON에서 사용 가능한 지원자 ID: {applicant_ids}")
        
        # 예시 데이터 (첫 번째 지원자)
        if applicant_ids:
            example_applicant_id = applicant_ids[0]
            example_data = get_applicant_analysis_data(example_applicant_id)
            
            print(f"📊 예시 데이터 (지원자 ID: {example_applicant_id}):")
            print(f"입력 데이터: {example_data}")
            print()
            
            # 각 항목별 평가
            from app.services.ai_interview_evaluation_service import (
                get_grade_and_reason_speech_rate,
                get_grade_and_reason_smile,
                get_grade_and_reason_eye_contact,
                get_grade_and_reason_redundancy,
                get_grade_and_reason_silence
            )
            
            # 1. 발화 속도 평가
            grade, comment = get_grade_and_reason_speech_rate(example_data['speech_rate'])
            print(f"1. 발화 속도 평가:")
            print(f"   점수: {example_data['speech_rate']} (단어/분)")
            print(f"   등급: {grade}")
            print(f"   코멘트: {comment}")
            print()
            
            # 2. 미소 빈도 평가
            grade, comment = get_grade_and_reason_smile(example_data['smile_frequency'])
            print(f"2. 미소 빈도 평가:")
            print(f"   점수: {example_data['smile_frequency']} (회)")
            print(f"   등급: {grade}")
            print(f"   코멘트: {comment}")
            print()
            
            # 3. 시선 접촉 평가
            grade, comment = get_grade_and_reason_eye_contact(example_data['eye_contact_ratio'])
            print(f"3. 시선 접촉 평가:")
            print(f"   점수: {example_data['eye_contact_ratio']} (비율)")
            print(f"   등급: {grade}")
            print(f"   코멘트: {comment}")
            print()
            
            # 4. 중복 단어 사용 평가
            grade, comment = get_grade_and_reason_redundancy(example_data['redundancy_score'])
            print(f"4. 중복 단어 사용 평가:")
            print(f"   점수: {example_data['redundancy_score']} (비율)")
            print(f"   등급: {grade}")
            print(f"   코멘트: {comment}")
            print()
            
            # 5. 침묵 시간 평가
            grade, comment = get_grade_and_reason_silence(example_data['total_silence_time'])
            print(f"5. 침묵 시간 평가:")
            print(f"   점수: {example_data['total_silence_time']} (초)")
            print(f"   등급: {grade}")
            print(f"   코멘트: {comment}")
            print()
            
            # 통계 계산
            grades = [
                get_grade_and_reason_speech_rate(example_data['speech_rate'])[0],
                get_grade_and_reason_smile(example_data['smile_frequency'])[0],
                get_grade_and_reason_eye_contact(example_data['eye_contact_ratio'])[0],
                get_grade_and_reason_redundancy(example_data['redundancy_score'])[0],
                get_grade_and_reason_silence(example_data['total_silence_time'])[0]
            ]
            
            num_high = grades.count("상")
            num_medium = grades.count("중")
            num_low = grades.count("하")
            
            print("=== 최종 평가 결과 ===")
            print(f"상 등급: {num_high}개")
            print(f"중 등급: {num_medium}개")
            print(f"하 등급: {num_low}개")
            print()
            
            # 합격 여부 판정
            passed = num_low < 2
            print(f"합격 여부: {'✅ 통과' if passed else '❌ 불합격'}")
            print(f"판정 기준: 하 등급이 2개 미만이면 통과")
            print()
            
            # 총점 계산
            total_score = num_high * 2 + num_medium * 1 + num_low * 0
            print(f"총점: {total_score}점 (상: 2점, 중: 1점, 하: 0점)")
            print()
            
            # 요약 생성
            summary = []
            if num_high > 0:
                high_comments = [
                    get_grade_and_reason_speech_rate(example_data['speech_rate'])[1] if grades[0] == "상" else "",
                    get_grade_and_reason_smile(example_data['smile_frequency'])[1] if grades[1] == "상" else "",
                    get_grade_and_reason_eye_contact(example_data['eye_contact_ratio'])[1] if grades[2] == "상" else "",
                    get_grade_and_reason_redundancy(example_data['redundancy_score'])[1] if grades[3] == "상" else "",
                    get_grade_and_reason_silence(example_data['total_silence_time'])[1] if grades[4] == "상" else ""
                ]
                high_comments = [c for c in high_comments if c]
                summary.append("장점: " + ", ".join(high_comments))
            
            if num_medium > 0:
                medium_comments = [
                    get_grade_and_reason_speech_rate(example_data['speech_rate'])[1] if grades[0] == "중" else "",
                    get_grade_and_reason_smile(example_data['smile_frequency'])[1] if grades[1] == "중" else "",
                    get_grade_and_reason_eye_contact(example_data['eye_contact_ratio'])[1] if grades[2] == "중" else "",
                    get_grade_and_reason_redundancy(example_data['redundancy_score'])[1] if grades[3] == "중" else "",
                    get_grade_and_reason_silence(example_data['total_silence_time'])[1] if grades[4] == "중" else ""
                ]
                medium_comments = [c for c in medium_comments if c]
                summary.append("아쉬운점: " + ", ".join(medium_comments))
            
            if num_low > 0:
                low_comments = [
                    get_grade_and_reason_speech_rate(example_data['speech_rate'])[1] if grades[0] == "하" else "",
                    get_grade_and_reason_smile(example_data['smile_frequency'])[1] if grades[1] == "하" else "",
                    get_grade_and_reason_eye_contact(example_data['eye_contact_ratio'])[1] if grades[2] == "하" else "",
                    get_grade_and_reason_redundancy(example_data['redundancy_score'])[1] if grades[3] == "하" else "",
                    get_grade_and_reason_silence(example_data['total_silence_time'])[1] if grades[4] == "하" else ""
                ]
                low_comments = [c for c in low_comments if c]
                summary.append("개선점: " + ", ".join(low_comments))
            
            summary.append("최종판정: " + ("통과" if passed else "불합격"))
            
            print("=== 평가 요약 ===")
            for line in summary:
                print(line)
            print()
            
    except Exception as e:
        print(f"❌ 예시 데이터 로드 실패: {e}")

def save_evaluation_to_db():
    """데이터베이스에 평가 결과 저장"""
    print("=== 데이터베이스 저장 테스트 (실제 JSON 데이터) ===")
    
    db = SessionLocal()
    try:
        # 1. JSON 데이터 로드
        data = load_ai_interview_data()
        applicant_ids = [item.get('applicant_id') for item in data if item.get('applicant_id')]
        print(f"📋 JSON에서 사용 가능한 지원자 ID: {applicant_ids}")
        
        # 2. 데이터베이스 지원자 목록 조회
        applications = db.query(Application).all()

        print("\n" + "="*50)
        
        # 3. 사용자 입력 받기
        try:
            application_id = int(input("지원자 ID를 입력하세요: "))
        except ValueError:
            print("❌ 잘못된 지원자 ID입니다.")
            return
        
        # 4. 지원자 존재 확인
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            print(f"❌ 지원자 ID {application_id}를 찾을 수 없습니다.")
            return
        
        # 5. 공고 ID 설정
        try:
            job_post_input = input("공고 ID를 입력하세요 (기본값: 17): ").strip()
            if job_post_input:
                job_post_id = int(job_post_input)
            else:
                job_post_id = 17
        except ValueError:
            job_post_id = 17
        
        # 6. 면접 ID 입력 받기 (선택사항)
        try:
            interview_input = input("면접 ID를 입력하세요 (Enter: 자동 설정, 숫자: 직접 입력): ").strip()
            if interview_input == "":
                interview_id = None  # 자동 설정
                print("📅 면접 ID를 자동으로 설정합니다")
            else:
                interview_id = int(interview_input)
        except ValueError:
            interview_id = None
            print("📅 면접 ID를 자동으로 설정합니다")
        
        # 7. 지원자 정보 출력
        applicant_name = application.user.name if application.user else "Unknown"
        job_title = application.job_post.title if application.job_post else "Unknown"
        
        print(f"\n📊 평가 대상:")
        print(f"   - 지원자: {applicant_name} (ID: {application_id})")
        print(f"   - 공고: {job_title} (ID: {job_post_id})")
        print(f"   - 면접 ID: {interview_id if interview_id else '자동 설정'}")
        print()
        
        # 8. AI 면접 평가 실행 및 저장
        evaluation_id = save_ai_interview_evaluation(
            db=db,
            application_id=application_id,
            interview_id=interview_id,  # None이면 자동 설정
            job_post_id=job_post_id,
            analysis=None,  # None이면 JSON에서 자동 로드
            json_path=None
        )
        
        print(f"✅ 평가 ID {evaluation_id}로 저장 완료!")
        
    except Exception as e:
        print(f"❌ 데이터베이스 저장 실패: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # 1. 예시 데이터 출력
    test_ai_evaluation_example()
    
    # 2. 데이터베이스 저장 여부 확인
    print("="*50)
    save_choice = input("데이터베이스에 저장하시겠습니까? (y/n): ").strip().lower()
    
    if save_choice in ['y', 'yes', '예']:
        save_evaluation_to_db()
    else:
        print("데이터베이스 저장을 건너뜁니다.") 