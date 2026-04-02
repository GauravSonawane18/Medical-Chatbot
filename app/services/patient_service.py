from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.chat import Chat
from app.models.medical_history import MedicalHistory
from app.models.patient import Patient


def get_patient_by_user_id(db: Session, user_id: int) -> Patient | None:
    return db.scalar(select(Patient).where(Patient.user_id == user_id))


def get_patient_summary(db: Session, patient_id: int) -> Patient:
    patient = db.scalar(
        select(Patient)
        .options(joinedload(Patient.user))
        .where(Patient.id == patient_id)
    )
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    return patient


def list_chat_history(db: Session, patient_id: int, limit: int = 50) -> list[Chat]:
    statement = (
        select(Chat)
        .where(Chat.patient_id == patient_id)
        .order_by(Chat.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(statement).all())


def get_medical_history_for_patient(db: Session, patient_id: int, limit: int = 50) -> list[MedicalHistory]:
    statement = (
        select(MedicalHistory)
        .where(MedicalHistory.patient_id == patient_id)
        .order_by(MedicalHistory.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(statement).all())
