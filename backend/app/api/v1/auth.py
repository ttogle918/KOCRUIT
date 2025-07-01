from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, SignupRequest, RefreshTokenRequest, UserDetail
from app.models.user import User, CompanyUser, Role
from app.core import security
from app.core.config import settings
from jose import JWTError
from typing import Optional
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = security.verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/signup", response_model=str)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
    user = CompanyUser(
        email=request.email,
        name=request.name,
        password=security.get_password_hash(request.password),
        role=Role.USER,
        address=request.address,
        gender=request.gender,
        phone=request.phone,
        birth_date=request.birth_date
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return "회원가입 성공"


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not security.verify_password(request.password, str(user.password)):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    role_value = user.role.value if hasattr(user.role, 'value') else user.role
    access_token = security.create_access_token({"sub": user.email, "role": role_value})
    refresh_token = security.create_refresh_token({"sub": user.email})
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: RefreshTokenRequest):
    payload = security.verify_token(request.refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    email = payload.get("sub")
    access_token = security.create_access_token({"sub": email, "role": Role.USER})
    return LoginResponse(access_token=access_token, refresh_token=request.refresh_token)


@router.get("/me", response_model=UserDetail)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(response: Response):
    # 실제 로그아웃 처리는 프론트에서 토큰 삭제로 처리
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"msg": "로그아웃 성공"} 