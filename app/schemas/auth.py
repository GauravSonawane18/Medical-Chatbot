from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.enums import UserRole
from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    phone_number: str | None = Field(default=None, max_length=30)
    blood_group: str | None = Field(default=None, max_length=10)
    allergies: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_patient_profile(self) -> "RegisterRequest":
        if self.role == UserRole.patient and (self.age is None or self.gender is None):
            raise ValueError("Patient registration requires age and gender.")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
