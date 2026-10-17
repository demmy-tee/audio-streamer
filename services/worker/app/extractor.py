import json
import logging
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.config import get_settings
from app.stt import STTSegment

logger = logging.getLogger("worker-extractor")
settings = get_settings()


class EvidenceCitationExtracted(BaseModel):
    quote_text: str = Field(description="Exact verbatim excerpt from the transcript.")
    start_ms: int = Field(description="Millisecond timestamp where quote starts.")
    end_ms: int = Field(description="Millisecond timestamp where quote ends.")
    speaker_name: Optional[str] = Field(None, description="Speaker who uttered the quote.")


class CommitmentExtracted(BaseModel):
    task_description: str = Field(description="Concrete task or action item.")
    owner_name: Optional[str] = Field(None, description="Explicit owner name. MUST be null if unassigned.")
    is_owner_assigned: bool = Field(description="False if task has no named owner.")
    deadline_raw: Optional[str] = Field(None, description="Verbatim deadline expression used in dialogue.")
    missing_date_context: bool = Field(
        description="True if relative date like 'next Wednesday' has no calendar date anchor."
    )
    status: Literal["ACTIVE", "CANCELLED", "PROPOSAL_UNACCEPTED", "INCONCLUSIVE"] = Field(
        description="Terminal state of commitment."
    )
    rationale: str = Field(description="Brief explanation of why this state was assigned.")
    citations: List[EvidenceCitationExtracted] = Field(
        min_length=1,
        description="Quotes and timestamps supporting this agreement, correction, or cancellation.",
    )


class UnresolvedQuestionExtracted(BaseModel):
    question_text: str = Field(description="Question raised that received no resolution.")
    asked_by: Optional[str] = Field(None, description="Speaker who raised the question.")
    supporting_quote: str = Field(description="Verbatim question quote from dialogue.")
    start_ms: Optional[int] = None
    end_ms: Optional[int] = None


class ConversationAnalysisResult(BaseModel):
    speakers_identified: List[str] = Field(description="Names of speakers who introduced themselves.")
    is_inconclusive: bool = Field(description="True if conversation lacked concrete commitments.")
    inconclusive_reason: Optional[str] = Field(None, description="Explanation if inconclusive.")
    commitments: List[CommitmentExtracted] = Field(default_factory=list)
    unresolved_questions: List[UnresolvedQuestionExtracted] = Field(default_factory=list)


SYSTEM_PROMPT = """You are a rigorous, legal-grade Project Commitments Extraction Engine.
Analyze the provided timestamped transcript and return a structured JSON commitments list.

STRICT CONSTRAINTS (ZERO TOLERANCE FOR HALLUCINATION):
1. PROPOSALS VS AGREEMENTS:
   - "We could..." / "Maybe we can..." / "What if we..." is a PROPOSAL, NOT an agreed task.
   - If other speakers do not agree, reject it, or ignore it, mark as status: "PROPOSAL_UNACCEPTED". Never mark "ACTIVE".
2. REVISED DEADLINES:
   - If a deadline is proposed (e.g. Tuesday) but corrected later (e.g. Wednesday 3 PM) and accepted,
     retain ONLY the final agreed deadline ("Wednesday at 3 PM"). Do NOT keep the earlier deadline.
3. CANCELLED / RETRACTED TASKS:
   - If a commitment was agreed earlier, but later in the dialogue a speaker cancels or retracts it
     (e.g. "scratch the slides, I won't do it"), mark status: "CANCELLED". Do NOT present as active.
4. UNASSIGNED TASKS:
   - If a task must be done ("Someone needs to check CORS"), but nobody agrees to own it,
     set owner_name: null, is_owner_assigned: false. DO NOT infer ownership from speaker proximity.
5. RELATIVE DATES & MISSING CONTEXT:
   - If a deadline says "next Wednesday" or "tomorrow", preserve the exact wording in deadline_raw.
   - Set missing_date_context: true because there is no calendar date anchor.
6. EVIDENCE GROUNDING:
   - Every single commitment MUST have at least one citation with start_ms, end_ms, and exact verbatim quote.
7. UNRESOLVED QUESTIONS:
   - Identify questions asked that were left open or deflected without an answer.
8. INCONCLUSIVE CONVERSATIONS:
   - If speakers only brainstormed without agreeing on any commitments, set is_inconclusive: true with a clear reason.
"""


class CommitmentExtractor:
    def __init__(self):
        self.settings = get_settings()

    async def extract(self, segments: List[STTSegment]) -> ConversationAnalysisResult:
        """Extracts structured commitments using LLM with Pydantic validation."""
        transcript_text = "\n".join(
            f"[{seg.start_ms}ms - {seg.end_ms}ms] {seg.text}"
            for seg in segments
        )

        user_prompt = f"Timestamped Dialogue Transcript:\n\n{transcript_text}\n\nReturn strictly valid JSON matching ConversationAnalysisResult schema."

        if self.settings.OPENAI_API_KEY:
            return await self._extract_openai(user_prompt)

        if self.settings.GROQ_API_KEY:
            return await self._extract_groq(user_prompt)

        raise ValueError("Missing API key for extraction.")

    async def _extract_openai(self, user_prompt: str) -> ConversationAnalysisResult:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format=ConversationAnalysisResult,
            temperature=0.0,
        )
        return response.choices[0].message.parsed

    async def _extract_groq(self, user_prompt: str) -> ConversationAnalysisResult:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=self.settings.GROQ_API_KEY)
        schema_json = json.dumps(ConversationAnalysisResult.model_json_schema())

        # Models available on Groq that support JSON schema formatting
        candidate_models = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
        ]

        last_error = None
        for model_name in candidate_models:
            try:
                logger.info(f"Extracting commitments via Groq ({model_name})...")
                response = await client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": f"{SYSTEM_PROMPT}\nYou must respond strictly with valid JSON conforming to this JSON schema:\n{schema_json}",
                        },
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.0,
                )

                content = response.choices[0].message.content
                return ConversationAnalysisResult.model_validate_json(content)
            except Exception as e:
                logger.warning(f"Groq extraction failed with {model_name}: {e}. Retrying next model...")
                last_error = e

        raise last_error or RuntimeError("Groq extraction failed across all candidate models.")


extractor = CommitmentExtractor()
