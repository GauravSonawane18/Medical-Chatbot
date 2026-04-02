from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.patient import Patient
from app.schemas.chat import ChatHistoryItem, ChatRequest, ChatResponse
from app.schemas.doctor import DoctorNoteResponse, PatientReplyCreate
from app.schemas.patient import MedicalHistoryResponse, PatientSummaryResponse
from app.services.chat_service import process_patient_chat
from app.services.doctor_service import reply_to_note
from app.services.patient_service import get_medical_history_for_patient, get_patient_summary, list_chat_history
from app.utils.dependencies import get_current_patient

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    payload: ChatRequest,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> ChatResponse:
    chat = process_patient_chat(db, patient, payload)
    return ChatResponse(
        message=chat.message,
        response=chat.response,
        severity_level=chat.severity_level,
        is_flagged=chat.is_flagged,
        risk_reason=chat.risk_reason,
        created_at=chat.created_at,
    )


@router.get("/chat/history", response_model=list[ChatHistoryItem])
def get_chat_history(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[ChatHistoryItem]:
    return list_chat_history(db, patient.id)


@router.get("/medical-history", response_model=list[MedicalHistoryResponse])
def get_medical_history(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> list[MedicalHistoryResponse]:
    return get_medical_history_for_patient(db, patient.id)


@router.post("/notes/{note_id}/reply", response_model=DoctorNoteResponse)
def reply_to_doctor_note(
    note_id: int,
    payload: PatientReplyCreate,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> DoctorNoteResponse:
    return reply_to_note(db, note_id, patient.id, payload.reply)


@router.get("/me", response_model=PatientSummaryResponse)
def get_my_profile(
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
) -> PatientSummaryResponse:
    return get_patient_summary(db, patient.id)
