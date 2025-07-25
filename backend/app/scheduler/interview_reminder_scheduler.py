import logging
from datetime import datetime, timedelta, time
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone
from app.core.database import SessionLocal
from app.models.schedule import Schedule, InterviewScheduleStatus
from app.models.job import JobPost
from app.services.notification_service import NotificationService
from app.models.interview_panel import InterviewPanelAssignment, InterviewPanelMember
from app.models.user import CompanyUser

logger = logging.getLogger(__name__)

REMINDER_TYPE = "INTERVIEW_REMINDER"
KST = timezone('Asia/Seoul')

def send_interview_reminders():
    db: Session = SessionLocal()
    try:
        tomorrow = (datetime.now(KST) + timedelta(days=1)).date()
        start_dt = KST.localize(datetime.combine(tomorrow, time.min))
        end_dt = KST.localize(datetime.combine(tomorrow, time.max))

        # 1. schedule에서 interview type + 다음날 일정 찾기
        schedules = db.query(Schedule).filter(
            Schedule.schedule_type == 'interview',
            Schedule.scheduled_at >= start_dt,
            Schedule.scheduled_at <= end_dt
        ).all()
        logger.info(f"[Interview Reminder] Found {len(schedules)} interview schedules for {tomorrow}")

        for schedule in schedules:
            # 2. interview_panel_assignment에서 schedule_id 매칭
            assignments = db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.schedule_id == schedule.id
            ).all()
            for assignment in assignments:
                # 3. interview_panel_member에서 assignment_id 매칭
                members = db.query(InterviewPanelMember).filter(
                    InterviewPanelMember.assignment_id == assignment.id
                ).all()
                for member in members:
                    # 4. 각 member의 company_user_id에게 알림
                    interviewer = db.query(CompanyUser).filter(CompanyUser.id == member.company_user_id).first()
                    if not interviewer:
                        continue
                    # 5. 중복 알림 방지: user_id+schedule_id 조합
                    from app.models.notification import Notification
                    existing = db.query(Notification).filter(
                        Notification.user_id == interviewer.id,
                        Notification.type == REMINDER_TYPE,
                        Notification.message.like(f"%{schedule.title if schedule else ''}%"),
                        Notification.message.like(f"%ScheduleID:{schedule.id}%"),
                        Notification.is_read == False
                    ).first()
                    if existing:
                        continue  # Already sent
                    job_post = db.query(JobPost).filter(JobPost.id == schedule.job_post_id).first() if schedule else None
                    job_title = job_post.title if job_post else "면접"
                    kst_interview_time = schedule.scheduled_at.astimezone(KST)
                    # ScheduleID를 메시지에 숨겨서 중복 방지
                    message = f"[면접 일정 알림] '{job_title}' 면접이 내일({kst_interview_time.strftime('%Y-%m-%d %H:%M')}) 예정되어 있습니다. 준비를 부탁드립니다. [ScheduleID:{schedule.id}]"
                    NotificationService.create_reminder_notification(db, interviewer.id, message)
                    logger.info(f"[Interview Reminder] Sent reminder to user {interviewer.id} for schedule {schedule.id}")
        db.commit()
    except Exception as e:
        logger.error(f"[Interview Reminder] Error: {e}")
    finally:
        db.close()

def start_interview_reminder_scheduler():
    scheduler = BackgroundScheduler(timezone=KST)
    scheduler.add_job(send_interview_reminders, 'cron', hour=9, minute=0)  # Every day at 9am KST
    # 서버 시작 시 즉시 한 번 실행
    send_interview_reminders()
    scheduler.start()
    logger.info("[Interview Reminder] Interview reminder scheduler started.") 