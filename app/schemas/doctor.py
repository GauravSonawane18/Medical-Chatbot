from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SeverityLevel


class DoctorNoteCreate(BaseModel):
    patient_id: int
    notes: str = Field(min_length=2, max_length=4000)
    diagnosis: str | None = Field(default=None, max_length=2000)


class DoctorNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    patient_id: int
    notes: str
    diagnosis: str | None
    created_at: datetime


class FlaggedConversationResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    message: str
    response: str
    severity_level: SeverityLevel
    risk_reason: str | None
    created_at: datetime
