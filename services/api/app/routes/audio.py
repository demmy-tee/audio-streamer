import uuid

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Conversation, ConversationStatus
from app.db.session import get_db
from app.storage import storage_service

router = APIRouter(prefix="/api/v1/audio", tags=["Audio Streaming & Upload"])

ALLOWED_MIME_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/m4a",
    "audio/x-m4a",
    "audio/ogg",
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB max


class ConversationUploadResponse(BaseModel):
    conversation_id: str
    title: str
    status: str
    audio_s3_key: str
    sha256: str
    message: str


@router.post(
    "/upload",
    response_model=ConversationUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an audio file for transcription and commitment extraction",
)
async def upload_audio(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads an audio file (.wav, .mp3, .m4a):
    1. Validates content type and size limits.
    2. Uploads raw audio bytes to MinIO S3.
    3. Computes SHA-256 fingerprint for deduplication.
    4. Creates initial Conversation record in PostgreSQL.
    """
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Supported: WAV, MP3, M4A, OGG.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB.",
        )

    conv_id = uuid.uuid4()
    filename = file.filename or "recording.wav"
    s3_key = f"uploads/{conv_id}/{filename}"

    s3_key, sha256_hash = await storage_service.upload_audio(
        file_bytes=file_bytes,
        s3_key=s3_key,
        content_type=file.content_type or "audio/wav",
    )

    title = filename.rsplit(".", 1)[0].replace("_", " ").title()
    conversation = Conversation(
        id=conv_id,
        title=title,
        audio_s3_key=s3_key,
        audio_sha256=sha256_hash,
        duration_seconds=0.0,
        status=ConversationStatus.UPLOADED,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return ConversationUploadResponse(
        conversation_id=str(conversation.id),
        title=conversation.title,
        status=conversation.status.value,
        audio_s3_key=conversation.audio_s3_key,
        sha256=conversation.audio_sha256,
        message="Audio uploaded successfully. Ready for processing.",
    )


@router.get(
    "/{conversation_id}/stream",
    summary="Stream audio with HTTP 206 Partial Content Range support",
)
async def stream_audio(
    conversation_id: str,
    range_header: str | None = Header(None, alias="Range"),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams audio bytes for a conversation.
    Supports HTTP Range requests (HTTP 206) so the browser audio player
    can seek and jump to timestamped quotes instantly.
    """
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation ID format.")

    stmt = select(Conversation).where(Conversation.id == conv_uuid)
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    try:
        stream_gen, start_byte, end_byte, total_size = await storage_service.get_audio_stream(
            s3_key=conversation.audio_s3_key,
            byte_range=range_header,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not retrieve audio from storage: {e}",
        )

    content_length = end_byte - start_byte + 1
    headers = {
        "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "audio/wav",
    }

    status_code = status.HTTP_206_PARTIAL_CONTENT if range_header else status.HTTP_200_OK

    return StreamingResponse(
        stream_gen(),
        status_code=status_code,
        headers=headers,
        media_type="audio/wav",
    )
