from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from enum import Enum as PyEnum
from sqlalchemy import Column, Enum
import enum


class SpecType(str, enum.Enum):
    EDUCATION = "EDUCATION"
    CERTIFICATE = "CERTIFICATE"
    PROJECT = "PROJECT"
    AWARD = "AWARD"


class Spec(Base):
    __tablename__ = "spec"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey('resume.id'), nullable=False)
    spec_type = Column(String(255), nullable=False)
    spec_title = Column(String(255), nullable=False)
    spec_description = Column(Text)
    
    # Relationships
    resume = relationship("Resume", back_populates="specs")



class Weight(Base):
    __tablename__ = "weight"
    
    id = Column(Integer, primary_key=True, index=True)
    target_type = Column(String(255), nullable=False)
    jobpost_id = Column(Integer, ForeignKey('jobpost.id'))
    field_name = Column(String(255), nullable=False)
    weight_value = Column(Float)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    jobpost = relationship("JobPost") 