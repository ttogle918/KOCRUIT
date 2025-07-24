import json
import os
from app.models.interview_evaluation import InterviewEvaluation, InterviewEvaluationItem, EvaluationStatus, EvaluationType
from app.models.schedule import Schedule, ScheduleInterview, InterviewScheduleStatus
from app.models.application import InterviewStatus
from sqlalchemy.orm import Session
from datetime import datetime

def get_grade_and_reason_speech_rate(speech_rate):
    if speech_rate > 150:
        return "상", "발화 속도가 매우 자연스러움"
    elif speech_rate > 120:
        return "중", "발화 속도가 다소 자연스러움"
    else:
        return "하", "발화 속도가 느림"

def get_grade_and_reason_smile(smile_frequency):
    if smile_frequency >= 2:
        return "상", "미소 빈도가 높음"
    elif smile_frequency == 1:
        return "중", "미소 빈도가 보통"
    else:
        return "하", "미소가 거의 없음"

def get_grade_and_reason_eye_contact(eye_contact_ratio):
    if eye_contact_ratio > 0.9:
        return "상", "시선이 정면을 잘 유지함"
    elif eye_contact_ratio > 0.8:
        return "중", "시선이 대체로 정면"
    else:
        return "하", "시선이 자주 흐트러짐"

def get_grade_and_reason_redundancy(redundancy_score):
    if redundancy_score < 0.04:
        return "상", "중복 단어 사용이 거의 없음"
    elif redundancy_score < 0.08:
        return "중", "중복 단어 사용이 약간 있음"
    else:
        return "하", "중복 단어 사용이 많음"

def get_grade_and_reason_silence(total_silence_time):
    if total_silence_time < 1.5:
        return "상", "침묵이 거의 없음"
    elif total_silence_time < 2.5:
        return "중", "침묵이 약간 있음"
    else:
        return "하", "침묵이 많음"

# 새로운 평가 항목들 추가
def get_grade_and_reason_pronunciation(pronunciation_score):
    if pronunciation_score > 0.9:
        return "상", "발음이 매우 정확함"
    elif pronunciation_score > 0.7:
        return "중", "발음이 대체로 정확함"
    else:
        return "하", "발음이 부정확함"

def get_grade_and_reason_volume(volume_level):
    if 0.7 <= volume_level <= 1.0:
        return "상", "음성 볼륨이 적절함"
    elif 0.5 <= volume_level < 0.7:
        return "중", "음성 볼륨이 약간 작음"
    else:
        return "하", "음성 볼륨이 너무 작거나 큼"

def get_grade_and_reason_emotion(emotion_variation):
    if emotion_variation > 0.7:
        return "상", "감정 표현이 풍부함"
    elif emotion_variation > 0.4:
        return "중", "감정 표현이 보통"
    else:
        return "하", "감정 표현이 부족함"

def get_grade_and_reason_hand_gesture(hand_gesture):
    if 0.3 <= hand_gesture <= 0.7:
        return "상", "손동작이 적절함"
    elif hand_gesture < 0.3:
        return "중", "손동작이 부족함"
    else:
        return "하", "손동작이 과도함"

def get_grade_and_reason_nod(nod_count):
    if 2 <= nod_count <= 5:
        return "상", "고개 끄덕임이 적절함"
    elif nod_count < 2:
        return "중", "고개 끄덕임이 부족함"
    else:
        return "하", "고개 끄덕임이 과도함"

def get_grade_and_reason_posture(posture_changes):
    if posture_changes < 3:
        return "상", "자세가 안정적임"
    elif posture_changes < 6:
        return "중", "자세 변화가 약간 있음"
    else:
        return "하", "자세가 불안정함"

def get_grade_and_reason_understanding(question_understanding_score):
    if question_understanding_score > 0.8:
        return "상", "질문 이해도가 높음"
    elif question_understanding_score > 0.6:
        return "중", "질문 이해도가 보통"
    else:
        return "하", "질문 이해도가 낮음"

def get_grade_and_reason_conversation_flow(conversation_flow_score):
    if conversation_flow_score > 0.8:
        return "상", "대화 흐름이 자연스러움"
    elif conversation_flow_score > 0.6:
        return "중", "대화 흐름이 보통"
    else:
        return "하", "대화 흐름이 부자연스러움"

