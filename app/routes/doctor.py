from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.doctor import DoctorNoteCreate, DoctorNoteResponse, FlaggedConversationResponse
from app.schemas.patient import MedicalHistoryCreate, MedicalHistoryResponse, PatientDetailResponse, PatientSummaryResponse
from app.services.doctor_service import (
    add_doctor_note,
    add_medical_history_entry,
    get_patient_details,
    list_flagged_conversations,
    list_patients,
)
from app.utils.dependencies import require_roles

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


@router.get("/doctor/flagged-chats", response_model=list[FlaggedConversationResponse])
def get_flagged_chats(
    _: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> list[FlaggedConversationResponse]:
    return list_flagged_conversations(db)


@router.post("/doctor/notes", response_model=DoctorNoteResponse, status_code=status.HTTP_201_CREATED)
def create_doctor_note(
    payload: DoctorNoteCreate,
    current_doctor: User = Depends(require_roles(UserRole.doctor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> DoctorNoteResponse:
    return add_doctor_note(db, current_doctor, payload)


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
