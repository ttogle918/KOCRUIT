from sqlalchemy.orm import Session
from app.models.interview_question import InterviewQuestion, QuestionType
from app.schemas.interview_question import InterviewQuestionCreate, InterviewQuestionBulkCreate
from typing import List, Dict, Any, Optional
import logging
from app.models.application import Application, DocumentStatus, InterviewStatus
from app.models.job import JobPost
from app.models.resume import Resume

logger = logging.getLogger(__name__)

class InterviewQuestionService:
    """면접 질문 관리 서비스"""
    
    @staticmethod
    def create_question(db: Session, question_data: InterviewQuestionCreate) -> InterviewQuestion:
        """단일 질문 생성"""
        try:
            db_question = InterviewQuestion(**question_data.dict())
            db.add(db_question)
            db.commit()
            db.refresh(db_question)
            return db_question
        except Exception as e:
            db.rollback()
            logger.error(f"질문 생성 실패: {str(e)}")
            raise
    
    @staticmethod
    def create_questions_bulk(db: Session, bulk_data: InterviewQuestionBulkCreate) -> List[InterviewQuestion]:
        """대량 질문 생성"""
        try:
            questions = []
            for question_dict in bulk_data.questions:
                question_data = InterviewQuestionCreate(
                    application_id=bulk_data.application_id,
                    type=QuestionType(question_dict.get("type", "common")),
                    question_text=question_dict.get("question_text", ""),
                    category=question_dict.get("category"),
                    difficulty=question_dict.get("difficulty")
                )
                db_question = InterviewQuestion(**question_data.dict())
                db.add(db_question)
                questions.append(db_question)
            
            db.commit()
            for question in questions:
                db.refresh(question)
            return questions
        except Exception as e:
            db.rollback()
            logger.error(f"대량 질문 생성 실패: {str(e)}")
            raise
    
    @staticmethod
    def save_langgraph_questions(
        db: Session, 
        application_id: int, 
        questions_data: Dict[str, Any]
    ) -> List[InterviewQuestion]:
        """LangGraph 생성 결과를 DB에 저장"""
        try:
            questions = []
            
            # 공통 질문 저장
            if "common" in questions_data:
                common_questions = questions_data["common"]
                if isinstance(common_questions, dict):
                    for category, question_list in common_questions.items():
                        if isinstance(question_list, list):
                            for question_text in question_list:
                                question_data = InterviewQuestionCreate(
                                    application_id=application_id,
                                    type=QuestionType.COMMON,
                                    question_text=question_text,
                                    category=category
                                )
                                db_question = InterviewQuestion(**question_data.dict())
                                db.add(db_question)
                                questions.append(db_question)
                elif isinstance(common_questions, list):
                    for question_text in common_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.COMMON,
                            question_text=question_text,
                            category="인성/동기"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            # 개별 질문 저장
            if "personal" in questions_data:
                personal_questions = questions_data["personal"]
                if isinstance(personal_questions, dict):
                    for category, question_list in personal_questions.items():
                        if isinstance(question_list, list):
                            for question_text in question_list:
                                question_data = InterviewQuestionCreate(
                                    application_id=application_id,
                                    type=QuestionType.PERSONAL,
                                    question_text=question_text,
                                    category=category
                                )
                                db_question = InterviewQuestion(**question_data.dict())
                                db.add(db_question)
                                questions.append(db_question)
                elif isinstance(personal_questions, list):
                    for question_text in personal_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.PERSONAL,
                            question_text=question_text,
                            category="이력서 기반"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            # 회사 관련 질문 저장
            if "company" in questions_data:
                company_questions = questions_data["company"]
                if isinstance(company_questions, list):
                    for question_text in company_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.COMPANY,
                            question_text=question_text,
                            category="회사 관련"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            # 직무 관련 질문 저장
            if "job" in questions_data:
                job_questions = questions_data["job"]
                if isinstance(job_questions, dict):
                    for category, question_list in job_questions.items():
                        if isinstance(question_list, list):
                            for question_text in question_list:
                                question_data = InterviewQuestionCreate(
                                    application_id=application_id,
                                    type=QuestionType.JOB,
                                    question_text=question_text,
                                    category=category
                                )
                                db_question = InterviewQuestion(**question_data.dict())
                                db.add(db_question)
                                questions.append(db_question)
                elif isinstance(job_questions, list):
                    for question_text in job_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.JOB,
                            question_text=question_text,
                            category="직무 관련"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            # 임원면접 질문 저장
            if "executive" in questions_data:
                executive_questions = questions_data["executive"]
                if isinstance(executive_questions, list):
                    for question_text in executive_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.EXECUTIVE,
                            question_text=question_text,
                            category="임원면접"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            # 2차 면접 질문 저장
            if "second" in questions_data:
                second_questions = questions_data["second"]
                if isinstance(second_questions, list):
                    for question_text in second_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.SECOND,
                            question_text=question_text,
                            category="2차 면접"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            # 최종 면접 질문 저장
            if "final" in questions_data:
                final_questions = questions_data["final"]
                if isinstance(final_questions, list):
                    for question_text in final_questions:
                        question_data = InterviewQuestionCreate(
                            application_id=application_id,
                            type=QuestionType.FINAL,
                            question_text=question_text,
                            category="최종 면접"
                        )
                        db_question = InterviewQuestion(**question_data.dict())
                        db.add(db_question)
                        questions.append(db_question)
            
            db.commit()
            for question in questions:
                db.refresh(question)
            
            logger.info(f"Application {application_id}에 {len(questions)}개 질문 저장 완료")
            return questions
            
        except Exception as e:
            db.rollback()
            logger.error(f"LangGraph 질문 저장 실패: {str(e)}")
            raise
    
    @staticmethod
    def get_questions_by_application(
        db: Session, 
        application_id: int, 
        question_type: Optional[QuestionType] = None
    ) -> List[InterviewQuestion]:
        """지원서별 질문 조회"""
        query = db.query(InterviewQuestion).filter(InterviewQuestion.application_id == application_id)
        if question_type:
            query = query.filter(InterviewQuestion.type == question_type)
        return query.order_by(InterviewQuestion.created_at).all()
    
    @staticmethod
    def get_questions_by_type(
        db: Session, 
        application_id: int
    ) -> Dict[str, List[str]]:
        """지원자별 질문을 타입별로 그룹화하여 반환"""
        questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.application_id == application_id
        ).all()
        
        grouped_questions = {}
        for question in questions:
            question_type = question.type.value
            if question_type not in grouped_questions:
                grouped_questions[question_type] = []
            grouped_questions[question_type].append(question.question_text)
        
        return grouped_questions
    
    @staticmethod
    def generate_common_questions_for_job_post(
        db: Session, 
        job_post_id: int,
        company_name: str = "",
        job_info: str = ""
    ) -> List[InterviewQuestion]:
        """공고별 공통 질문 생성 (백그라운드에서 실행)"""
        try:
            from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
            
            # LangGraph를 사용하여 공통 질문 생성
            questions_data = generate_comprehensive_interview_questions(
                resume_text="",  # 공통 질문이므로 이력서 불필요
                job_info=job_info,
                company_name=company_name,
                interview_type="general"
            )
            
            # 해당 공고의 모든 지원자에게 공통 질문 저장
            applications = db.query(Application).filter(
                Application.job_post_id == job_post_id,
                Application.document_status == DocumentStatus.PASSED.value
            ).all()
            
            created_questions = []
            for application in applications:
                # 공통 질문만 저장
                common_questions_data = {"common": questions_data.get("generated_questions", {}).get("common", [])}
                questions = InterviewQuestionService.save_langgraph_questions(
                    db=db,
                    application_id=application.id,
                    questions_data=common_questions_data
                )
                created_questions.extend(questions)
            
            logger.info(f"공고 {job_post_id}에 대해 {len(created_questions)}개의 공통 질문 생성 완료")
            return created_questions
            
        except Exception as e:
            logger.error(f"공통 질문 생성 실패 (공고 {job_post_id}): {str(e)}")
            raise
    
    @staticmethod
    def generate_individual_questions_for_applicant(
        db: Session, 
        application_id: int,
        resume_text: str = "",
        job_info: str = "",
        company_name: str = ""
    ) -> List[InterviewQuestion]:
        """지원자별 개별 질문 생성 (면접 일정 확정 시 실행)"""
        try:
            from agent.agents.interview_question_workflow import generate_comprehensive_interview_questions
            
            # 지원자 정보 조회
            application = db.query(Application).filter(Application.id == application_id).first()
            if not application:
                raise ValueError(f"지원자 정보를 찾을 수 없습니다: {application_id}")
            
            # 이력서 텍스트 조회 (resume_text가 제공되지 않은 경우)
            if not resume_text and application.resume_id:
                resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
                if resume and resume.content:
                    resume_text = resume.content
            
            # LangGraph를 사용하여 개별 질문 생성
            questions_data = generate_comprehensive_interview_questions(
                resume_text=resume_text,
                job_info=job_info,
                company_name=company_name,
                interview_type="general"
            )
            
            # 개별 질문 저장 (공통 질문 제외)
            individual_questions_data = questions_data.get("generated_questions", {})
            # 공통 질문은 이미 생성되어 있으므로 제외
            if "common" in individual_questions_data:
                del individual_questions_data["common"]
            
            questions = InterviewQuestionService.save_langgraph_questions(
                db=db,
                application_id=application_id,
                questions_data=individual_questions_data
            )
            
            logger.info(f"지원자 {application_id}에 대해 {len(questions)}개의 개별 질문 생성 완료")
            return questions
            
        except Exception as e:
            logger.error(f"개별 질문 생성 실패 (지원자 {application_id}): {str(e)}")
            raise
    
    @staticmethod
    def generate_questions_for_scheduled_interviews(
        db: Session, 
        job_post_id: int
    ) -> Dict[str, int]:
        """면접 일정이 확정된 지원자들에 대해 질문 생성 (백그라운드 스케줄러용)"""
        try:
            # 면접 일정이 확정된 지원자들 조회 (AI 면접 또는 1차 면접)
            scheduled_applications = db.query(Application).filter(
                Application.job_post_id == job_post_id,
                Application.document_status == DocumentStatus.PASSED.value,
                Application.interview_status.in_([
                    InterviewStatus.AI_INTERVIEW_SCHEDULED.value,
                    InterviewStatus.FIRST_INTERVIEW_SCHEDULED.value,
                    InterviewStatus.SECOND_INTERVIEW_SCHEDULED.value,
                    InterviewStatus.FINAL_INTERVIEW_SCHEDULED.value
                ])
            ).all()
            
            # 공고 정보 조회
            job_post = db.query(JobPost).filter(JobPost.id == job_post_id).first()
            if not job_post:
                raise ValueError(f"공고 정보를 찾을 수 없습니다: {job_post_id}")
            
            company_name = job_post.company.name if job_post.company else ""
            from app.api.v1.interview_question import parse_job_post_data
            job_info = parse_job_post_data(job_post)
            
            results = {
                "total_applications": len(scheduled_applications),
                "questions_generated": 0,
                "errors": 0
            }
            
            for application in scheduled_applications:
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
                        results["questions_generated"] += len(questions)
                        logger.info(f"지원자 {application.id}에 대해 {len(questions)}개 질문 생성")
                    else:
                        logger.info(f"지원자 {application.id}는 이미 질문이 생성되어 있음")
                        
                except Exception as e:
                    results["errors"] += 1
                    logger.error(f"지원자 {application.id} 질문 생성 실패: {str(e)}")
            
            logger.info(f"공고 {job_post_id} 질문 생성 완료: {results}")
            return results
            
        except Exception as e:
            logger.error(f"면접 일정 확정 지원자 질문 생성 실패 (공고 {job_post_id}): {str(e)}")
            raise 