def get_grade_and_reason_eye_aversion(eye_aversion_count):
    if eye_aversion_count < 2:
        return "상", "시선 이탈이 거의 없음"
    elif eye_aversion_count < 4:
        return "중", "시선 이탈이 약간 있음"
    else:
        return "하", "시선 이탈이 많음"

def get_grade_and_reason_positive_words(positive_word_ratio):
    if positive_word_ratio > 0.6:
        return "상", "긍정적 표현이 많음"
    elif positive_word_ratio > 0.4:
        return "중", "긍정적 표현이 보통"
    else:
        return "하", "긍정적 표현이 부족함"

def get_grade_and_reason_technical_terms(technical_term_count):
    if 3 <= technical_term_count <= 8:
        return "상", "전문 용어 사용이 적절함"
    elif technical_term_count < 3:
        return "중", "전문 용어 사용이 부족함"
    else:
        return "하", "전문 용어 사용이 과도함"

def get_grade_and_reason_grammar(grammar_error_count):
    if grammar_error_count == 0:
        return "상", "문법 오류가 없음"
    elif grammar_error_count <= 2:
        return "중", "문법 오류가 약간 있음"
    else:
        return "하", "문법 오류가 많음"

def get_grade_and_reason_conciseness(conciseness_score):
    if conciseness_score > 0.8:
        return "상", "답변이 간결하고 명확함"
    elif conciseness_score > 0.6:
        return "중", "답변이 보통 수준"
    else:
        return "하", "답변이 장황하거나 불명확함"

def get_grade_and_reason_creativity(creativity_score):
    if creativity_score > 0.7:
        return "상", "창의적 사고가 뛰어남"
    elif creativity_score > 0.4:
        return "중", "창의적 사고가 보통"
    else:
        return "하", "창의적 사고가 부족함"

def get_grade_and_reason_stress(stress_signal_score):
    if stress_signal_score < 0.3:
        return "상", "스트레스 신호가 적음"
    elif stress_signal_score < 0.6:
        return "중", "스트레스 신호가 보통"
    else:
        return "하", "스트레스 신호가 많음"

def load_ai_interview_data(json_path: str = None):
    """AI 면접 평가 데이터 로드 (확장된 버전 사용)"""
    if json_path is None:
        # Docker 컨테이너 내부 경로 설정
        # /app 디렉토리에서 backend/data/ai_interview_applicant_evaluation_extended.json 찾기
        possible_paths = [
            '/app/data/ai_interview_applicant_evaluation_extended.json',  # Docker 컨테이너 내부
            '/app/backend/data/ai_interview_applicant_evaluation_extended.json',  # 백엔드 디렉토리 내부
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'ai_interview_applicant_evaluation_extended.json'),  # 상대 경로
            'data/ai_interview_applicant_evaluation_extended.json',  # 현재 디렉토리 기준
            '../data/ai_interview_applicant_evaluation_extended.json',  # 상위 디렉토리
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                json_path = path
                print(f"📁 JSON 파일 경로: {json_path}")
                break
        else:
            raise ValueError(f"JSON 파일을 찾을 수 없습니다. 시도한 경로: {possible_paths}")
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ JSON 파일 로드 성공: {len(data)}개 지원자 데이터")
        return data
    except Exception as e:
        raise ValueError(f"JSON 파일 로드 실패: {e}")

