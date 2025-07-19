from sqlalchemy.orm import Session
from app.models.user import User, CompanyUser, ApplicantUser
from app.core import security
from app.models.user import UserType, UserRole
from fastapi import HTTPException


class AuthService:
    @staticmethod
    def create_user(db: Session, email: str, name: str, password: str, **kwargs):
        """사용자 생성"""
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
        
        hashed_password = security.get_password_hash(password)
        user = CompanyUser(
            email=email,
            name=name,
            password=hashed_password,
            role=UserRole.USER,
            **kwargs
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str):
        """사용자 인증"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not security.verify_password(password, user.password):
            return None
        return user
    
    @staticmethod
    def create_tokens(user: User):
        """JWT 토큰 생성"""
        access_token = security.create_access_token({"sub": user.email, "role": user.role})
        refresh_token = security.create_refresh_token({"sub": user.email})
        return {"access_token": access_token, "refresh_token": refresh_token} 