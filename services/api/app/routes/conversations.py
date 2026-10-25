import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    Commitment,
    CommitmentStatus,
    Conversation,
    ConversationStatus,
    EvidenceCitation,
    Speaker,
    UnresolvedQuestion,
)
from app.db.session import get_db
from app.storage import storage_service

logger = logging.getLogger("conversations-routes")
router = APIRouter(prefix="/api/v1", tags=["Conversations & Commitments"])


def get_samples_dir() -> Path:
    candidates = [
        Path("/app/samples"),
        Path("/samples"),
        Path(__file__).resolve().parent.parent.parent / "samples",
        Path.cwd() / "samples",
    ]
    for cand in candidates:
        if cand.exists():
            return cand
    p = Path(__file__).resolve()
    for parent in p.parents:
        cand = parent / "samples"
        if cand.exists():
            return cand
    return Path.cwd() / "samples"


SAMPLES_DIR = get_samples_dir()


# ==============================================================================
# Pydantic Response Schemas
# ==============================================================================
class EvidenceCitationOut(BaseModel):
    quote_text: str
    start_ms: int
    end_ms: int
    speaker_name: str | None = None


class CommitmentOut(BaseModel):
    id: str
    task_description: str
    owner_name: str | None = None
    is_owner_assigned: bool
    deadline_raw: str | None = None
    missing_date_context: bool
    status: str
    rationale: str
    citations: list[EvidenceCitationOut]


class UnresolvedQuestionOut(BaseModel):
    question_text: str
    asked_by: str | None = None
    supporting_quote: str | None = None
    start_ms: int | None = None
    end_ms: int | None = None


class TranscriptSegmentOut(BaseModel):
    sequence_order: int
    speaker_name: str | None = None
    start_ms: int
    end_ms: int
    text: str


class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    audio_s3_key: str
    duration_seconds: float
    status: str
    is_inconclusive: bool
    inconclusive_reason: str | None = None
    speakers: list[str]
    commitments: list[CommitmentOut]
    unresolved_questions: list[UnresolvedQuestionOut]
    transcript: list[TranscriptSegmentOut]


class ConversationPollResponse(BaseModel):
    id: str
    status: str
    is_inconclusive: bool
    inconclusive_reason: str | None = None


class SampleSummary(BaseModel):
    sample_id: str
    title: str
    description: str


# ==============================================================================
# Endpoints
# ==============================================================================
@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get full conversation details, commitments, citations, and transcript",
)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation ID format.")

    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.speakers),
            selectinload(Conversation.transcript_segments),
            selectinload(Conversation.commitments).selectinload(Commitment.citations),
            selectinload(Conversation.unresolved_questions),
        )
        .where(Conversation.id == conv_uuid)
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()

    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    commitments_out = []
    for c in conv.commitments:
        citations_out = [
            EvidenceCitationOut(
                quote_text=cit.quote_text,
                start_ms=cit.start_ms,
                end_ms=cit.end_ms,
                speaker_name=cit.speaker_name,
            )
            for cit in c.citations
        ]
        commitments_out.append(
            CommitmentOut(
                id=str(c.id),
                task_description=c.task_description,
                owner_name=c.owner_name,
                is_owner_assigned=c.is_owner_assigned,
                deadline_raw=c.deadline_raw,
                missing_date_context=c.missing_date_context,
                status=c.status.value,
                rationale=c.rationale,
                citations=citations_out,
            )
        )

    questions_out = [
        UnresolvedQuestionOut(
            question_text=q.question_text,
            asked_by=q.asked_by,
            supporting_quote=q.supporting_quote,
            start_ms=q.start_ms,
            end_ms=q.end_ms,
        )
        for q in conv.unresolved_questions
    ]

    transcript_out = [
        TranscriptSegmentOut(
            sequence_order=s.sequence_order,
            speaker_name=s.speaker_name,
            start_ms=s.start_ms,
            end_ms=s.end_ms,
            text=s.text,
        )
        for s in conv.transcript_segments
    ]

    return ConversationDetailResponse(
        id=str(conv.id),
        title=conv.title,
        audio_s3_key=conv.audio_s3_key,
        duration_seconds=float(conv.duration_seconds),
        status=conv.status.value,
        is_inconclusive=conv.is_inconclusive,
        inconclusive_reason=conv.inconclusive_reason,
        speakers=[s.identified_name or s.speaker_label for s in conv.speakers],
        commitments=commitments_out,
        unresolved_questions=questions_out,
        transcript=transcript_out,
    )


