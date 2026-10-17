# Delivery Notes: Recorded Conversation to Final Commitments

**Candidate:** Daniel  
**Role:** Product Builder / Senior Software Engineer  
**Company:** Codebridge Technology, Inc.  
**Repository:** [github.com/demmy-tee/audio-streamer](https://github.com/demmy-tee/audio-streamer)  

---

## 1. Executive Summary & Core Flow

This product converts uploaded project discussions (audio recordings up to 3 minutes) into a **verifiable, legal-grade commitments list**. Unlike generic meeting summarizers that hallucinate intent or summarize conversational noise, this engine strictly isolates:
- **Final agreed tasks** (active status with named owner and agreed deadline).
- **Cancelled/retracted tasks** (marked with terminal cancelled status and justification).
- **Discarded proposals** (unaccepted suggestions kept out of the active commitments).
- **Unassigned tasks** (preserves task without guessing an owner from conversational proximity).
- **Relative deadlines without calendar base** (flagged with `missing_date_context: true`).
- **Unresolved questions** (flagged as open action items).
- **Verbatim supporting quotations with millisecond timestamps**: Users can click any quotation in the web interface to immediately scrub the audio player to that exact second and listen to the dialogue.

---

## 2. Sample Inputs & Evaluation Matrix (Inclusion vs. Exclusion)

We authored three reproducible benchmark recordings using macOS native multi-voice synthesis (`Daniel` - en_GB male; `Samantha` - en_US female) and recorded the expected outcomes in ground truth JSON files *prior* to testing.

| Test Case | Embedded Semantic Traps | Expected Behavior | Actual System Output | Verdict |
|---|---|---|---|---|
| **Conversation 1 (`conversation_01_core.wav`)** (102.8s) | • Unaccepted proposal: Rewrite in Rust<br>• Corrected deadline: Tuesday $\to$ Wednesday 3 PM<br>• Cancelled task: Investor slides retracted<br>• Unassigned task: MinIO CORS config<br>• Unresolved question: Whisper API keys | • Rust proposal excluded from active tasks<br>• Wednesday 3 PM retained (Tuesday discarded)<br>• Slides marked CANCELLED<br>• CORS task owner is NULL<br>• Question extracted with asker quote | • Status: `PROPOSAL_UNACCEPTED`<br>• Deadline: `"Wednesday at 3 PM"`<br>• Status: `CANCELLED`<br>• `owner_name: null`, `is_owner_assigned: false`<br>• Question extracted with quote | **100% Pass ✅** |
| **Conversation 2 (`conversation_02_variant.wav`)** (107.8s) | • Agreement Delta: Elena accepts Daniel's Rust rewrite proposal | • Dynamic delta detection: Rust rewrite becomes an ACTIVE task owned by Daniel | • Rust rewrite correctly promoted to `ACTIVE`, `owner_name: "Daniel"` | **100% Pass ✅** |
| **Conversation 3 (`conversation_03_ambiguous.wav`)** (47.9s) | • Brainstorming without decision: All ideas deferred pending budget | • System declines to conclude; reports inconclusive status with explanation | • `is_inconclusive: true`<br>• Reason: *"The conversation consisted entirely of preliminary brainstorming without commitments."* | **100% Pass ✅** |

---

## 3. Measured Speed & Variable Cost Model

Measurements were conducted across 102 seconds of continuous dialogue (~1.7 audio minutes).

### 3.1 Measured Processing Speed (Time to Useful Result)
- **Audio Ingestion & S3 Upload**: ~120 ms
- **Speech-to-Text Transcription**:
  - Groq Whisper Large-v3: **0.87 seconds**
  - OpenAI Whisper-1: **3.82 seconds**
- **Structured Commitment Extraction (LLM)**: **1.64 seconds** (Gemini 2.5 Flash / GPT-4o-mini)
- **Database Write & Serialization**: ~45 ms
- **Total Time to Useful Result**: **~2.6s (Groq pipeline) / ~5.6s (OpenAI pipeline)**
  - *Result: Fully interactive, well under standard user attention drop-off (< 10 seconds).*

### 3.2 Itemized Variable Cost (Per Audio Minute)
| Operation | Provider & Model | Pricing Assumption | Variable Cost / Audio Min |
|---|---|---|---|
| **Speech Recognition (STT)** | Groq Whisper Large-v3<br>*(or OpenAI Whisper-1)* | \$0.0010 / min<br>*\(\$0.0060 / min\)* | **\$0.0010**<br>*\(\$0.0060\)* |
| **Reasoning & Extraction** | Gemini 2.5 Flash / GPT-4o-mini | ~350 in tok + ~300 out tok per min | **\$0.0003** |
| **Audio Storage & Egress** | MinIO on Persistent Disk / S3 | \$0.023 / GB / month (~1.5MB/min) | **\$0.0001** |
| **Total Variable Cost** | | | **~\$0.0014 – \$0.0064 / audio min** |

*Fixed Infrastructure Hosting:* Separated at **\$7.00 / month flat** on Render (FastAPI Web Service + Worker Container + Managed PostgreSQL + Redis).

---

## 4. AI Tools, Models & Output Verification Example

### 4.1 Exact AI Tools Used
- **Transcription**: Groq Whisper Large-v3 (`whisper-large-v3`) with `response_format="verbose_json"` to capture millisecond word/segment timestamps.
- **Reasoning**: OpenAI `gpt-4o-mini` with Pydantic v2 `response_format=ConversationAnalysisResult` (or Groq `openai/gpt-oss-120b` with JSON schema enforcement).

### 4.2 Example: How We Checked & Corrected AI Output
During initial prompt testing, a naive prompt resulted in a hallucination on the unassigned task:
- **Dialogue**: *Daniel: "Someone needs to configure MinIO CORS..." Elena: "Agreed, let's leave it unassigned for now."*
- **Naive Output**: Assigned `owner_name: "Daniel"` simply because Daniel spoke first.
- **Verification & Fix**: We added strict schema-level guardrails:
  1. Required an explicit boolean `is_owner_assigned: bool`.
  2. Prompt constraint: *"If a task must be done, but nobody agrees to own it, set `owner_name: null`, `is_owner_assigned: false`. DO NOT infer ownership from speaker proximity."*
  3. Regression test verified against `ground_truth_01.json` confirming `owner_name: null`.

---

## 5. What Failed & Technical Edge Cases Encountered

1. **Audio Scrubbing in Browsers without HTTP 206**:
   - Initial naive audio streaming returned full file responses (`HTTP 200`). When clicking quotation timestamps at second `59`, the browser audio player was forced to buffer from second `0`, causing perceptible playback lag.
   - *Fix:* Replaced with an **HTTP 206 Partial Content** range streamer that passes `Range: bytes=start-end` to MinIO S3 and streams 64KB chunks back to the browser with `Accept-Ranges: bytes` and `Content-Range` headers.
2. **CORS Restrictions on Cloud Platforms**:
   - Vercel preview deployments generate dynamic subdomains (`*.vercel.app`).
   - *Fix:* Implemented `allow_origin_regex=r"^https:\/\/.*\.vercel\.app$"` in FastAPI CORS middleware.
3. **Missing API Keys UX**:
   - Avoided dumping technical environment variables to the user. When keys are missing, the UI presents a minimal status: `"Missing API key"`.

---

## 6. Time Spent
- **Architecture & System Design**: ~1.0 hour
- **Repository Setup, Multi-Service Docker & CI/CD**: ~1.5 hours
- **Synthetic Test Dataset & Ground Truth JSONs**: ~1.0 hour
- **PostgreSQL Async Models & MinIO Range Streaming**: ~1.5 hours
- **Worker AI Pipeline (Whisper STT + Zero-Hallucination Extractor)**: ~1.5 hours
- **Next.js 16 Interactive UI with Audio Scrubbing**: ~1.0 hour
- **Benchmarking & Documentation**: ~0.5 hour
- **Total Focused Time**: **~8.0 working hours**

---

## 7. Product Judgment & Next Steps (V2 Roadmap)

### 7.1 What Was Deliberately Kept Out of Scope
- **Calendar & Slack Integration**: Kept out of scope per brief instructions to focus 100% on core extraction accuracy.
- **Complex Authentication**: Used simple session isolation rather than multi-tenant OAuth, allowing reviewers to evaluate the core flow in 1 click.

### 7.2 What to Improve Next (V2 Roadmap)
1. **Interactive Human-in-the-Loop Dispute Resolution**:
   - If a commitment has borderline confidence (e.g. an ambiguous deadline), allow the user to click "Clarify" to type or speak a clarification that re-grounds the quote.
2. **Speaker Diarization with Voice Embeddings**:
   - For conversations where speakers do not introduce themselves, integrate pyannote.audio or Deepgram Nova-2 diarization clustering.
3. **Cross-Meeting Semantic Search (pgvector)**:
   - Index commitments across a company's past 1,000 meetings to allow search: *"Show all commitments owned by Daniel due this week."*
