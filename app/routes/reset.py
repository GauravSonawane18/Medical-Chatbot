"""
Password reset flow:
  POST /password-reset/request  { email }  → returns token (in prod, email it)
  POST /password-reset/confirm  { token, new_password }  → resets password
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.utils.security import get_password_hash

router = APIRouter()
TOKEN_TTL_MINUTES = 30


class ResetRequestBody(BaseModel):
    email: str


class ResetConfirmBody(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ResetRequestResponse(BaseModel):
    message: str
    # In production remove `reset_token` and send via email instead
    reset_token: str


@router.post("/password-reset/request", response_model=ResetRequestResponse)
def request_reset(payload: ResetRequestBody, db: Session = Depends(get_db)) -> ResetRequestResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    # Always return success to avoid email enumeration
    if user is None:
        return ResetRequestResponse(
            message="If that email exists, a reset token has been generated.",
            reset_token="",
        )

    token_str = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)
    db.add(PasswordResetToken(user_id=user.id, token=token_str, expires_at=expires))
    db.commit()

    return ResetRequestResponse(
        message="Reset token generated. Use it within 30 minutes.",
        reset_token=token_str,   # remove in production; send via email
    )


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
def confirm_reset(payload: ResetConfirmBody, db: Session = Depends(get_db)) -> dict:
    record = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token == payload.token)
    )
    if record is None or record.used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or already used token.")
    if datetime.now(timezone.utc) > record.expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token has expired. Request a new one.")

    user = db.get(User, record.user_id)
    user.hashed_password = get_password_hash(payload.new_password)
    record.used = True
    db.commit()
    return {"message": "Password reset successfully. You can now log in."}
