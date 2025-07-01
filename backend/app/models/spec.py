from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from enum import Enum as PyEnum       # 파이썬 기본 Enum
from sqlalchemy import Column, Enum   # SQLAlchemy Enum
import enum


class SpecType(str, enum.Enum):
    EDUCATION = "EDUCATION"
    CERTIFICATE = "CERTIFICATE"
    PROJECT = "PROJECT"
    AWARD = "AWARD"


class Spec(Base):
    __tablename__ = "spec"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('applicantuser.id'))
    type = Column(Enum(SpecType))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("ApplicantUser")


class FieldNameScore(Base):
    __tablename__ = "field_name_score"
    
    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String(100), nullable=False)
    score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Weight(Base):
    __tablename__ = "weight"
    
    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String(100), nullable=False)
    weight_value = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 