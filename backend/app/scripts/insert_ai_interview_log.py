import json
import sys
from app.core.database import SessionLocal
from app.models.interview_question_log import InterviewQuestionLog
from app.models.application import Application
from app.models.job import JobPost
from app.models.interview_question import InterviewQuestion
from app.services.ai_interview_evaluation_service import save_ai_interview_evaluation, create_ai_interview_schedule

# 예시: 분석 결과 JSON 파일 경로
ANALYSIS_JSON_PATH = 'app/data/ai_interview_applicant_evaluation.json'

def insert_ai_interview_log(json_path, application_id, job_post_id):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    db = SessionLocal()
    inserted_count = 0
    
    try:
        # AI 면접 일정 생성 또는 조회
        interview_id = create_ai_interview_schedule(db, application_id, job_post_id)
        print(f"📅 AI 면접 일정 ID: {interview_id}")
        
        for applicant_data in data:
            if applicant_data.get('applicant_id') == application_id:
                responses = applicant_data.get('responses', [])
                
                for response in responses:
                    question_text = response.get('ai_question')
                    if not question_text:
                        continue
                    
                    # 질문이 DB에 있는지 확인하고 없으면 생성
                    existing_question = db.query(InterviewQuestion).filter(
                        InterviewQuestion.question_text == question_text,
                        InterviewQuestion.types == "AI_INTERVIEW"
                    ).first()
                    
                    if not existing_question:
                        # 새로운 질문 생성
                        from app.models.interview_question import QuestionType
                        existing_question = InterviewQuestion(
                            type=QuestionType.AI_INTERVIEW,
                            question_text=question_text,
                            category=response.get('category', 'general'),
                            difficulty="medium",
                            job_post_id=job_post_id,
                            applicant_id=None,
                            created_by="ai_system"
                        )
                        db.add(existing_question)
                        db.flush()
                        print(f"📝 새 질문 생성: {question_text[:50]}...")
                    
                    # 질문-답변 로그 생성
                    log_entry = InterviewQuestionLog(
                        application_id=application_id,
                        job_post_id=job_post_id,
                        question_id=existing_question.id,
                        question_text=question_text,
                        answer_text=response.get('answer_text'),
                        answer_audio_url=None,  # 필요시 추가
                        answer_video_url=None   # 필요시 추가
                    )
                    
                    db.add(log_entry)
                    inserted_count += 1
                
                # AI 평가 실행
                try:
                    evaluation_id = save_ai_interview_evaluation(
                        db=db,
                        application_id=application_id,
                        interview_id=interview_id,
                        job_post_id=job_post_id,
                        analysis=None,  # JSON에서 자동 로드
                        json_path=json_path
                    )
                    print(f"✅ AI 평가 완료 (평가 ID: {evaluation_id})")
                except Exception as e:
                    print(f"⚠️ AI 평가 실패: {e}")
                
                break
        
        db.commit()
        print(f"✅ {inserted_count}개 질문-답변 로그 삽입 완료")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """기존 main 함수 - 별도 실행용"""
    if len(sys.argv) != 4:
        print("사용법: python insert_ai_interview_log.py <json_path> <application_id> <job_post_id>")
        sys.exit(1)
    
    json_path = sys.argv[1]
    application_id = int(sys.argv[2])
    job_post_id = int(sys.argv[3])
    
    insert_ai_interview_log(json_path, application_id, job_post_id)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("사용법: python insert_ai_interview_log.py <json_path> <application_id> <job_post_id>")
        sys.exit(1)
    json_path = sys.argv[1]
    application_id = int(sys.argv[2])
    job_post_id = int(sys.argv[3])
    insert_ai_interview_log(json_path, application_id, job_post_id)
    # main() 함수 호출 제거 - 별도 기능이므로 필요시 수동 실행