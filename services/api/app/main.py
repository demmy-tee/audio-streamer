from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine, Base
import app.db.models  # noqa: F401 - ensure models are registered with Base metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup connection pool on shutdown
    await engine.dispose()


app = FastAPI(
    title="Audio Commitments Streamer - API Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)


@app.get("/healthz", tags=["System"])
async def health_check():
    """Healthcheck endpoint for Docker and Render."""
    return {"status": "healthy", "service": "audio-api"}


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "audio-commitments-api",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/healthz",
    }