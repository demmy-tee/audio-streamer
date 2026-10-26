import logging
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Conversation, ConversationStatus
from app.db.session import get_db
from app.pipeline.processor import process_conversation_task
from app.storage import storage_service

logger = logging.getLogger("audio-routes")
router = APIRouter(prefix="/api/v1/audio", tags=["Audio Streaming & Upload"])

ALLOWED_MIME_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/vnd.wave",
    "audio/mpeg",
    "audio/mp3",
    "audio/m4a",
    "audio/x-m4a",
    "audio/mp4",
    "video/mp4",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/flac",
    "application/octet-stream",
}
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".aac", ".flac"}
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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads an audio file (.wav, .mp3, .m4a):
    1. Validates content type and size limits.
    2. Uploads raw audio bytes to S3/local storage.
    3. Computes SHA-256 fingerprint for deduplication.
    4. Creates initial Conversation record in PostgreSQL.
    5. Dispatches background transcription and extraction task.
    """
    filename = file.filename or "recording.wav"
    ext = Path(filename).suffix.lower()
    is_valid_type = (file.content_type in ALLOWED_MIME_TYPES) or (ext in ALLOWED_EXTENSIONS)

    if file.content_type and not is_valid_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Supported: WAV, MP3, M4A, OGG, WEBM.",
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

    # Trigger background transcription and commitments extraction
    background_tasks.add_task(process_conversation_task, str(conversation.id))

    return ConversationUploadResponse(
        conversation_id=str(conversation.id),
        title=conversation.title,
        status=conversation.status.value,
        audio_s3_key=conversation.audio_s3_key,
        sha256=conversation.audio_sha256,
        message="Audio uploaded successfully. Processing initiated.",
    )


@router.api_route(
    "/{conversation_id}/stream",
    methods=["GET", "HEAD"],
    summary="Stream audio with HTTP 206 Partial Content Range support and HEAD probing",
)
async def stream_audio(
    request: Request,
    conversation_id: str,
    range_header: str | None = Header(None, alias="Range"),
    db: AsyncSession = Depends(get_db),
):
    """
    Streams audio bytes for a conversation.
    Supports HTTP Range requests (HTTP 206) and HEAD requests so browser audio players
    can probe audio length and seek/jump to timestamped quotes instantly.
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

    # Determine dynamic content type based on file extension
    ext = conversation.audio_s3_key.lower().rsplit(".", 1)[-1] if "." in conversation.audio_s3_key else "wav"
    content_type_map = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "mp4": "audio/mp4",
        "ogg": "audio/ogg",
        "opus": "audio/opus",
        "flac": "audio/flac",
        "webm": "audio/webm",
    }
    content_type = content_type_map.get(ext, "audio/wav")

    stream_gen = None
    start_byte = 0
    end_byte = 0
    total_size = 0

    try:
        stream_gen, start_byte, end_byte, total_size = await storage_service.get_audio_stream(
            s3_key=conversation.audio_s3_key,
            byte_range=range_header,
        )
    except Exception as s3_err:
        logger.warning(f"S3 stream failed for {conversation.audio_s3_key}: {s3_err}. Checking local fallback...")
        local_path = None
        candidates = [
            Path("/samples/audio"),
            Path(__file__).resolve().parent.parent.parent.parent.parent / "samples" / "audio",
            Path.cwd() / "samples" / "audio",
        ]
        target_name = conversation.audio_s3_key.split("/")[-1]
        sample_map = {
            "sample_01.wav": "conversation_01_core.wav",
            "sample_02.wav": "conversation_02_variant.wav",
            "sample_03.wav": "conversation_03_ambiguous.wav",
        }
        fallback_name = sample_map.get(target_name, target_name)

        for c_dir in candidates:
            cand = c_dir / fallback_name
            if cand.exists():
                local_path = cand
                break

        if not local_path or not local_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not retrieve audio from storage: {s3_err}",
            )

        total_size = local_path.stat().st_size
        start_byte = 0
        end_byte = total_size - 1

        if range_header and range_header.startswith("bytes="):
            parts = range_header.replace("bytes=", "").split("-")
            if parts[0]:
                start_byte = int(parts[0])
            if len(parts) > 1 and parts[1]:
                end_byte = int(parts[1])

        start_byte = max(0, start_byte)
        end_byte = min(total_size - 1, end_byte)

        async def local_stream_gen():
            with open(local_path, "rb") as f:
                f.seek(start_byte)
                bytes_left = end_byte - start_byte + 1
                while bytes_left > 0:
                    chunk = f.read(min(64 * 1024, bytes_left))
                    if not chunk:
                        break
                    bytes_left -= len(chunk)
                    yield chunk

        stream_gen = local_stream_gen

    if range_header and start_byte >= total_size:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            headers={"Content-Range": f"bytes */{total_size}"},
        )

    content_length = end_byte - start_byte + 1
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": content_type,
    }

    # RFC 7233: Content-Range MUST only be included on 206 Partial Content
    status_code = status.HTTP_200_OK
    if range_header:
        status_code = status.HTTP_206_PARTIAL_CONTENT
        headers["Content-Range"] = f"bytes {start_byte}-{end_byte}/{total_size}"

    # Respond to HEAD requests with metadata only (no body)
    if request.method == "HEAD":
        return Response(
            status_code=status_code,
            headers=headers,
            media_type=content_type,
        )

    return StreamingResponse(
        stream_gen(),
        status_code=status_code,
        headers=headers,
        media_type=content_type,
    )
