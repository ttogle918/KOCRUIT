from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from app.models.v2.interview_panel import (
    InterviewPanelAssignment, 
    InterviewPanelMember, 
    InterviewPanelRequest,
    AssignmentStatus, 
    RequestStatus,
    PanelRole,
    AssignmentType
)
from app.models.v2.document.application import Application, StageStatus, StageName
from app.models.v2.document.schedule import Schedule
from app.models.v2.interview_question import InterviewQuestion
from app.models.v2.recruitment.job import JobPost
from app.models.v2.document.resume import Resume
from app.models.v2.auth.user import User, CompanyUser
from app.schemas.interview_panel import (
    InterviewPanelAssignmentCreate,
    InterviewPanelRequestCreate,
    InterviewerResponse,
    InterviewPanelAssignmentResponse,
    InterviewPanelRequestResponse,
    InterviewPanelMemberResponse,
    InterviewerSelectionCriteria

)
from app.models.v2.auth.company import Department
from app.models.v2.recruitment.job import JobPost
from app.models.v2.common.notification import Notification
from app.models.v2.document.schedule import Schedule
from app.services.v2.interview.interviewer_profile_service import InterviewerProfileService
import random


class InterviewPanelService:
    
    @staticmethod
    def select_interviewers(db: Session, criteria: InterviewerSelectionCriteria, use_ai_balance: bool = True) -> dict:
        """
        Select interviewers based on criteria:
        - 2 from same department as job post
        - 1 from HR department
        
        Excludes users who are already assigned to any interview panel for this job post
        
        Args:
            use_ai_balance: AI 기반 밸런스 편성 사용 여부 (기본값: True)
        
        Returns:
            Dictionary containing selected interviewers and detailed matching information
        """
        # Get job post details
        job_post = db.query(JobPost).filter(JobPost.id == criteria.job_post_id).first()
        if not job_post:
            raise ValueError("Job post not found")
        
        # Get company and department info
        company_id = job_post.company_id
        department_id = job_post.department_id
        
        # Valid ranks for interviewers
        valid_ranks = ['senior_associate', 'team_lead', 'manager', 'senior_manager']
        
        # Find HR department
        hr_department = db.query(Department).filter(
            and_(
                Department.company_id == company_id,
                Department.name.ilike('%인사%')
            )
        ).first()
        
        if not hr_department:
            raise ValueError("HR department not found")
        
        # Find users already assigned to any interview panel for this schedule (not job_post-wide)
        assigned_user_ids = db.query(InterviewPanelRequest.company_user_id).filter(
            InterviewPanelRequest.assignment_id.in_(
                db.query(InterviewPanelAssignment.id).filter(
                    InterviewPanelAssignment.schedule_id == criteria.schedule_id
                )
            )
        ).all()
        assigned_user_ids = [user_id[0] for user_id in assigned_user_ids]
        
        # Also include users who are already panel members for this schedule
        panel_member_ids = db.query(InterviewPanelMember.company_user_id).filter(
            InterviewPanelMember.assignment_id.in_(
                db.query(InterviewPanelAssignment.id).filter(
                    InterviewPanelAssignment.schedule_id == criteria.schedule_id
                )
            )
        ).all()
        panel_member_ids = [user_id[0] for user_id in panel_member_ids]
        
        # Combine all excluded user IDs (for this schedule only)
        excluded_user_ids = list(set(assigned_user_ids + panel_member_ids))
        
        # Select same department interviewers (excluding already assigned users)
        same_dept_all_candidates = db.query(CompanyUser).filter(
            and_(
                CompanyUser.company_id == company_id,
                CompanyUser.department_id == department_id,
                CompanyUser.ranks.in_(valid_ranks),
                CompanyUser.id != job_post.user_id,  # Exclude job post creator
                ~CompanyUser.id.in_(excluded_user_ids)  # Exclude already assigned users for this schedule
            )
        ).all()
        
        # Select HR department interviewers (excluding already assigned users)
        hr_all_candidates = db.query(CompanyUser).filter(
            and_(
                CompanyUser.company_id == company_id,
                CompanyUser.department_id == hr_department.id,
                CompanyUser.ranks.in_(valid_ranks),
                ~CompanyUser.id.in_(excluded_user_ids)  # Exclude already assigned users for this schedule
            )
        ).all()
        
        # Initialize matching info
        matching_info = {
            'algorithm_used': 'RANDOM',
            'balance_score': 0.0,
            'balance_factors': {},
            'individual_profiles': {},
            'team_composition_reason': '기본 랜덤 선택',
            'ai_recommendation_available': False
        }
        
        # AI 기반 밸런스 편성 사용
        if use_ai_balance and len(same_dept_all_candidates) >= criteria.same_department_count and len(hr_all_candidates) >= criteria.hr_department_count:
            try:
                # 같은 부서에서 AI 추천
                same_dept_ids = [u.id for u in same_dept_all_candidates]
                recommended_same_dept_ids, same_dept_balance_score = InterviewerProfileService.get_balanced_panel_recommendation(
                    db, same_dept_ids, criteria.same_department_count
                )
                same_dept_candidates = [u for u in same_dept_all_candidates if u.id in recommended_same_dept_ids]
                
                # HR 부서에서 AI 추천 (단일 선택이므로 경험치 우선)
                hr_ids = [u.id for u in hr_all_candidates]
                recommended_hr_ids, hr_balance_score = InterviewerProfileService.get_balanced_panel_recommendation(
                    db, hr_ids, criteria.hr_department_count
                )
                hr_candidates = [u for u in hr_all_candidates if u.id in recommended_hr_ids]
                
                print(f"[AI Panel Selection] Same dept balance score: {same_dept_balance_score}, HR balance score: {hr_balance_score}")
                
                # AI 매칭 정보 업데이트
                matching_info.update({
                    'algorithm_used': 'AI_BASED',
                    'balance_score': round((same_dept_balance_score + hr_balance_score) / 2, 2),
                    'ai_recommendation_available': True
                })
                
                # 개별 면접관 프로필 정보 수집
                all_selected_candidates = same_dept_candidates + hr_candidates
                for candidate in all_selected_candidates:
                    profile_info = InterviewerProfileService.get_interviewer_characteristics(db, candidate.id)
                    matching_info['individual_profiles'][str(candidate.id)] = {
                        'user_name': candidate.name,
                        'user_email': candidate.email,
                        'strictness_score': profile_info.get('strictness_score', 50),
                        'consistency_score': profile_info.get('consistency_score', 50),
                        'tech_focus_score': profile_info.get('tech_focus_score', 50),
                        'personality_focus_score': profile_info.get('personality_focus_score', 50),
                        'experience_score': profile_info.get('experience_score', 50),
                        'confidence': profile_info.get('confidence', 0),
                        'characteristics': profile_info.get('characteristics', [])
                    }
                
                # 밸런스 요인 계산
                if len(all_selected_candidates) > 1:
                    strictness_scores = [matching_info['individual_profiles'][str(c.id)]['strictness_score'] for c in all_selected_candidates]
                    tech_scores = [matching_info['individual_profiles'][str(c.id)]['tech_focus_score'] for c in all_selected_candidates]
                    experience_scores = [matching_info['individual_profiles'][str(c.id)]['experience_score'] for c in all_selected_candidates]
                    consistency_scores = [matching_info['individual_profiles'][str(c.id)]['consistency_score'] for c in all_selected_candidates]
                    
                    import statistics
                    matching_info['balance_factors'] = {
                        'strictness_balance': round(100 - statistics.variance(strictness_scores) if len(strictness_scores) > 1 else 100, 1),
                        'tech_coverage': round(max(tech_scores), 1),
                        'experience_avg': round(statistics.mean(experience_scores), 1),
                        'consistency_avg': round(statistics.mean(consistency_scores), 1)
                    }
                    
                    # 팀 구성 이유 생성
                    avg_strictness = statistics.mean(strictness_scores)
                    avg_tech = statistics.mean(tech_scores) 
                    avg_experience = statistics.mean(experience_scores)
                    
                    if avg_strictness > 70:
                        strictness_desc = "높은 엄격도"
                    elif avg_strictness < 30:
                        strictness_desc = "관대한 평가"
                    else:
                        strictness_desc = "균형잡힌 엄격도"
                    
                    if avg_tech > 70:
                        tech_desc = "기술 중심"
                    elif avg_tech < 30:
                        tech_desc = "인성 중심"
                    else:
                        tech_desc = "기술-인성 균형"
                    
                    if avg_experience > 70:
                        experience_desc = "풍부한 경험"
                    elif avg_experience < 30:
                        experience_desc = "신규 면접관"
                    else:
                        experience_desc = "적절한 경험"
                    
                    matching_info['team_composition_reason'] = f"{strictness_desc}, {tech_desc}, {experience_desc}의 조합"
                
            except Exception as e:
                print(f"[AI Panel Selection] AI 추천 실패, 기존 방식 사용: {str(e)}")
                use_ai_balance = False
        else:
            use_ai_balance = False
        
        # AI 추천 실패 시 기존 랜덤 방식 사용
        if not use_ai_balance:
            # 공고별 고정 시드로 셔플
            same_dept_seed = int(str(company_id) + str(department_id) + str(criteria.job_post_id))
            rng = random.Random(same_dept_seed)
            rng.shuffle(same_dept_all_candidates)
            # 후보가 부족하면 순환(rotate)
            if len(same_dept_all_candidates) < criteria.same_department_count:
                times = (criteria.same_department_count + len(same_dept_all_candidates) - 1) // max(1, len(same_dept_all_candidates))
                same_dept_candidates = (same_dept_all_candidates * times)[:criteria.same_department_count]
            else:
                same_dept_candidates = same_dept_all_candidates[:criteria.same_department_count]

            hr_seed = int(str(company_id) + str(hr_department.id) + str(criteria.job_post_id))
            rng_hr = random.Random(hr_seed)
            rng_hr.shuffle(hr_all_candidates)
            if len(hr_all_candidates) < criteria.hr_department_count:
                times = (criteria.hr_department_count + len(hr_all_candidates) - 1) // max(1, len(hr_all_candidates))
                hr_candidates = (hr_all_candidates * times)[:criteria.hr_department_count]
            else:
                hr_candidates = hr_all_candidates[:criteria.hr_department_count]
            
            # 랜덤 선택 시에도 기본 프로필 정보 수집
            all_selected_candidates = same_dept_candidates + hr_candidates
            for candidate in all_selected_candidates:
                try:
                    profile_info = InterviewerProfileService.get_interviewer_characteristics(db, candidate.id)
                    matching_info['individual_profiles'][str(candidate.id)] = {
                        'user_name': candidate.name,
                        'user_email': candidate.email,
                        'strictness_score': profile_info.get('strictness_score', 50),
                        'consistency_score': profile_info.get('consistency_score', 50),
                        'tech_focus_score': profile_info.get('tech_focus_score', 50),
                        'personality_focus_score': profile_info.get('personality_focus_score', 50),
                        'experience_score': profile_info.get('experience_score', 50),
                        'confidence': profile_info.get('confidence', 0),
                        'characteristics': profile_info.get('characteristics', [])
                    }
                except:
                    # 프로필 정보가 없으면 기본값 사용
                    matching_info['individual_profiles'][str(candidate.id)] = {
                        'user_name': candidate.name,
                        'user_email': candidate.email,
                        'strictness_score': 50,
                        'consistency_score': 50,
                        'tech_focus_score': 50,
                        'personality_focus_score': 50,
                        'experience_score': 50,
                        'confidence': 0,
                        'characteristics': ['신규 면접관']
                    }
            
            matching_info['team_composition_reason'] = '랜덤 선택 (프로필 데이터 부족)'

        return {
            'same_department': same_dept_candidates,
            'hr_department': hr_candidates,
            'job_post': job_post,
            'hr_department_info': hr_department,
            'matching_info': matching_info
        }
    
    @staticmethod
    def create_panel_assignments(db: Session, criteria: InterviewerSelectionCriteria) -> List[InterviewPanelAssignment]:
        """Create panel assignments and send notifications to selected interviewers"""
        
        # Select interviewers
        selection_result = InterviewPanelService.select_interviewers(db, criteria)
        
        assignments = []
        
        # Create assignment for same department interviewers
        if selection_result['same_department']:
            same_dept_assignment = InterviewPanelAssignment(
                job_post_id=criteria.job_post_id,
                schedule_id=criteria.schedule_id,
                assignment_type=AssignmentType.SAME_DEPARTMENT,
                required_count=criteria.same_department_count  # 요청된 인원수 (보통 2명)
            )
            db.add(same_dept_assignment)
            db.flush()  # Get the ID
            print(f"📝 Created SAME_DEPARTMENT assignment {same_dept_assignment.id}: required_count={criteria.same_department_count}, selected={len(selection_result['same_department'])}")
            
            # Create requests for each interviewer
            for interviewer in selection_result['same_department']:
                # Only check for duplicates if there are already requests for this assignment
                existing_any = db.query(InterviewPanelRequest).filter(
                    InterviewPanelRequest.assignment_id == same_dept_assignment.id
                ).first()
                if existing_any:
                    existing_request = db.query(InterviewPanelRequest).filter(
                        InterviewPanelRequest.assignment_id == same_dept_assignment.id,
                        InterviewPanelRequest.company_user_id == interviewer.id,
                        InterviewPanelRequest.status == RequestStatus.PENDING
                    ).first()
                    if existing_request:
                        continue  # Skip duplicate
                notification = InterviewPanelService._create_notification(
                    db, interviewer, criteria.job_post_id, "SAME_DEPARTMENT"
                )
                
                request = InterviewPanelRequest(
                    assignment_id=same_dept_assignment.id,
                    company_user_id=interviewer.id,
                    notification_id=notification.id if notification else None
                )
                db.add(request)
            
            assignments.append(same_dept_assignment)
        
        # Create assignment for HR department interviewers
        if selection_result['hr_department']:
            hr_assignment = InterviewPanelAssignment(
                job_post_id=criteria.job_post_id,
                schedule_id=criteria.schedule_id,
                assignment_type=AssignmentType.HR_DEPARTMENT,
                required_count=criteria.hr_department_count  # 요청된 인원수 (보통 1명)
            )
            db.add(hr_assignment)
            db.flush()  # Get the ID
            print(f"📝 Created HR_DEPARTMENT assignment {hr_assignment.id}: required_count={criteria.hr_department_count}, selected={len(selection_result['hr_department'])}")
            
            # Create requests for each interviewer
            for interviewer in selection_result['hr_department']:
                # Only check for duplicates if there are already requests for this assignment
                existing_any = db.query(InterviewPanelRequest).filter(
                    InterviewPanelRequest.assignment_id == hr_assignment.id
                ).first()
                if existing_any:
                    existing_request = db.query(InterviewPanelRequest).filter(
                        InterviewPanelRequest.assignment_id == hr_assignment.id,
                        InterviewPanelRequest.company_user_id == interviewer.id,
                        InterviewPanelRequest.status == RequestStatus.PENDING
                    ).first()
                    if existing_request:
                        continue  # Skip duplicate
                notification = InterviewPanelService._create_notification(
                    db, interviewer, criteria.job_post_id, "HR_DEPARTMENT"
                )
                
                request = InterviewPanelRequest(
                    assignment_id=hr_assignment.id,
                    company_user_id=interviewer.id,
                    notification_id=notification.id if notification else None
                )
                db.add(request)
            
            assignments.append(hr_assignment)
        
        db.commit()
        return assignments
    
    @staticmethod
    def _create_notification(db: Session, interviewer: CompanyUser, job_post_id: int, assignment_type: str) -> Optional[Notification]:
        """Create notification for interviewer"""
        job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
        if not job_post:
            return None
        
        # Custom message and type based on assignment_type
        if assignment_type == "SAME_DEPARTMENT":
            message = f"[면접관 요청] {job_post.title} 공고의 면접관으로 선정되었습니다. (같은부서)"
            notif_type = "INTERVIEW_PANEL_REQUEST"
        elif assignment_type == "HR_DEPARTMENT":
            message = f"[면접관 요청] {job_post.title} 공고의 면접관으로 선정되었습니다. (인사팀)"
            notif_type = "INTERVIEW_PANEL_REQUEST"
        else:
            message = f"[채용팀 추가] {job_post.title} 공고의 채용팀에 편성되었습니다"
            notif_type = "NOTIFICATION"
        notification = Notification(
            message=message,
            user_id=interviewer.id,
            type=notif_type,
            is_read=False
        )
        db.add(notification)
        db.flush()
        return notification
    
    @staticmethod
    def respond_to_request(db: Session, request_id: int, response: InterviewerResponse) -> dict:
        """Handle interviewer response (accept/reject)"""
        
        request = db.query(InterviewPanelRequest).filter(InterviewPanelRequest.id == request_id).first()
        if not request:
            raise ValueError("Interview panel request not found")
        
        if request.status != RequestStatus.PENDING:
            raise ValueError("Request has already been responded to")
        
        # Update request status
        old_status = request.status.value
        request.status = response.status
        request.response_at = datetime.utcnow()
        
        print(f"👤 Interviewer response processed:")
        print(f"  - Request ID: {request_id}")
        print(f"  - User ID: {request.company_user_id}")
        print(f"  - Assignment ID: {request.assignment_id}")
        print(f"  - Status: {old_status} → {response.status.value}")
        
        if response.status == RequestStatus.ACCEPTED:
            # Add to panel members
            member = InterviewPanelMember(
                assignment_id=request.assignment_id,
                company_user_id=request.company_user_id,
                role=PanelRole.INTERVIEWER
            )
            db.add(member)
            db.flush()  # DB에 즉시 반영하여 count 확인 시 포함되도록 함
            print(f"✅ Added user {request.company_user_id} to panel members for assignment {request.assignment_id}")
            
            # Check if assignment is complete
            InterviewPanelService._check_assignment_completion(db, request.assignment_id)
        elif response.status == RequestStatus.REJECTED:
            print(f"❌ User {request.company_user_id} rejected assignment {request.assignment_id}")
            # Find replacement interviewer
            InterviewPanelService._find_replacement(db, request)
        
        db.commit()
        
        return {
            "request_id": request_id,
            "status": response.status,
            "message": "Response processed successfully"
        }
    
    @staticmethod
    def _check_assignment_completion(db: Session, assignment_id: int):
        """Check if assignment has enough accepted members"""
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == assignment_id
        ).first()
        
        if not assignment:
            print(f"❌ Assignment {assignment_id} not found")
            return
        
        # 현재 수락한 멤버 수 확인
        accepted_count = db.query(InterviewPanelMember).filter(
            InterviewPanelMember.assignment_id == assignment_id
        ).count()
        
        print(f"📊 Assignment {assignment_id} completion check:")
        print(f"  - Assignment Type: {assignment.assignment_type.value}")
        print(f"  - Required Count: {assignment.required_count}")
        print(f"  - Accepted Count: {accepted_count}")
        print(f"  - Current Status: {assignment.status.value}")
        
        if accepted_count >= assignment.required_count:
            old_status = assignment.status.value
            assignment.status = AssignmentStatus.COMPLETED
            print(f"✅ Assignment {assignment_id} status updated: {old_status} → COMPLETED")
            
            # 🆕 면접관 수락 완료 후 자동으로 면접 일정 생성 및 interview_status 변경
            InterviewPanelService._create_interview_schedules(db, assignment)
        else:
            remaining = assignment.required_count - accepted_count
            print(f"⏳ Assignment {assignment_id} still needs {remaining} more accepted members")
    
    @staticmethod
    def _create_interview_schedules(db: Session, assignment: InterviewPanelAssignment):
        """면접관 수락 완료 후 자동으로 면접 일정 생성"""
        from app.models.v2.document.schedule import ScheduleInterview, InterviewScheduleStatus
        from app.models.v2.document.application import Application, DocumentStatus, InterviewStatus
        
        # 해당 공고의 서류 합격자들 조회
        applications = db.query(Application).filter(
            Application.job_post_id == assignment.job_post_id,
            Application.document_status == DocumentStatus.PASSED.value
        ).all()
        
        if not applications:
            return
        
        # 면접관 멤버들 조회
        panel_members = db.query(InterviewPanelMember).filter(
            InterviewPanelMember.assignment_id == assignment.id
        ).all()
        
        if not panel_members:
            return
        
        # 면접 일정 정보 조회
        schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
        if not schedule or not schedule.scheduled_at:
            return
        
        # 🆕 schedule_interview_applicant 테이블 연결을 위한 로직
        InterviewPanelService._link_applicants_to_existing_schedules(db, assignment.job_post_id, applications)
        
        # 각 지원자에 대해 면접 일정 생성
        for i, application in enumerate(applications):
            # 면접관 순환 배정 (라운드 로빈 방식)
            interviewer_index = i % len(panel_members)
            interviewer = panel_members[interviewer_index]
            
            # 면접 시간 계산 (30분 간격으로 배정)
            interview_time = schedule.scheduled_at
            if i > 0:
                # 30분씩 추가
                from datetime import timedelta
                interview_time = interview_time + timedelta(minutes=30 * i)
            
            # ScheduleInterview 레코드 생성
            schedule_interview = ScheduleInterview(
                schedule_id=assignment.schedule_id,
                user_id=interviewer.company_user_id,  # 면접관 ID
                schedule_date=interview_time,
                status=InterviewScheduleStatus.SCHEDULED
            )
            db.add(schedule_interview)
            
            # Application의 ai_interview_status를 AI 면접 일정 확정으로 변경
            # application.ai_interview_status = InterviewStatus.SCHEDULED <- 대체
            from app.models.v2.document.application import StageName, StageStatus
            from app.services.v2.application.application_service import update_stage_status
            update_stage_status(db, application.id, StageName.AI_INTERVIEW, StageStatus.SCHEDULED)
        
        # 변경사항 저장
        db.flush()
        
        print(f"✅ 면접 일정 자동 생성 완료: {len(applications)}명의 지원자, {len(panel_members)}명의 면접관")
        
        # 🆕 면접 일정 생성 완료 후 자동으로 개별 질문 생성
        try:
            from app.services.v2.interview.interview_question_service import InterviewQuestionService
            
            # 공고 정보 조회
            job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
            if job_post:
                company_name = job_post.company.name if job_post.company else ""
                from app.api.v2.interview.interview_question import parse_job_post_data
                job_info = parse_job_post_data(job_post)
                
                # 각 지원자에 대해 개별 질문 생성
                for application in applications:
                    try:
                        # 이미 질문이 생성되어 있는지 확인
                        existing_questions = db.query(InterviewQuestion).filter(
                            InterviewQuestion.application_id == application.id
                        ).count()
                        
                        if existing_questions == 0:
                            # 개별 질문 생성
                            questions = InterviewQuestionService.generate_individual_questions_for_applicant(
                                db=db,
                                application_id=application.id,
                                job_info=job_info,
                                company_name=company_name
                            )
                            print(f"✅ 지원자 {application.id}에 대해 {len(questions)}개 질문 생성 완료")
                        else:
                            print(f"ℹ️ 지원자 {application.id}는 이미 질문이 생성되어 있음")
                            
                    except Exception as e:
                        print(f"❌ 지원자 {application.id} 질문 생성 실패: {e}")
                        
        except Exception as e:
            print(f"❌ 자동 질문 생성 중 오류: {e}")
            # 질문 생성 실패해도 면접 일정 생성은 성공으로 처리
    
    @staticmethod
    def _link_applicants_to_existing_schedules(db: Session, job_post_id: int, applications: List[Application]):
        """33명의 합격자를 기존 면접 일정과 자동으로 연결"""
        from sqlalchemy import Table, MetaData, text
        
        # schedule_interview_applicant 테이블 동적 로드
        meta = MetaData()
        schedule_interview_applicant = Table('schedule_interview_applicant', meta, autoload_with=db.bind)
        
        # 해당 공고의 기존 면접 일정 조회
        existing_schedules = db.query(Schedule).filter(
            Schedule.job_post_id == job_post_id,
            Schedule.schedule_type == 'interview'
        ).order_by(Schedule.scheduled_at).all()
        
        # 🆕 3명씩 면접하기 위한 일정 수 계산
        total_applicants = len(applications)  # 33명
        applicants_per_interview = 3  # 3명씩
        required_schedules = (total_applicants + applicants_per_interview - 1) // applicants_per_interview  # 11개 일정 필요
        
        print(f"📊 면접 일정 분석:")
        print(f"   - 총 지원자: {total_applicants}명")
        print(f"   - 면접당 지원자: {applicants_per_interview}명")
        print(f"   - 필요 일정: {required_schedules}개")
        print(f"   - 기존 일정: {len(existing_schedules)}개")
        
        # 🆕 추가 일정이 필요한 경우 자동 생성
        if len(existing_schedules) < required_schedules:
            additional_schedules_needed = required_schedules - len(existing_schedules)
            print(f"🆕 추가 일정 {additional_schedules_needed}개를 자동 생성합니다...")
            
            # 마지막 기존 일정의 정보를 기반으로 추가 일정 생성
            if existing_schedules:
                last_schedule = existing_schedules[-1]
                base_datetime = last_schedule.scheduled_at
                base_location = last_schedule.location
            else:
                # 기존 일정이 없는 경우 기본값 사용
                from datetime import datetime, timedelta
                base_datetime = datetime.now() + timedelta(days=1)
                base_location = "회의실"
            
            # 추가 일정 생성
            for i in range(additional_schedules_needed):
                from datetime import timedelta
                
                # 다음 날 같은 시간으로 일정 생성
                new_datetime = base_datetime + timedelta(days=i+1)
                
                # 새로운 Schedule 생성
                new_schedule = Schedule(
                    schedule_type="interview",
                    user_id=last_schedule.user_id if existing_schedules else 1,  # 기본값
                    job_post_id=job_post_id,
                    title=last_schedule.title if existing_schedules else "면접 일정",
                    description="",
                    location=base_location,
                    scheduled_at=new_datetime,
                    status=""
                )
                db.add(new_schedule)
                db.flush()  # ID 생성
                
                # ScheduleInterview 레코드도 생성
                new_schedule_interview = ScheduleInterview(
                    schedule_id=new_schedule.id,
                    user_id=last_schedule.user_id if existing_schedules else 1,
                    schedule_date=new_datetime,
                    status=InterviewScheduleStatus.SCHEDULED
                )
                db.add(new_schedule_interview)
                
                print(f"   ✅ 추가 일정 생성: {new_datetime.strftime('%Y-%m-%d %H:%M')} - {base_location}")
            
            # 기존 일정 목록 업데이트
            existing_schedules = db.query(Schedule).filter(
                Schedule.job_post_id == job_post_id,
                Schedule.schedule_type == 'interview'
            ).order_by(Schedule.scheduled_at).all()
        
        # 지원자들을 면접 일정에 3명씩 배정
        applicants_per_schedule = applicants_per_interview  # 3명씩
        applicant_index = 0
        
        for schedule_index, schedule in enumerate(existing_schedules):
            # 이 일정에 배정할 지원자 수 (최대 3명)
            current_batch_size = min(applicants_per_schedule, len(applications) - applicant_index)
            
            if current_batch_size <= 0:
                break
            
            # 해당 일정의 schedule_interview 레코드 조회
            schedule_interviews = db.query(ScheduleInterview).filter(
                ScheduleInterview.schedule_id == schedule.id
            ).all()
            
            if not schedule_interviews:
                print(f"⚠️ 일정 {schedule.id}에 대한 schedule_interview 레코드가 없습니다.")
                continue
            
            # 이 배치의 지원자들을 schedule_interview_applicant에 연결
            for i in range(current_batch_size):
                if applicant_index >= len(applications):
                    break
                
                application = applications[applicant_index]
                
                # 면접관 순환 배정 (라운드 로빈)
                interviewer_index = i % len(schedule_interviews)
                schedule_interview = schedule_interviews[interviewer_index]
                
                # schedule_interview_applicant 테이블에 레코드 생성
                try:
                    # 🆕 interview_status 필드도 함께 설정
                    insert_values = {
                        'schedule_interview_id': schedule_interview.id,
                        'user_id': application.user_id,
                        'interview_status': StageStatus.SCHEDULED.value  # AI 면접 일정 확정
                    }
                    
                    db.execute(
                        schedule_interview_applicant.insert().values(**insert_values)
                    )
                    
                    # Application의 ai_interview_status를 AI 면접 일정 확정으로 변경
                    # application.ai_interview_status = InterviewStatus.SCHEDULED <- 제거
                    from app.services.v2.application.application_service import update_stage_status
                    update_stage_status(db, application.id, StageName.AI_INTERVIEW, StageStatus.SCHEDULED)
                    
                    print(f"✅ 지원자 {application.user_id}를 면접 일정 {schedule_interview.id}에 연결 (일정 {schedule_index + 1})")
                    
                except Exception as e:
                    print(f"❌ 지원자 {application.user_id} 연결 실패: {e}")
                    # 필드가 없는 경우 기존 방식으로 시도
                    try:
                        db.execute(
                            schedule_interview_applicant.insert().values(
                                schedule_interview_id=schedule_interview.id,
                                user_id=application.user_id
                            )
                        )
                        application.ai_interview_status = InterviewStatus.SCHEDULED
                        print(f"✅ 지원자 {application.user_id} 연결 성공 (기존 방식)")
                    except Exception as e2:
                        print(f"❌ 지원자 {application.user_id} 연결 완전 실패: {e2}")
                
                applicant_index += 1
        
        # 변경사항 저장
        db.flush()
        
        print(f"🎉 {len(applications)}명의 지원자를 {len(existing_schedules)}개 면접 일정에 3명씩 자동 배정 완료!")
        print(f"📅 면접 일정: {existing_schedules[0].scheduled_at.strftime('%Y-%m-%d')} ~ {existing_schedules[-1].scheduled_at.strftime('%Y-%m-%d')}")
    
    @staticmethod
    def _find_replacement(db: Session, rejected_request: InterviewPanelRequest):
        """Find replacement interviewer for rejected request"""
        assignment = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.id == rejected_request.assignment_id
        ).first()
        
        if not assignment:
            return
        
        job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
        if not job_post:
            return
        
        # Get company and valid ranks
        company_id = job_post.company_id
        valid_ranks = ['senior_associate', 'team_lead', 'manager', 'senior_manager']
        
        # Find already requested users to exclude them
        requested_user_ids = db.query(InterviewPanelRequest.company_user_id).filter(
            InterviewPanelRequest.assignment_id == assignment.id
        ).all()
        requested_user_ids = [user_id[0] for user_id in requested_user_ids]
        
        if assignment.assignment_type == AssignmentType.SAME_DEPARTMENT:
            # Find replacement from same department
            replacement = db.query(CompanyUser).filter(
                and_(
                    CompanyUser.company_id == company_id,
                    CompanyUser.department_id == job_post.department_id,
                    CompanyUser.ranks.in_(valid_ranks),
                    CompanyUser.id != job_post.user_id,
                    ~CompanyUser.id.in_(requested_user_ids)
                )
            ).first()
        else:
            # Find replacement from HR department
            hr_department = db.query(Department).filter(
                and_(
                    Department.company_id == company_id,
                    Department.name.ilike('%인사%')
                )
            ).first()
            
            if not hr_department:
                return
            
            replacement = db.query(CompanyUser).filter(
                and_(
                    CompanyUser.company_id == company_id,
                    CompanyUser.department_id == hr_department.id,
                    CompanyUser.ranks.in_(valid_ranks),
                    ~CompanyUser.id.in_(requested_user_ids)
                )
            ).first()
        
        if replacement:
            # Create new request for replacement
            notification = InterviewPanelService._create_notification(
                db, replacement, assignment.job_post_id, assignment.assignment_type.value
            )
            
            new_request = InterviewPanelRequest(
                assignment_id=assignment.id,
                company_user_id=replacement.id,
                notification_id=notification.id if notification else None
            )
            db.add(new_request)
    
    @staticmethod
    def get_user_pending_requests(db: Session, user_id: int) -> List[dict]:
        """Get pending interview panel requests for a user"""
        requests = db.query(InterviewPanelRequest).filter(
            and_(
                InterviewPanelRequest.company_user_id == user_id,
                InterviewPanelRequest.status == RequestStatus.PENDING
            )
        ).all()
        
        result = []
        for request in requests:
            assignment = db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.id == request.assignment_id
            ).first()
            
            if assignment:
                job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
                schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
                
                result.append({
                    "request_id": request.id,
                    "job_post_title": job_post.title if job_post else "Unknown",
                    "schedule_date": schedule.scheduled_at if schedule else None,
                    "assignment_type": assignment.assignment_type.value,
                    "created_at": request.created_at
                })
        
        return result
    
    @staticmethod
    def get_panel_members(db: Session, job_post_id: int) -> List[dict]:
        """Get all panel members for a job post"""
        from app.models.v2.interview_panel import InterviewPanelAssignment, InterviewPanelMember
        
        assignments = db.query(InterviewPanelAssignment).filter(
            InterviewPanelAssignment.job_post_id == job_post_id
        ).all()
        
        members = []
        for assignment in assignments:
            assignment_members = db.query(InterviewPanelMember).filter(
                InterviewPanelMember.assignment_id == assignment.id
            ).all()
            
            for member in assignment_members:
                company_user = db.query(CompanyUser).filter(CompanyUser.id == member.company_user_id).first()
                if company_user:
                    members.append({
                        "member_id": member.id,
                        "user_id": company_user.id,
                        "user_name": company_user.name,
                        "user_email": company_user.email,
                        "user_ranks": company_user.ranks,
                        "role": member.role.value,
                        "assignment_type": assignment.assignment_type.value,
                        "assigned_at": member.assigned_at
                    })
        
        return members

    @staticmethod
    def get_user_response_history(db: Session, user_id: int) -> List[dict]:
        """Get user's response history for interview panel requests"""
        from app.models.v2.interview_panel import InterviewPanelAssignment, InterviewPanelRequest
        from app.models.v2.recruitment.job import JobPost
        from app.models.v2.document.schedule import Schedule
        
        # Get all requests that the user has responded to (not pending)
        requests = db.query(InterviewPanelRequest).filter(
            and_(
                InterviewPanelRequest.company_user_id == user_id,
                InterviewPanelRequest.status != RequestStatus.PENDING
            )
        ).all()
        
        history = []
        for request in requests:
            # Get assignment info
            assignment = db.query(InterviewPanelAssignment).filter(
                InterviewPanelAssignment.id == request.assignment_id
            ).first()
            
            if assignment:
                # Get job post info
                job_post = db.query(JobPost).filter(JobPost.id == assignment.job_post_id).first()
                
                # Get schedule info
                schedule = db.query(Schedule).filter(Schedule.id == assignment.schedule_id).first()
                
                history.append({
                    "request_id": request.id,
                    "job_post_title": job_post.title if job_post else "Unknown",
                    "schedule_date": schedule.scheduled_at if schedule else None,
                    "assignment_type": assignment.assignment_type.value,
                    "status": request.status.value,
                    "created_at": request.created_at,
                    "responded_at": request.response_at
                })
        
        # Sort by responded_at (most recent first)
        history.sort(key=lambda x: x["responded_at"], reverse=True)
        
        return history 