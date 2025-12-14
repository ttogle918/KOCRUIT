import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 현재 스크립트가 있는 디렉토리(backend)를 경로에 추가하여 app 모듈을 찾을 수 있게 함
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.core.database import SessionLocal, engine
from app.models.v2.document.application import Application, ApplicationStage, StageName
from app.models.v2.recruitment.job import JobPost
from app.models.v2.interview.interview_question import InterviewQuestion
from app.models.v2.auth.user import User

def debug_data():
    db = SessionLocal()
    try:
        print("=== Debugging Interview Data ===")
        
        # 1. Check Users
        user = db.query(User).first()
        if not user:
            print("❌ No Users found.")
            return
        print(f"✅ User found: {user.email} (ID: {user.id})")

        # 2. Check JobPosts
        job = db.query(JobPost).first()
        if not job:
            print("❌ No JobPosts found.")
            return
        print(f"✅ JobPost found: {job.title} (ID: {job.id})")

        # 3. Check Applications
        app = db.query(Application).first()
        if not app:
            print("❌ No Applications found.")
            return
        print(f"✅ Application found: ID {app.id} for User {app.user_id}")

        # 4. Check Stages
        stages = db.query(ApplicationStage).filter(ApplicationStage.application_id == app.id).all()
        if not stages:
            print(f"⚠️ No Stages found for Application {app.id}. Creating default stages...")
            # Create default stages if missing
            for stage_name in StageName:
                stage = ApplicationStage(
                    application_id=app.id,
                    stage_name=stage_name,
                    status="PENDING"
                )
                db.add(stage)
            db.commit()
            print("✅ Default stages created.")
            # Refresh app
            db.refresh(app)
        else:
            print(f"✅ Found {len(stages)} stages for Application {app.id}")
            for s in stages:
                print(f"   - {s.stage_name}: {s.status}")

        # 5. Check Properties
        print("\n=== Checking Application Properties ===")
        print(f"practical_interview_status: {app.practical_interview_status}")
        print(f"executive_interview_status: {app.executive_interview_status}")
        print(f"ai_interview_status: {app.ai_interview_status}")

        # 6. Check Interview Questions
        questions = db.query(InterviewQuestion).filter(
            (InterviewQuestion.application_id == app.id) | 
            (InterviewQuestion.job_post_id == app.job_post_id)
        ).all()
        
        if not questions:
            print(f"⚠️ No InterviewQuestions found for Application {app.id} or Job {app.job_post_id}. Creating default questions...")
            from app.models.v2.interview.interview_question import QuestionType
            
            sample_qs = [
                {"type": QuestionType.JOB, "text": "이 직무에 지원하게 된 구체적인 계기가 무엇인가요?", "cat": "motivation"},
                {"type": QuestionType.COMMON, "text": "우리 회사의 핵심 가치 중 가장 공감하는 것은 무엇입니까?", "cat": "culture"},
                {"type": QuestionType.PERSONAL, "text": "이력서에 언급된 프로젝트에서 가장 어려웠던 점은 무엇인가요?", "cat": "project"},
                {"type": QuestionType.EXECUTIVE, "text": "5년 후 본인의 모습을 어떻게 그리고 계신가요?", "cat": "vision"},
            ]
            
            for q_data in sample_qs:
                q = InterviewQuestion(
                    application_id=app.id,
                    job_post_id=app.job_post_id,
                    type=q_data["type"],
                    question_text=q_data["text"],
                    category=q_data["cat"],
                    difficulty="medium",
                    is_active=True
                )
                db.add(q)
            db.commit()
            print("✅ Default questions created.")
        else:
            print(f"✅ Found {len(questions)} InterviewQuestions.")
            for q in questions[:3]:
                print(f"   - [{q.type}] {q.question_text[:30]}...")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_data()

