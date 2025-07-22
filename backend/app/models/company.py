from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Company(Base):
    __tablename__ = "company"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    values_text = Column(Text)  # 회사 인재상/가치관 정보
    address = Column(String(255))
    phone = Column(String(20))
    website = Column(String(255))
    bus_num = Column(String(50), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company_users = relationship("CompanyUser", back_populates="company")
    job_posts = relationship("JobPost", back_populates="company")
    departments = relationship("Department", back_populates="company")


class Department(Base):
    __tablename__ = "department"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    job_function = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    company_id = Column(Integer, ForeignKey('company.id'))
    
    # Relationships
    company_users = relationship("CompanyUser", back_populates="department")
    company = relationship("Company", back_populates="departments")
    job_posts = relationship("JobPost", back_populates="department_rel") 