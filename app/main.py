from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
FRONTEND_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    description=(
        "Production-oriented FastAPI backend for an AI-powered medical chatbot "
        "with JWT auth, PostgreSQL, SQLAlchemy, and Ollama integration."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="frontend-assets")

app.include_router(auth_router, tags=["Authentication"])
app.include_router(patient_router, tags=["Patient"])
app.include_router(doctor_router, tags=["Doctor"])
app.include_router(ws_router, tags=["WebSocket"])


def serve_frontend_file(*candidates: Path) -> FileResponse:
    for candidate in candidates:
        if candidate.exists():
            return FileResponse(candidate)
    raise HTTPException(status_code=404, detail="Frontend asset not found")


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return serve_frontend_file(FRONTEND_DIST_DIR / "index.html", STATIC_DIR / "index.html")


@app.get("/favicon.svg", include_in_schema=False)
def frontend_favicon() -> FileResponse:
    return serve_frontend_file(FRONTEND_DIST_DIR / "favicon.svg")


@app.get("/icons.svg", include_in_schema=False)
def frontend_icons() -> FileResponse:
    return serve_frontend_file(FRONTEND_DIST_DIR / "icons.svg")


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
