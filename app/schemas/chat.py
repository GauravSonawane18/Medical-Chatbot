from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SeverityLevel


class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=3000)
    symptoms: str | None = Field(default=None, max_length=1000)


class ChatHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symptoms: str | None
    message: str
    response: str
    severity_level: SeverityLevel
    is_flagged: bool
    risk_reason: str | None
    created_at: datetime


class ChatResponse(BaseModel):
    message: str
    response: str
    severity_level: SeverityLevel
    is_flagged: bool
    risk_reason: str | None
    created_at: datetime