def get_applicant_analysis_data(applicant_id: int, json_path: str = None):
    """특정 지원자의 분석 데이터 조회 (확장된 24개 항목)"""
    data = load_ai_interview_data(json_path)
    
    for applicant_data in data:
        if applicant_data.get('applicant_id') == applicant_id:
            responses = applicant_data.get('responses', [])
            if not responses:
                raise ValueError(f"지원자 {applicant_id}의 응답 데이터가 없습니다")
            
            # 첫 번째 응답 사용 (현재는 각 지원자당 1개 응답)
            response = responses[0]
            
            # 모든 평가 항목 반환
            return {
                # 기본 항목들
                "speech_rate": response.get('speech_rate', 150.0),
                "smile_frequency": response.get('smile_frequency', 1.0),
                "eye_contact_ratio": response.get('eye_contact_ratio', 0.8),
                "redundancy_score": response.get('redundancy_score', 0.05),
                "total_silence_time": response.get('total_silence_time', 1.0),
                
                # 음성/화법 확장 항목들
                "pronunciation_score": response.get('pronunciation_score', 0.85),
                "volume_level": response.get('volume_level', 0.75),
                "emotion_variation": response.get('emotion_variation', 0.6),
                "intonation_score": response.get('intonation_score', 0.7),
                "background_noise_level": response.get('background_noise_level', 0.1),
                
                # 비언어적 행동 확장 항목들
                "hand_gesture": response.get('hand_gesture', 0.5),
                "nod_count": response.get('nod_count', 2),
                "posture_changes": response.get('posture_changes', 2),
                "eye_aversion_count": response.get('eye_aversion_count', 1),
                "facial_expression_variation": response.get('facial_expression_variation', 0.6),
                
                # 상호작용 확장 항목들
                "question_understanding_score": response.get('question_understanding_score', 0.8),
                "conversation_flow_score": response.get('conversation_flow_score', 0.75),
                "interaction_score": response.get('interaction_score', 0.75),
                
                # 언어/내용 확장 항목들
                "positive_word_ratio": response.get('positive_word_ratio', 0.6),
                "negative_word_ratio": response.get('negative_word_ratio', 0.1),
                "technical_term_count": response.get('technical_term_count', 5),
                "grammar_error_count": response.get('grammar_error_count', 1),
                "conciseness_score": response.get('conciseness_score', 0.7),
                "creativity_score": response.get('creativity_score', 0.6),
                "stress_signal_score": response.get('stress_signal_score', 0.3),
                "visual_distraction_score": response.get('visual_distraction_score', 0.15),
                "language_switch_count": response.get('language_switch_count', 0),
                "emotion_consistency_score": response.get('emotion_consistency_score', 0.8)
            }
    
    raise ValueError(f"지원자 ID {applicant_id}를 찾을 수 없습니다")

def create_ai_interview_schedule(db: Session, application_id: int, job_post_id: int):
    """AI 면접용 ai_interview_schedule 자동 생성"""
    from app.models.application import Application
    from app.models.schedule import AIInterviewSchedule
    
    # 지원자 정보 조회
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise ValueError(f"지원자 ID {application_id}를 찾을 수 없습니다")
    
    # 지원자 ID 가져오기
    applicant_user_id = application.user_id
    print(f"👤 지원자 사용자 ID: {applicant_user_id}")
    
    # 기존 AI 면접 일정이 있는지 확인 (같은 지원자, 같은 공고)
    existing_schedule = db.query(AIInterviewSchedule).filter(
        AIInterviewSchedule.application_id == application_id,
        AIInterviewSchedule.job_post_id == job_post_id
    ).first()
    
    if existing_schedule:
        print(f"📅 기존 AI 면접 일정 사용: {existing_schedule.id}")
        return existing_schedule.id
    
    # 새로운 AI 면접 일정 생성
    try:
        ai_schedule = AIInterviewSchedule(
            application_id=application_id,
            job_post_id=job_post_id,
            applicant_user_id=applicant_user_id,
            scheduled_at=datetime.now(),
            status="SCHEDULED"
        )
        db.add(ai_schedule)
        db.flush()  # ID 생성
        
        print(f"📅 새로운 AI 면접 일정 생성: {ai_schedule.id}")
        print(f"   - 지원자 ID: {applicant_user_id}")
        print(f"   - 공고 ID: {job_post_id}")
        print(f"   - 지원서 ID: {application_id}")
        return ai_schedule.id
        
    except Exception as e:
        db.rollback()
        raise ValueError(f"AI 면접 일정 생성 실패: {e}")

