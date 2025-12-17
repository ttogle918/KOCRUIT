from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.v2.test.written_test_answer import WrittenTestAnswer
from app.models.v2.test.written_test_question import WrittenTestQuestion
from app.models.v2.document.application import Application, StageStatus, StageName
from app.models.v2.recruitment.job import JobPost
from sqlalchemy import func
import datetime

def update_written_test_pass_status(db, jobpost_id):
    jobpost = db.query(JobPost).filter(JobPost.id == jobpost_id).first()
    headcount = jobpost.headcount if jobpost and jobpost.headcount else 1
    cutoff = headcount * 5
    apps = db.query(Application)\
        .filter(Application.job_post_id == jobpost_id)\
        .order_by(
            (Application.written_test_score == None).asc(),
            Application.written_test_score.desc()
        ).all()
    if not apps:
        return
    # cutoff 점수 구하기
    if len(apps) <= cutoff:
        cutoff_score = apps[-1].written_test_score
    else:
        cutoff_score = apps[cutoff-1].written_test_score
    for app in apps:
        if app.written_test_score is not None and app.written_test_score >= cutoff_score:
            update_stage_status(db, app.id, StageName.WRITTEN_TEST, StageStatus.PASSED)
        else:
            update_stage_status(db, app.id, StageName.WRITTEN_TEST, StageStatus.FAILED)
    db.commit()


def auto_grade_unscored_answers():
    start_time = datetime.datetime.now()
    print(f"[Auto Grader] 채점 시작: {start_time}")
    total_graded = 0
    while True:
        db: Session = SessionLocal()
        try:
            answers = db.query(WrittenTestAnswer).filter(
                WrittenTestAnswer.score == None,
                WrittenTestAnswer.feedback == None
            ).limit(10).all()
            if not answers:
                db.close()
                break
            # --- 기존 채점 로직 ---
            for answer in answers:
                question = db.query(WrittenTestQuestion).filter(WrittenTestQuestion.id == answer.question_id).first()
                if not answer.answer_text:
                    answer.score = 0
                    answer.feedback = '답변이 없어 피드백을 생성할 수 없습니다.'
                    continue
                if question:
                    result = grade_written_test_answer.invoke({
                        "question": question.question_text,
                        "answer": answer.answer_text
                    })
                    answer.score = result["score"]
                    answer.feedback = result["feedback"]
            db.commit()
            total_graded += len(answers)

            # --- 추가: 채점 후 application.written_test_score 즉시 업데이트 ---
            # (user_id, jobpost_id) 쌍 추출
            updated_pairs = set((a.user_id, a.jobpost_id) for a in answers)
            updated_jobpost_ids = set()
            for user_id, jobpost_id in updated_pairs:
                # 해당 지원자의 모든 답안이 채점 완료됐는지 확인
                total_answers = db.query(WrittenTestAnswer).filter(
                    WrittenTestAnswer.user_id == user_id,
                    WrittenTestAnswer.jobpost_id == jobpost_id
                ).count()
                graded_answers = db.query(WrittenTestAnswer).filter(
                    WrittenTestAnswer.user_id == user_id,
                    WrittenTestAnswer.jobpost_id == jobpost_id,
                    WrittenTestAnswer.score != None
                ).count()
                if total_answers > 0 and total_answers == graded_answers:
                    # 평균 점수 계산
                    avg_score = db.query(func.avg(WrittenTestAnswer.score)).filter(
                        WrittenTestAnswer.user_id == user_id,
                        WrittenTestAnswer.jobpost_id == jobpost_id
                    ).scalar()
                    # application 테이블에 반영
                    application = db.query(Application).filter(
                        Application.user_id == user_id,
                        Application.job_post_id == jobpost_id
                    ).first()
                    if application:
                        # 평균점수 소수점 둘째자리까지 반영
                        if avg_score is not None:
                            avg_score = round(float(avg_score), 2)
                        application.written_test_score = avg_score
                        db.commit()
                        print(f"[Auto Grader] 평균점수 반영: user_id={user_id}, jobpost_id={jobpost_id}, avg_score={avg_score}")
                        updated_jobpost_ids.add(jobpost_id)

            # --- 추가: 각 jobpost_id별로 상위 5배수만 PASSED 처리 ---
            for jobpost_id in updated_jobpost_ids:
                update_written_test_pass_status(db, jobpost_id)

            db.close()
        except Exception as e:
            db.rollback()
            db.close()
            print(f"[Auto Grader] 오류: {e}")
            break
    end_time = datetime.datetime.now()
    print(f"[Auto Grader] 채점 끝: {end_time} (소요: {end_time - start_time}, 총 {total_graded}개 채점)")

def start_written_test_auto_grader():
    scheduler = BackgroundScheduler()
    scheduler.add_job(auto_grade_unscored_answers, 'interval', minutes=3)
    scheduler.start()
    print("[Auto Grader] 필기 답안 자동 채점 스케줄러가 시작되었습니다.") 