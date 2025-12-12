from sqlalchemy.orm import Session
from typing import List
from app.models.notification import Notification
from app.models.auth.user import CompanyUser
from app.models.job import JobPost


class NotificationService:
    
    @staticmethod
    def create_team_member_notifications(
        db: Session, 
        job_post: JobPost, 
        team_members: List[dict], 
        creator_user_id: int,
        is_update: bool = False
    ) -> List[Notification]:
        """
        Create notifications for team members when they are added to a job post
        
        Args:
            db: Database session
            job_post: The job post object
            team_members: List of team member dictionaries with email and role
            creator_user_id: ID of the user who created/updated the job post
            is_update: Whether this is an update (True) or creation (False)
        
        Returns:
            List of created notifications
        """
        notifications = []
        
        for member in team_members:
            if not member.get('email') or not member.get('role'):
                continue
                
            # Find the company user by email
            company_user = db.query(CompanyUser).filter(
                CompanyUser.email == member['email'],
                CompanyUser.company_id == job_post.company_id
            ).first()
            
            if not company_user:
                continue
                
            # Skip if this is the creator of the job post
            if company_user.id == creator_user_id:
                continue
                
            # Create notification message
            if not is_update:
                message = f"[팀 편성 알림] {job_post.title} 공고의 채용팀에 편성되었습니다"
            else:
                action = "수정된"
                message = f"[팀 편성 알림] {job_post.title} 공고에 {action} 팀원으로 추가되었습니다. (역할: {member['role']})"
            url = f"http://localhost:5173/viewpost/{job_post.id}"

            try:
                # Check if notification already exists for this user and job post
                existing_notification = db.query(Notification).filter(
                    Notification.user_id == company_user.id,
                    Notification.type == "TEAM_MEMBER_ADDED",
                    Notification.message.like(f"%{job_post.title}%")
                ).first()

                if existing_notification:
                    # Update existing notification
                    existing_notification.message = message
                    existing_notification.is_read = False
                    existing_notification.url = url
                    notifications.append(existing_notification)
                else:
                    # Create new notification
                    notification = Notification(
                        message=message,
                        user_id=company_user.id,
                        type="TEAM_MEMBER_ADDED",
                        is_read=False,
                        url=url
                    )
                    db.add(notification)
                    notifications.append(notification)
            except Exception as e:
                import traceback
                print(f"[알림 생성 오류] {company_user.email}: {str(e)}")
                traceback.print_exc()
                continue
        
        db.commit()
        return notifications
    
    @staticmethod
    def remove_team_member_notifications(
        db: Session, 
        job_post_id: int, 
        removed_member_emails: List[str]
    ) -> int:
        """
        Remove notifications for team members who were removed from a job post
        
        Args:
            db: Database session
            job_post_id: ID of the job post
            removed_member_emails: List of email addresses of removed members
        
        Returns:
            Number of notifications removed
        """
        if not removed_member_emails:
            return 0
            
        # Find company users by email
        company_users = db.query(CompanyUser).filter(
            CompanyUser.email.in_(removed_member_emails)
        ).all()
        
        if not company_users:
            return 0
            
        user_ids = [user.id for user in company_users]
        
        # Remove notifications for these users related to this job post
        deleted_count = db.query(Notification).filter(
            Notification.user_id.in_(user_ids),
            Notification.type == "TEAM_MEMBER_ADDED"
        ).delete()
        
        db.commit()
        return deleted_count 

    @staticmethod
    def create_reminder_notification(db: Session, user_id: int, message: str):
        """
        Create a reminder notification for an interviewer.
        """
        from app.models.notification import Notification
        notification = Notification(
            message=message,
            user_id=user_id,
            type="INTERVIEW_REMINDER",
            is_read=False
        )
        db.add(notification)
        db.flush()
        return notification 