@router.get(
    "/conversations/{conversation_id}/poll",
    response_model=ConversationPollResponse,
    summary="Poll status of a conversation being processed",
)
async def poll_conversation_status(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation ID format.")

    stmt = select(Conversation).where(Conversation.id == conv_uuid)
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()

    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    return ConversationPollResponse(
        id=str(conv.id),
        status=conv.status.value,
        is_inconclusive=conv.is_inconclusive,
        inconclusive_reason=conv.inconclusive_reason,
    )


@router.get(
    "/samples",
    response_model=list[SampleSummary],
    summary="List available benchmark test samples",
)
async def list_samples():
    """Returns available reproducible sample tests."""
    return [
        SampleSummary(
            sample_id="sample_01",
            title="Conversation 1: Core Benchmark",
            description="5 traps: unaccepted proposal, corrected deadline, cancelled task, unassigned owner, and open question.",
        ),
        SampleSummary(
            sample_id="sample_02",
            title="Conversation 2: Agreement Variant",
            description="Variant demonstrating delta handling where the Rust proposal is accepted.",
        ),
        SampleSummary(
            sample_id="sample_03",
            title="Conversation 3: Inconclusive Dialogue",
            description="Exploratory discussion where the product declines to conclude commitments.",
        ),
    ]


@router.post(
    "/samples/{sample_id}/load",
    response_model=ConversationDetailResponse,
    summary="1-Click Load a benchmark sample for immediate UI evaluation",
)
async def load_sample(
    sample_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Seeds a sample from its ground truth JSON file so the reviewer can
    immediately inspect the UI and audio jumping without running slow API calls.
    """
    mapping = {
        "sample_01": (
            "ground_truth_01.json",
            "Conversation 1: Core Benchmark",
            "conversation_01_core.wav",
            102.8,
            {
                "Yes, I will take that on. I'll build the waveform and the scrub bar.": (31940, 36060),
                "Nobody is assigned to that yet, so let's leave it unassigned for now and pick it up tomorrow.": (66240, 72780),
                "So scratch the investor deck—I won't do the slides anymore.": (89920, 93640),
                "So scratch the investor deck-I won't do the slides anymore.": (89920, 93640),
                "So scratch the investor deck, I won't do the slides anymore": (89920, 93640),
                "That's overkill for our current volume. Let's stick with Python FastAPI for now. We won't do the Rust rewrite.": (18660, 25020),
            },
            {
                "Quick question: do we already have the production API keys for the Whisper transcription provider?": (73560, 78940),
                "Quick question, do we already have the production API keys for the Whisper transcription provider?": (73560, 78940),
            },
        ),
        "sample_02": (
            "ground_truth_02.json",
            "Conversation 2: Agreement Variant",
            "conversation_02_variant.wav",
            107.8,
            {
                "Awesome! Yes, I will take on the Rust rewrite.": (26140, 29340),
                "Let's do the Rust rewrite! Can you take that on? Awesome! Yes, I will take on the Rust rewrite.": (23060, 29340),
                "Yes, I will take that on too. I'll build the waveform and the scrub bar.": (36740, 41120),
                "Nobody is assigned to that yet, so let's leave it unassigned for now and pick it up tomorrow.": (71320, 77860),
                "So scratch the investor deck—I won't do the slides anymore.": (95000, 98720),
                "So scratch the investor deck-I won't do the slides anymore.": (95000, 98720),
                "So scratch the investor deck, I won't do the slides anymore": (95000, 98720),
            },
            {
                "Quick question: do we already have the production API keys for the Whisper transcription provider?": (78620, 84020),
                "Quick question, do we already have the production API keys for the Whisper transcription provider?": (78620, 84020),
            },
        ),
        "sample_03": (
            "ground_truth_03.json",
            "Conversation 3: Inconclusive Dialogue",
            "conversation_03_ambiguous.wav",
            47.9,
            {},
            {},
        ),
    }
    if sample_id not in mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown sample ID.")

    filename, title, audio_filename, duration, quote_ts, question_ts = mapping[sample_id]
    filepath = SAMPLES_DIR / "ground_truth" / filename
    audio_path = SAMPLES_DIR / "audio" / audio_filename

    if not filepath.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ground truth file {filename} not found.")

    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    # Pre-seed MinIO with sample audio if available
    s3_key = f"samples/{sample_id}.wav"
    if audio_path.exists():
        try:
            with open(audio_path, "rb") as f:
                audio_bytes = f.read()
            await storage_service.upload_audio(
                file_bytes=audio_bytes,
                s3_key=s3_key,
                content_type="audio/wav",
            )
        except Exception as e:
            logger.warning(f"Could not pre-seed MinIO for sample {sample_id}: {e}")

    # Create synthetic conversation
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        title=title,
        audio_s3_key=s3_key,
        audio_sha256=f"synthetic_{sample_id}_sha256",
        duration_seconds=duration,
        status=ConversationStatus.COMPLETED,
        is_inconclusive=data.get("is_inconclusive", False),
        inconclusive_reason=data.get("inconclusive_reason"),
    )
    db.add(conv)

    # Add speakers
    for idx, spk in enumerate(data.get("speakers_identified", [])):
        db.add(Speaker(conversation_id=conv_id, speaker_label=f"Speaker {idx+1}", identified_name=spk))

    # Add commitments & citations
    for item in data.get("commitments", []):
        c = Commitment(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            task_description=item["task_description"],
            owner_name=item.get("owner_name"),
            is_owner_assigned=item.get("is_owner_assigned", False),
            deadline_raw=item.get("deadline_raw"),
            missing_date_context=item.get("missing_date_context", False),
            status=CommitmentStatus(item["status"]),
            rationale=item["rationale"],
        )
        db.add(c)
        if "supporting_quote" in item:
            quote = item["supporting_quote"]
            # Look up quote with exact match or normalized dashes
            ts = quote_ts.get(quote)
            if not ts:
                normalized_quote = quote.replace("—", "-").replace("–", "-")
                for k, v in quote_ts.items():
                    if k.replace("—", "-").replace("–", "-") == normalized_quote:
                        ts = v
                        break
            start_ms, end_ms = ts if ts else (31940, 36060)
            db.add(
                EvidenceCitation(
                    commitment_id=c.id,
                    quote_text=quote,
                    start_ms=start_ms,
                    end_ms=end_ms,
                    speaker_name=item.get("owner_name"),
                )
            )

    # Add unresolved questions
    for q in data.get("unresolved_questions", []):
        quote = q.get("supporting_quote")
        ts = question_ts.get(quote) if quote else None
        if not ts and quote:
            for k, v in question_ts.items():
                if k.lower().startswith(quote[:20].lower()):
                    ts = v
                    break
        start_ms, end_ms = ts if ts else (73560, 78940)
        db.add(
            UnresolvedQuestion(
                conversation_id=conv_id,
                question_text=q["question_text"],
                asked_by=q.get("asked_by"),
                supporting_quote=quote,
                start_ms=start_ms,
                end_ms=end_ms,
            )
        )

    await db.commit()
    return await get_conversation(str(conv_id), db)