def save_ai_interview_evaluation(db: Session, application_id: int, interview_id: int = None, job_post_id: int = None, analysis: dict = None, json_path: str = None):
    """
    AI 면접 평가 결과를 데이터베이스에 저장
    
    Args:
        db: 데이터베이스 세션
        application_id: 지원자 ID
        interview_id: 면접 ID (None이면 자동으로 찾거나 생성)
        job_post_id: 공고 ID
        analysis: 분석 결과 딕셔너리 (None이면 JSON에서 자동 로드)
        json_path: JSON 파일 경로 (선택사항)
    """
    # 지원자 정보 조회
    from app.models.application import Application
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise ValueError(f"지원자 ID {application_id}를 찾을 수 없습니다")
    
    # job_post_id 처리
    if job_post_id is None:
        job_post_id = application.job_post_id
        print(f"📋 공고 ID 자동 설정: {job_post_id}")
    
    # interview_id 처리
    if interview_id is None:
        # 지원자 ID 가져오기
        applicant_user_id = application.user_id
        
        # 1. 기존 면접 일정 찾기 (같은 지원자, 같은 공고)
        from app.models.schedule import AIInterviewSchedule
        ai_schedule = db.query(AIInterviewSchedule).filter(
            AIInterviewSchedule.application_id == application_id,
            AIInterviewSchedule.job_post_id == job_post_id
        ).first()
        
        if ai_schedule:
            interview_id = ai_schedule.id
            print(f"📅 기존 AI 면접 일정 사용: {interview_id}")
        else:
            # 2. 새로운 AI 면접 일정 생성
            interview_id = create_ai_interview_schedule(db, application_id, job_post_id)
    else:
        # 사용자가 제공한 interview_id가 유효한지 확인
        from app.models.schedule import AIInterviewSchedule
        existing_interview = db.query(AIInterviewSchedule).filter(AIInterviewSchedule.id == interview_id).first()
        if not existing_interview:
            print(f"⚠️ 제공된 면접 ID {interview_id}가 존재하지 않습니다. 새로운 면접 일정을 생성합니다.")
            interview_id = create_ai_interview_schedule(db, application_id, job_post_id)
    
    # 분석 데이터 로드 (제공되지 않은 경우 JSON에서 자동 로드)
    if analysis is None:
        try:
            analysis = get_applicant_analysis_data(application_id, json_path)
            print(f"📊 JSON에서 분석 데이터 로드 완료: {analysis}")
        except Exception as e:
            print(f"⚠️ JSON 데이터 로드 실패, 기본값 사용: {e}")
            # 기본값 사용 (확장된 항목 포함)
            analysis = {
                "speech_rate": 150.0,
                "smile_frequency": 1,
                "eye_contact_ratio": 0.85,
                "redundancy_score": 0.05,
                "total_silence_time": 1.0,
                # 새로운 항목들
                "pronunciation_score": 0.85,
                "volume_level": 0.75,
                "emotion_variation": 0.6,
                "hand_gesture": 0.5,
                "nod_count": 3,
                "posture_changes": 2,
                "question_understanding_score": 0.8,
                "conversation_flow_score": 0.75,
                "eye_aversion_count": 1,
                "positive_word_ratio": 0.6,
                "technical_term_count": 5,
                "grammar_error_count": 1,
                "conciseness_score": 0.7,
                "creativity_score": 0.6,
                "stress_signal_score": 0.3
            }
    
    items = []
    
    # 기본 평가 항목들
    grade, comment = get_grade_and_reason_speech_rate(analysis.get('speech_rate', 150.0))
    items.append(dict(type="speech_rate", score=analysis.get('speech_rate', 150.0), grade=grade, comment=comment))
    
    grade, comment = get_grade_and_reason_smile(analysis.get('smile_frequency', 1))
    items.append(dict(type="smile_frequency", score=analysis.get('smile_frequency', 1), grade=grade, comment=comment))
    
    grade, comment = get_grade_and_reason_eye_contact(analysis.get('eye_contact_ratio', 0.85))
    items.append(dict(type="eye_contact_ratio", score=analysis.get('eye_contact_ratio', 0.85), grade=grade, comment=comment))
    
    grade, comment = get_grade_and_reason_redundancy(analysis.get('redundancy_score', 0.05))
    items.append(dict(type="redundancy_score", score=analysis.get('redundancy_score', 0.05), grade=grade, comment=comment))
    
    grade, comment = get_grade_and_reason_silence(analysis.get('total_silence_time', 1.0))
    items.append(dict(type="total_silence_time", score=analysis.get('total_silence_time', 1.0), grade=grade, comment=comment))
    
    # 새로운 평가 항목들 (확장된 분석)
    if 'pronunciation_score' in analysis:
        grade, comment = get_grade_and_reason_pronunciation(analysis['pronunciation_score'])
        items.append(dict(type="pronunciation_score", score=analysis['pronunciation_score'], grade=grade, comment=comment))
    
    if 'volume_level' in analysis:
        grade, comment = get_grade_and_reason_volume(analysis['volume_level'])
        items.append(dict(type="volume_level", score=analysis['volume_level'], grade=grade, comment=comment))
    
    if 'emotion_variation' in analysis:
        grade, comment = get_grade_and_reason_emotion(analysis['emotion_variation'])
        items.append(dict(type="emotion_variation", score=analysis['emotion_variation'], grade=grade, comment=comment))
    
    if 'hand_gesture' in analysis:
        grade, comment = get_grade_and_reason_hand_gesture(analysis['hand_gesture'])
        items.append(dict(type="hand_gesture", score=analysis['hand_gesture'], grade=grade, comment=comment))
    
    if 'nod_count' in analysis:
        grade, comment = get_grade_and_reason_nod(analysis['nod_count'])
        items.append(dict(type="nod_count", score=analysis['nod_count'], grade=grade, comment=comment))
    
    if 'posture_changes' in analysis:
        grade, comment = get_grade_and_reason_posture(analysis['posture_changes'])
        items.append(dict(type="posture_changes", score=analysis['posture_changes'], grade=grade, comment=comment))
    
    if 'question_understanding_score' in analysis:
        grade, comment = get_grade_and_reason_understanding(analysis['question_understanding_score'])
        items.append(dict(type="question_understanding_score", score=analysis['question_understanding_score'], grade=grade, comment=comment))
    
    if 'conversation_flow_score' in analysis:
        grade, comment = get_grade_and_reason_conversation_flow(analysis['conversation_flow_score'])
        items.append(dict(type="conversation_flow_score", score=analysis['conversation_flow_score'], grade=grade, comment=comment))
    
    if 'eye_aversion_count' in analysis:
        grade, comment = get_grade_and_reason_eye_aversion(analysis['eye_aversion_count'])
        items.append(dict(type="eye_aversion_count", score=analysis['eye_aversion_count'], grade=grade, comment=comment))
    
    if 'positive_word_ratio' in analysis:
        grade, comment = get_grade_and_reason_positive_words(analysis['positive_word_ratio'])
        items.append(dict(type="positive_word_ratio", score=analysis['positive_word_ratio'], grade=grade, comment=comment))
    
    if 'technical_term_count' in analysis:
        grade, comment = get_grade_and_reason_technical_terms(analysis['technical_term_count'])
        items.append(dict(type="technical_term_count", score=analysis['technical_term_count'], grade=grade, comment=comment))
    
    if 'grammar_error_count' in analysis:
        grade, comment = get_grade_and_reason_grammar(analysis['grammar_error_count'])
        items.append(dict(type="grammar_error_count", score=analysis['grammar_error_count'], grade=grade, comment=comment))
    
    if 'conciseness_score' in analysis:
        grade, comment = get_grade_and_reason_conciseness(analysis['conciseness_score'])
        items.append(dict(type="conciseness_score", score=analysis['conciseness_score'], grade=grade, comment=comment))
    
    if 'creativity_score' in analysis:
        grade, comment = get_grade_and_reason_creativity(analysis['creativity_score'])
        items.append(dict(type="creativity_score", score=analysis['creativity_score'], grade=grade, comment=comment))
    
    if 'stress_signal_score' in analysis:
        grade, comment = get_grade_and_reason_stress(analysis['stress_signal_score'])
        items.append(dict(type="stress_signal_score", score=analysis['stress_signal_score'], grade=grade, comment=comment))
    
    # 6. 통계 계산
    num_high = sum(1 for i in items if i['grade'] == "상")
    num_medium = sum(1 for i in items if i['grade'] == "중")
    num_low = sum(1 for i in items if i['grade'] == "하")
    
    # 7. 합격 여부 판정 (현실적인 기준)
    # 하 등급이 전체의 20% 미만이면 통과 (24개 항목 기준으로 약 4.8개, 즉 4개 미만)
    # 상 등급이 전체의 30% 이상이어야 함 (24개 항목 기준으로 7개 이상)
    total_items = len(items)
    low_threshold = max(3, int(total_items * 0.20))  # 최소 3개, 최대 20%
    high_threshold = int(total_items * 0.30)  # 30% 이상
    
    # 두 조건 모두 만족해야 합격
    passed = (num_low < low_threshold) and (num_high >= high_threshold)
    
    # 8. 총점 계산 (상: 2점, 중: 1점, 하: 0점)
    total_score = num_high * 2 + num_medium * 1 + num_low * 0
    
    # 9. 요약 생성
    summary = []
    if num_high > 0:
        high_comments = [i['comment'] for i in items if i['grade'] == "상"]
        summary.append("장점: " + ", ".join(high_comments))
    
    if num_medium > 0:
        medium_comments = [i['comment'] for i in items if i['grade'] == "중"]
        summary.append("아쉬운점: " + ", ".join(medium_comments))
    
    if num_low > 0:
        low_comments = [i['comment'] for i in items if i['grade'] == "하"]
        summary.append("개선점: " + ", ".join(low_comments))
    
    summary.append("최종판정: " + ("통과" if passed else "불합격"))
    
    # 10. 메인 평가 레코드 생성
    evaluation = InterviewEvaluation(
        interview_id=interview_id,
        evaluator_id=None,
        is_ai=True,
        evaluation_type=EvaluationType.AI,
        total_score=total_score,
        summary="\n".join(summary),
        created_at=datetime.now(),
        updated_at=datetime.now(),
        status=EvaluationStatus.SUBMITTED
    )
    
    db.add(evaluation)
    db.flush()  # ID 생성을 위해 flush
    
    # 11. 개별 평가 항목들을 InterviewEvaluationItem 테이블에 저장
    for item in items:
        evaluation_item = InterviewEvaluationItem(
            evaluation_id=evaluation.id,
            evaluate_type=item['type'],
            evaluate_score=item['score'],
            grade=item['grade'],
            comment=item['comment']
        )
        db.add(evaluation_item)
    
    # 12. 지원자의 AI 점수 및 상태 업데이트
    if application:
        # AI 평가 점수를 지원서에 반영
        application.ai_interview_score = total_score
        # AI 면접 완료 상태로 업데이트
        application.interview_status = InterviewStatus.AI_INTERVIEW_COMPLETED.value
        if passed:
            application.ai_interview_pass_reason = "AI 면접 통과"
            # 합격 시 합격 상태로 업데이트
            application.interview_status = InterviewStatus.AI_INTERVIEW_PASSED.value
        else:
            application.ai_interview_fail_reason = "AI 면접 불합격"
            # 불합격 시 불합격 상태로 업데이트
            application.interview_status = InterviewStatus.AI_INTERVIEW_FAILED.value
    
    db.commit()
    
    # 지원자 정보 출력
    applicant_name = application.user.name if application.user else "Unknown"
    job_title = application.job_post.title if application.job_post else "Unknown"
    
    print(f"✅ AI 면접 평가 완료:")
    print(f"   - 지원자: {applicant_name} (ID: {application_id})")
    print(f"   - 공고: {job_title} (ID: {job_post_id})")
    print(f"   - 면접 ID: {interview_id}")
    print(f"   - 총점: {total_score}점")
    print(f"   - 상 등급: {num_high}개, 중 등급: {num_medium}개, 하 등급: {num_low}개")
    print(f"   - 합격 여부: {'통과' if passed else '불합격'}")
    print(f"   - 판정 기준: 하 등급 {num_low}개 < {low_threshold}개 AND 상 등급 {num_high}개 >= {high_threshold}개")
    print(f"   - 합격 조건: 하 등급 20% 미만({low_threshold}개) AND 상 등급 30% 이상({high_threshold}개)")
    
    return evaluation.id 