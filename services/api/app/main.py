from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Audio Commitments Streamer - API Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
        "health": "/healthz"
    }
