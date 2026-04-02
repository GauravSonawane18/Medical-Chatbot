import json
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="AI Medical Chatbot API", validation_alias="APP_NAME")
    app_version: str = Field(default="1.0.0", validation_alias="APP_VERSION")
    debug: bool = Field(default=False, validation_alias="DEBUG")
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/medical_chatbot",
        validation_alias="DATABASE_URL",
    )
    jwt_secret_key: str = Field(
        default="change-me-in-production",
        validation_alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_model: str = Field(default="llama3", validation_alias="OLLAMA_MODEL")
    ollama_fallback_model: str | None = Field(default=None, validation_alias="OLLAMA_FALLBACK_MODEL")
    ollama_timeout_seconds: float = Field(default=240.0, validation_alias="OLLAMA_TIMEOUT_SECONDS")
    ollama_connect_timeout_seconds: float = Field(
        default=10.0,
        validation_alias="OLLAMA_CONNECT_TIMEOUT_SECONDS",
    )
    ollama_keep_alive: str = Field(default="15m", validation_alias="OLLAMA_KEEP_ALIVE")
    ollama_num_predict: int = Field(default=220, validation_alias="OLLAMA_NUM_PREDICT")
    cors_origins: list[str] = Field(default=["*"], validation_alias="CORS_ORIGINS")

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return bool(value)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> str:
        if not isinstance(value, str):
            return str(value)
        if value.startswith("postgresql://") and "+" not in value.split("://", 1)[0]:
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @field_validator("ollama_fallback_model", mode="before")
    @classmethod
    def normalize_fallback_model(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return str(value)

    @field_validator("ollama_keep_alive", mode="before")
    @classmethod
    def normalize_keep_alive(cls, value: object) -> str:
        if isinstance(value, str) and value.strip():
            return value.strip()
        return "15m"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, list):
            return [str(item) for item in value]
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return ["*"]
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                return [item.strip() for item in stripped.split(",") if item.strip()]
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
            if isinstance(parsed, str):
                return [parsed]
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
