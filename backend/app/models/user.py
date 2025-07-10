from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr
from datetime import datetime
from app.core.database import Base
import enum

class Role(str, enum.Enum):
    INDIVIDUAL = "individual"
    ADMIN = "admin"
    COMPANY = "company"
    MEMBER = "MEMBER"  # 기업회원(채용담당자로 초대된)권한
    MANAGER = "MANAGER"  # 기업회원 공고 생성자 권한
    EMPLOYEE = "EMPLOYEE"  # 기업회원 권한
    


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    address = Column(String(255))
    gender = Column(String(10))
    phone = Column(String(20))
    role = Column(String(20), default="individual")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    birth_date = Column(Date)
    
    # Discriminator column for inheritance
    user_type = Column(String(20))
    
    # Relationships
    applications = relationship("Application", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    job_posts = relationship("JobPost", back_populates="user")
    
    __mapper_args__ = {
        'polymorphic_identity': 'individual',
        'polymorphic_on': user_type
    }


class CompanyUser(User):
    __tablename__ = "company_user"
    
    id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    company_id = Column(Integer, ForeignKey('company.id'))
    bus_num = Column(String(50))
    department_id = Column(Integer, ForeignKey('department.id'))
    ranks = Column(String(50))
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="company_users")
    department = relationship("Department", back_populates="company_users")
    resume_memos = relationship("ResumeMemo", back_populates="user")
    
    __mapper_args__ = {
        'polymorphic_identity': 'company',
    }


class AdminUser(User):
    __tablename__ = "admin_user"
    id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    # 필요시 추가 필드
    __mapper_args__ = {
        'polymorphic_identity': 'admin',
    } 