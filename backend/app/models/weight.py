from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Weight(Base):
    __tablename__ = "weight"
    
    id = Column(Integer, primary_key=True, index=True)
    target_type = Column(String(255), nullable=False)
    jobpost_id = Column(Integer, ForeignKey("jobpost.id"), nullable=True)
    field_name = Column(String(255), nullable=False)
    weight_value = Column(Float, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) 