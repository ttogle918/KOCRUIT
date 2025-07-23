import sys
import os

# 현재 스크립트의 디렉토리를 기준으로 backend 디렉토리 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.interview_question import InterviewQuestion, QuestionType

# 질문 데이터 import
from app.data.general_interview_questions import GENERAL_QUESTIONS

def insert_general_questions(job_post_id):
    db = SessionLocal()
    inserted = 0
    skipped = 0

    for category, questions in GENERAL_QUESTIONS.items():
        for q in questions:
            question_text = q["question"]
            difficulty = q.get("difficulty", "medium")
            type_value = q.get("type", "AI_INTERVIEW").upper()

            # 중복 체크: question_text + job_post_id
            exists = db.query(InterviewQuestion).filter(
                InterviewQuestion.question_text == question_text,
                InterviewQuestion.job_post_id == job_post_id
            ).first()
            if exists:
                skipped += 1
                continue
            
            # enum 값으로 변환
            try:
                question_type = QuestionType(type_value)
            except ValueError:
                # 기본값으로 AI_INTERVIEW 사용
                question_type = QuestionType.AI_INTERVIEW
            
            db.add(InterviewQuestion(
                question_text=question_text,
                category=category,
                difficulty=difficulty,
                job_post_id=job_post_id,
                types=question_type
            ))
            inserted += 1
    db.commit()
    db.close()
    print(f"Inserted: {inserted}, Skipped(중복/기존): {skipped}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("사용법: python insert_general_questions.py <job_post_id>")
        sys.exit(1)
    job_post_id = int(sys.argv[1])
    insert_general_questions(job_post_id)