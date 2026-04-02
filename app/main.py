from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.database.base import Base
from app.database.session import engine
from app.routes.auth import router as auth_router
from app.routes.doctor import router as doctor_router
from app.routes.patient import router as patient_router
from app.routes.ws import router as ws_router
from app.utils.logging import configure_logging

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    description="AI-powered medical chatbot with JWT auth, PostgreSQL, and Groq LLM.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, tags=["Authentication"])
app.include_router(patient_router, tags=["Patient"])
app.include_router(doctor_router, tags=["Doctor"])
app.include_router(ws_router, tags=["WebSocket"])


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
