from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
import os

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "your_email@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "your_app_password"),
    MAIL_FROM=os.getenv("MAIL_FROM", "your_email@gmail.com"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_FROM_NAME="KOCruit",
    MAIL_TLS=True,
    MAIL_SSL=False,
    USE_CREDENTIALS=True
)

async def send_verification_email(email: EmailStr, token: str):
    link = f"http://localhost:8000/api/v2/auth/verify-email?token={token}"
    message = MessageSchema(
        subject="KOCruit 이메일 인증",
        recipients=[email],
        body=f"아래 링크를 클릭하여 이메일 인증을 완료하세요:\n\n{link}",
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(message)
