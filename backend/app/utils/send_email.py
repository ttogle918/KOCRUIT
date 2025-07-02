from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

async def send_verification_email(email: EmailStr, token: str):
    verify_url = f"http://localhost:8000/api/v1/auth/verify-email?token={token}"
    html = f"""
    <h3>Kocruit 이메일 인증</h3>
    <p>아래 링크를 클릭하여 이메일을 인증해주세요:</p>
    <a href="{verify_url}">{verify_url}</a>
    """

    message = MessageSchema(
        subject="이메일 인증 링크",
        recipients=[email],
        body=html,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)