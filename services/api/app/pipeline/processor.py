import logging
import uuid

from sqlalchemy import select

from app.config import get_settings
from app.db.models import (
    Commitment,
    CommitmentStatus,
    Conversation,
    ConversationStatus,
    EvidenceCitation,
    Speaker,
    TranscriptSegment,
    UnresolvedQuestion,
)
from app.db.session import AsyncSessionLocal
from app.pipeline.extractor import extractor
from app.pipeline.stt import MissingAPIKeyError, stt_service
from app.storage import storage_service

logger = logging.getLogger("api-processor")
settings = get_settings()


async def process_conversation_task(conversation_id_str: str) -> None:
    """Processes an uploaded conversation through STT and LLM extraction in background."""
    try:
        conv_id = uuid.UUID(conversation_id_str)
    except Exception as e:
        logger.error(f"Invalid UUID for conversation task: {conversation_id_str} ({e})")
        return

    async with AsyncSessionLocal() as db:
        stmt = select(Conversation).where(Conversation.id == conv_id)
        result = await db.execute(stmt)
        conv = result.scalar_one_or_none()

        if not conv:
            logger.warning(f"Conversation {conv_id} not found for processing.")
            return

        # 1. API Key check
        if not settings.has_ai_credentials:
            logger.warning(f"Failed to process {conv.id}: Missing API key.")
            conv.status = ConversationStatus.FAILED
            conv.inconclusive_reason = "Missing API key"
            await db.commit()
            return

        try:
            # 2. Stage 1: STT Transcription
            conv.status = ConversationStatus.TRANSCRIBING
            await db.commit()

            audio_bytes = await storage_service.download_audio_bytes(conv.audio_s3_key)
            audio_filename = conv.audio_s3_key.split("/")[-1]
            segments, duration = await stt_service.transcribe(audio_bytes, audio_filename)

            conv.duration_seconds = duration

            # Save transcript segments
            for seg in segments:
                db.add(
                    TranscriptSegment(
                        conversation_id=conv.id,
                        sequence_order=seg.sequence_order,
                        speaker_name=seg.speaker_name,
                        start_ms=seg.start_ms,
                        end_ms=seg.end_ms,
                        text=seg.text,
                    )
                )
            await db.commit()

            # 3. Stage 2: Commitment Extraction
            conv.status = ConversationStatus.EXTRACTING
            await db.commit()

            extraction = await extractor.extract(segments)

            conv.is_inconclusive = extraction.is_inconclusive
            conv.inconclusive_reason = extraction.inconclusive_reason

            # Save speakers
            for idx, spk in enumerate(extraction.speakers_identified):
                db.add(
                    Speaker(
                        conversation_id=conv.id,
                        speaker_label=f"Speaker {idx+1}",
                        identified_name=spk,
                    )
                )

            # Save commitments & citations
            for item in extraction.commitments:
                comm = Commitment(
                    id=uuid.uuid4(),
                    conversation_id=conv.id,
                    task_description=item.task_description,
                    owner_name=item.owner_name,
                    is_owner_assigned=item.is_owner_assigned,
                    deadline_raw=item.deadline_raw,
                    missing_date_context=item.missing_date_context,
                    status=CommitmentStatus(item.status),
                    rationale=item.rationale,
                )
                db.add(comm)

                for cit in item.citations:
                    db.add(
                        EvidenceCitation(
                            commitment_id=comm.id,
                            quote_text=cit.quote_text,
                            start_ms=cit.start_ms,
                            end_ms=cit.end_ms,
                            speaker_name=cit.speaker_name,
                        )
                    )

            # Save unresolved questions
            for q in extraction.unresolved_questions:
                db.add(
                    UnresolvedQuestion(
                        conversation_id=conv.id,
                        question_text=q.question_text,
                        asked_by=q.asked_by,
                        supporting_quote=q.supporting_quote,
                        start_ms=q.start_ms,
                        end_ms=q.end_ms,
                    )
                )

            conv.status = ConversationStatus.COMPLETED
            await db.commit()
            logger.info(f"Successfully processed conversation {conv.id} ({len(extraction.commitments)} commitments).")

        except MissingAPIKeyError:
            conv.status = ConversationStatus.FAILED
            conv.inconclusive_reason = "Missing API key"
            await db.commit()
        except Exception as e:
            logger.error(f"Error processing conversation {conv.id}: {e}", exc_info=True)
            conv.status = ConversationStatus.FAILED
            conv.inconclusive_reason = f"Processing error: {e}"
            await db.commit()
