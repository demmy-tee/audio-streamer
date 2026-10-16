from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.session import engine, Base
import app.db.models  # noqa: F401 - ensure models are registered with Base metadata
from app.storage import storage_service
from app.routes.audio import router as audio_router
from app.routes.conversations import router as conversations_router

logger = logging.getLogger("api-main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Ensure MinIO S3 bucket exists
    try:
        await storage_service.ensure_bucket_exists()
    except Exception as e:
        logger.warning(f"MinIO initialization deferred (will retry on first upload): {e}")

    yield

    # Cleanup connection pool on shutdown
    await engine.dispose()


app = FastAPI(
    title="Audio Commitments Streamer - API Service",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# Bulletproof CORS configuration for local and Vercel domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if settings.is_production else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

# Register API Routers
app.include_router(audio_router)
app.include_router(conversations_router)


@app.get("/healthz", tags=["System"])
async def health_check():
    """Healthcheck endpoint for Docker and Render."""
    return {
        "status": "healthy",
        "service": "audio-api",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "audio-commitments-api",
        "version": "1.0.0",
        "docs": "/docs" if not settings.is_production else "disabled",
        "health": "/healthz",
        "environment": settings.ENVIRONMENT,
    }