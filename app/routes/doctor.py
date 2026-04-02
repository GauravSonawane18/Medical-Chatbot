from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas.doctor import DoctorNoteCreate, DoctorNoteResponse, FlaggedConversationResponse, ReviewResponse
from app.schemas.patient import MedicalHistoryCreate, MedicalHistoryResponse, PatientDetailResponse, PatientSummaryResponse
from app.services.doctor_service import (
    add_doctor_note,
    add_medical_history_entry,
    get_patient_details,
    list_flagged_conversations,
    list_patients,
    mark_chat_reviewed,
)
from app.utils.dependencies import require_roles
from app.websocket.manager import manager

router = APIRouter()


@router.get("/patients", response_model=list[PatientSummaryResponse])
def get_patients(
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> list[PatientSummaryResponse]:
    return list_patients(db)


@router.get("/patients/{patient_id}", response_model=PatientDetailResponse)
def get_patient(
    patient_id: int,
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> PatientDetailResponse:
    return get_patient_details(db, patient_id)


@router.get("/doctor/notifications")
def get_notifications(
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> dict:
    flagged = list_flagged_conversations(db)
    return {"unread_count": len(flagged)}


@router.get("/doctor/flagged-chats", response_model=list[FlaggedConversationResponse])
def get_flagged_chats(
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> list[FlaggedConversationResponse]:
    return list_flagged_conversations(db)


@router.post("/doctor/chats/{chat_id}/review", response_model=ReviewResponse)
def review_chat(
    chat_id: int,
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> ReviewResponse:
    chat = mark_chat_reviewed(db, chat_id)
    return ReviewResponse(id=chat.id, is_reviewed=chat.is_reviewed, reviewed_at=chat.reviewed_at)


@router.post("/doctor/notes", response_model=DoctorNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor_note(
    payload: DoctorNoteCreate,
    current_doctor: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> DoctorNoteResponse:
    note = add_doctor_note(db, current_doctor, payload)
    patient = db.get(Patient, note.patient_id)
    if patient:
        await manager.send_to(patient.user_id, {
            "type": "doctor_note",
            "chat_id": note.chat_id,
            "note": {
                "id": note.id,
                "doctor_id": note.doctor_id,
                "notes": note.notes,
                "diagnosis": note.diagnosis,
                "recommendation": note.recommendation,
                "message_to_patient": note.message_to_patient,
                "patient_reply": note.patient_reply,
                "patient_reply_at": None,
                "created_at": note.created_at.isoformat(),
            },
        })
    return note


@router.post(
    "/doctor/medical-history",
    response_model=MedicalHistoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_medical_history_entry(
    payload: MedicalHistoryCreate,
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> MedicalHistoryResponse:
    return add_medical_history_entry(db, payload)
