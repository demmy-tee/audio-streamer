import io
import logging
from typing import List, Tuple

from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger("api-stt")
settings = get_settings()


class MissingAPIKeyError(Exception):
    """Raised when audio processing is attempted without an API key."""
    pass


class STTSegment(BaseModel):
    sequence_order: int
    speaker_name: str | None = None
    start_ms: int
    end_ms: int
    text: str


class STTService:
    def __init__(self):
        self.settings = get_settings()

    async def transcribe(self, audio_bytes: bytes, filename: str = "audio.wav") -> Tuple[List[STTSegment], float]:
        """
        Transcribes audio bytes into timestamped segments.
        Returns: (segments, duration_seconds)
        """
        if not self.settings.has_ai_credentials:
            raise MissingAPIKeyError("Missing API key")

        # 1. Prefer Groq Whisper (ultra-fast sub-second transcription)
        if self.settings.GROQ_API_KEY:
            return await self._transcribe_groq(audio_bytes, filename)

        # 2. Fallback to OpenAI Whisper
        if self.settings.OPENAI_API_KEY:
            return await self._transcribe_openai(audio_bytes, filename)

        raise MissingAPIKeyError("Missing API key")

    async def _transcribe_groq(self, audio_bytes: bytes, filename: str) -> Tuple[List[STTSegment], float]:
        from groq import AsyncGroq

        if not any(filename.lower().endswith(ext) for ext in [".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"]):
            filename = f"{filename}.wav"

        client = AsyncGroq(api_key=self.settings.GROQ_API_KEY)
        audio_file = (filename, audio_bytes)

        logger.info(f"Transcribing audio via Groq Whisper-large-v3 ({filename})...")
        response = await client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            response_format="verbose_json",
        )

        return self._parse_verbose_json(response)

    async def _transcribe_openai(self, audio_bytes: bytes, filename: str) -> Tuple[List[STTSegment], float]:
        from openai import AsyncOpenAI

        if not any(filename.lower().endswith(ext) for ext in [".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"]):
            filename = f"{filename}.wav"

        client = AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        logger.info(f"Transcribing audio via OpenAI Whisper-1 ({filename})...")
        response = await client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="verbose_json",
        )

        return self._parse_verbose_json(response)

    def _parse_verbose_json(self, response) -> Tuple[List[STTSegment], float]:
        raw_segments = getattr(response, "segments", []) or []
        duration = float(getattr(response, "duration", 0.0) or 0.0)

        segments: List[STTSegment] = []
        for idx, seg in enumerate(raw_segments):
            start_sec = getattr(seg, "start", 0.0) if hasattr(seg, "start") else seg.get("start", 0.0)
            end_sec = getattr(seg, "end", 0.0) if hasattr(seg, "end") else seg.get("end", 0.0)
            text = getattr(seg, "text", "").strip() if hasattr(seg, "text") else seg.get("text", "").strip()

            start_ms = int(float(start_sec) * 1000)
            end_ms = int(float(end_sec) * 1000)

            segments.append(
                STTSegment(
                    sequence_order=idx + 1,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    text=text,
                )
            )

        if not duration and segments:
            duration = segments[-1].end_ms / 1000.0

        return segments, duration


stt_service = STTService()
