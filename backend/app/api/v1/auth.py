from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, SignupRequest, RefreshTokenRequest, UserDetail
from app.models.user import User, CompanyUser, UserType, UserRole
from app.models.company import Company
from app.core import security
from app.core.config import settings
from jose import JWTError
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from app.utils.send_email import send_verification_email
from app.models.EmailVerificationToken import EmailVerificationToken
from pydantic import BaseModel, EmailStr


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = security.verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    # CompanyUser를 먼저 조회
    user = db.query(CompanyUser).filter(CompanyUser.email == email).first()
    if not user:
        # CompanyUser가 없으면 일반 User 조회
        user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


class DevLoginRequest(BaseModel):
    email: EmailStr


@router.post("/signup", response_model=str)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    print(f"Signup request received: {request}")
    print(f"userType: {request.userType}")
    
    # 이메일 중복 체크
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        print("이미 가입된 이메일입니다.")
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
    
    # 기업 회원인 경우 이메일 인증 확인
    if request.userType == 'company':
        verification_token = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.email == request.email,
            EmailVerificationToken.is_verified == True
        ).first()
        print(f"verification_token: {verification_token}")
        if not verification_token:
            print("이메일 인증이 완료되지 않았습니다.")
            raise HTTPException(status_code=400, detail="이메일 인증을 먼저 완료해주세요.")
    
    try:
        company_id = request.company_id if request.userType == 'company' else None
        user = CompanyUser(
            email=request.email,
            name=request.name,
            password=security.get_password_hash(request.password),
            role=UserRole.MANAGER,
            address=request.address,
            gender=request.gender,
            phone=request.phone,
            birth_date=request.birth_date,
            company_id=company_id
        )
        print(f"Creating user: {user}")
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"User created successfully: {user.id}, type: {type(user)}")

        # 인증 메일 비동기 전송
        try:
            await send_verification_email(user.email, verification_token)
            print(f"Verification email sent successfully to {user.email}")
            email_sent = True
        except Exception as email_error:
            print(f"Failed to send verification email: {email_error}")
            print("Note: Please check your .env file for correct Gmail credentials")
            email_sent = False

        print(f"User created successfully: {user.id}")
        
        if email_sent:
            return "회원가입 성공! 이메일 인증을 확인해주세요."
        else:
            return "회원가입 성공! (이메일 발송 실패 - Gmail 설정 확인 필요)"
    except Exception as e:
        print(f"Error creating user: {e}")
        db.rollback()
        msg = '회원가입 중 오류가 발생했습니다.';
        if (isinstance(e, HTTPException) and e.detail):
            if (isinstance(e.detail, str)):
                msg = e.detail
            elif (isinstance(e.detail, list) and all(isinstance(i, str) for i in e.detail)):
                msg = '\n'.join(e.detail)
            elif (isinstance(e.detail, dict)):
                msg = str(e.detail)
        raise HTTPException(status_code=400, detail=msg)


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # 개발자 테스트 계정 자동 생성
    if request.email == "dev@test.com" and request.password == "dev123456":
        # 개발자 계정이 이미 존재하는지 확인
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            # 개발자 계정이 없으면 자동 생성
            from app.models.user import CompanyUser, UserRole
            from app.core import security
            
            # 기본 회사 ID (첫 번째 회사 또는 1)
            company = db.query(Company).first()
            company_id = company.id if company else 1
            
            hashed_password = security.get_password_hash("dev123456")
            user = CompanyUser(
                email="dev@test.com",
                name="개발자 테스트 계정",
                password=hashed_password,
                role=UserRole.MANAGER,
                company_id=company_id
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"🔐 개발자 테스트 계정 자동 생성: {user.email}, company_id: {user.company_id}")
    
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not security.verify_password(request.password, str(user.password)):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    role_value = user.role.value if hasattr(user.role, 'value') else user.role
    access_token = security.create_access_token({"sub": user.email, "role": role_value})
    refresh_token = security.create_refresh_token({"sub": user.email})
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = security.verify_token(request.refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access_token = security.create_access_token({"sub": email, "role": user.role})
    return LoginResponse(access_token=access_token, refresh_token=request.refresh_token)


@router.get("/me", response_model=UserDetail)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Add company name if user is a company user
    if hasattr(current_user, 'company') and current_user.company:
        current_user.companyName = current_user.company.name
    
    # Add department name if user is a company user with department
    if hasattr(current_user, 'department') and current_user.department:
        current_user.department_name = current_user.department.name
        current_user.department_id = current_user.department.id
    
    # Ensure role is properly converted to enum
    try:
        # If role is a string, try to convert it to UserRole enum
        if isinstance(current_user.role, str):
            current_user.role = UserRole(current_user.role)
    except ValueError:
        # If the role string doesn't match any enum value, default to USER
        current_user.role = UserRole.USER
    
    return current_user


@router.post("/logout")
def logout(response: Response):
    # 실제 로그아웃 처리는 프론트에서 토큰 삭제로 처리
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return {"msg": "로그아웃 성공"}


# 이메일 중복 체크 - 인증 불필요
@router.get("/check-email")
def check_email_exists(email: str = Query(...), db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == email).first() is not None
    return {"exists": exists}


# 이메일 인증 전용 API
@router.post("/send-verification-email")
async def send_verification_email_only(request: dict, db: Session = Depends(get_db)):
    email = request.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="이메일이 필요합니다.")
    
    # 이메일 중복 체크
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")
    
    try:
        # 이메일 인증 토큰 생성 및 저장
        verification_token = str(uuid4())
        db_token = EmailVerificationToken(
            token=verification_token, 
            email=email,
            is_verified=False
        )
        db.add(db_token)
        db.commit()

        # 인증 메일 전송
        try:
            await send_verification_email(email, verification_token)
            print(f"Verification email sent successfully to {email}")
            return {"message": "인증 이메일이 발송되었습니다."}
        except Exception as email_error:
            print(f"Failed to send verification email: {email_error}")
            # 토큰 삭제
            db.delete(db_token)
            db.commit()
            raise HTTPException(status_code=500, detail="이메일 발송에 실패했습니다.")
            
    except Exception as e:
        print(f"Error sending verification email: {e}")
        raise HTTPException(status_code=500, detail="이메일 인증 처리 중 오류가 발생했습니다.")


