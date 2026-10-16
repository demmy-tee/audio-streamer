import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .session import Base


class CommitmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    PROPOSAL_UNACCEPTED = "PROPOSAL_UNACCEPTED"
    INCONCLUSIVE = "INCONCLUSIVE"


class ConversationStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    TRANSCRIBING = "TRANSCRIBING"
    EXTRACTING = "EXTRACTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    audio_s3_key = Column(String(512), nullable=False)
    audio_sha256 = Column(String(64), index=True, nullable=False)
    duration_seconds = Column(Numeric(6, 2), nullable=False, default=0.0)
    status = Column(
        Enum(ConversationStatus, name="conversation_status"),
        nullable=False,
        default=ConversationStatus.UPLOADED,
    )
    is_inconclusive = Column(Boolean, nullable=False, default=False)
    inconclusive_reason = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    speakers = relationship("Speaker", back_populates="conversation", cascade="all, delete-orphan")
    transcript_segments = relationship(
        "TranscriptSegment",
        back_populates="conversation",
        order_by="TranscriptSegment.sequence_order",
        cascade="all, delete-orphan",
    )
    commitments = relationship("Commitment", back_populates="conversation", cascade="all, delete-orphan")
    unresolved_questions = relationship(
        "UnresolvedQuestion",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    speaker_label = Column(String(64), nullable=False)  # e.g. "Speaker 1"
    identified_name = Column(String(128), nullable=True)  # e.g. "Daniel"

    conversation = relationship("Conversation", back_populates="speakers")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False, index=True)
    speaker_name = Column(String(128), nullable=True)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)

    conversation = relationship("Conversation", back_populates="transcript_segments")


class Commitment(Base):
    __tablename__ = "commitments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    task_description = Column(Text, nullable=False)
    owner_name = Column(String(128), nullable=True)  # Nullable if unassigned
    is_owner_assigned = Column(Boolean, nullable=False, default=False)
    deadline_raw = Column(String(128), nullable=True)
    missing_date_context = Column(Boolean, nullable=False, default=False)
    status = Column(
        Enum(CommitmentStatus, name="commitment_status"),
        nullable=False,
        default=CommitmentStatus.ACTIVE,
    )
    rationale = Column(Text, nullable=False)

    conversation = relationship("Conversation", back_populates="commitments")
    citations = relationship("EvidenceCitation", back_populates="commitment", cascade="all, delete-orphan")


class EvidenceCitation(Base):
    __tablename__ = "evidence_citations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commitment_id = Column(UUID(as_uuid=True), ForeignKey("commitments.id", ondelete="CASCADE"), nullable=False)
    quote_text = Column(Text, nullable=False)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    speaker_name = Column(String(128), nullable=True)

    commitment = relationship("Commitment", back_populates="citations")


class UnresolvedQuestion(Base):
    __tablename__ = "unresolved_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    asked_by = Column(String(128), nullable=True)
    supporting_quote = Column(Text, nullable=True)
    start_ms = Column(Integer, nullable=True)
    end_ms = Column(Integer, nullable=True)

    conversation = relationship("Conversation", back_populates="unresolved_questions")