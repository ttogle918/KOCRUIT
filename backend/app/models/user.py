from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr
from datetime import datetime
from app.core.database import Base
import enum


class GenderType(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"


class Role(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"  # 기업회원 권한


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    address = Column(String(255))
    gender = Column(Enum(GenderType))
    phone = Column(String(20))
    role = Column(Enum(Role), default=Role.USER)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    birth_date = Column(Date)
    
    # Discriminator column for inheritance
    user_type = Column(String(20))
    
    __mapper_args__ = {
        'polymorphic_identity': 'USER',
        'polymorphic_on': user_type
    }


class CompanyUser(User):
    __tablename__ = "companyuser"
    
    id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    company_id = Column(Integer, ForeignKey('company.id'))
    bus_num = Column(String(50))
    department_id = Column(Integer, ForeignKey('department.id'))
    rank = Column(String(50))
    
    # Relationships
    company = relationship("Company", back_populates="company_users")
    department = relationship("Department", back_populates="company_users")
    
    __mapper_args__ = {
        'polymorphic_identity': 'COMPANY',
    }


class ApplicantUser(User):
    __tablename__ = "applicantuser"
    
    id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    resume_file_path = Column(String(255))
    
    # Relationships
    jobs = relationship("Job", back_populates="user")
    
    __mapper_args__ = {
        'polymorphic_identity': 'APPLICANT',
    } 