# 이메일 인증 완료 여부 확인
@router.get("/check-email-verification")
def check_email_verification(email: str = Query(...), db: Session = Depends(get_db)):
    verification_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.email == email,
        EmailVerificationToken.is_verified == True
    ).first()
    
    return {"verified": verification_token is not None}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    record = db.query(EmailVerificationToken).filter(EmailVerificationToken.token == token).first()
    if not record:
        raise HTTPException(status_code=400, detail="잘못된 토큰입니다.")
    
    if record.is_verified:
        return {"msg": "이미 인증된 이메일입니다."}

    record.is_verified = True
    db.commit()
    return {"msg": "이메일 인증이 완료되었습니다."}


@router.post("/dev-login", response_model=LoginResponse)
def dev_login(request: DevLoginRequest, db: Session = Depends(get_db)):
    """
    개발/테스트용: 이메일만 입력받아 해당 유저로 바로 로그인(JWT 발급)
    운영 배포 전에는 반드시 제거/비활성화!
    """
    email = request.email
    if not email:
        raise HTTPException(status_code=400, detail="이메일이 필요합니다.")
    
    # CompanyUser 우선 조회
    user = db.query(CompanyUser).filter(CompanyUser.email == email).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="해당 이메일의 사용자가 존재하지 않습니다.")
    
    # 사용자의 실제 company_id 확인
    company_id = getattr(user, 'company_id', None)
    print(f"🔐 개발자 로그인: {email}, company_id: {company_id}")
    
    role_value = user.role.value if hasattr(user.role, 'value') else user.role
    access_token = security.create_access_token({"sub": user.email, "role": role_value})
    refresh_token = security.create_refresh_token({"sub": user.email})
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)