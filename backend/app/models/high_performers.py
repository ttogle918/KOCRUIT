from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from backend.app.core.database import Base

class HighPerformer(Base):
    __tablename__ = 'high_performers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    education_level = Column(String(50), nullable=True)
    major = Column(String(100), nullable=True)
    certifications = Column(Text, nullable=True)  # JSON 문자열 또는 쉼표 구분
    total_experience_years = Column(Float, nullable=True)
    career_path = Column(Text, nullable=True)  # JSON 문자열 또는 쉼표 구분
    current_position = Column(String(50), nullable=True)
    promotion_speed_years = Column(Float, nullable=True)
    kpi_score = Column(Float, nullable=True)
    notable_projects = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False) 