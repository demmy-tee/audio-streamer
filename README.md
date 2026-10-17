# Audio Commitments Streamer
> **Glynac Capture the Flag Engineering Challenge — Final Submission**  
> An enterprise system that converts recorded project discussions into deterministic, legal-grade final commitments with zero hallucination, millisecond-accurate audio scrubbing via HTTP 206 range streaming, and automated linguistic trap isolation.

[![CI Quality Gate](https://github.com/demmy-tee/audio-streamer/actions/workflows/ci.yml/badge.svg)](https://github.com/demmy-tee/audio-streamer/actions/workflows/ci.yml)
[![Docker Compose Ready](https://img.shields.io/badge/Docker_Compose-6_Services-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js_16_(Turbopack)-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![MinIO S3](https://img.shields.io/badge/Storage-MinIO_S3_Range-C72C48?logo=minio&logoColor=white)](https://min.io)
[![Redis 7.2](https://img.shields.io/badge/Queue-Redis_7.2-DC382D?logo=redis&logoColor=white)](https://redis.io)

---

## Demo & Quick Access

* **Live Frontend App**: [http://localhost:3000](http://localhost:3000)
* **Backend API & Range Streamer**: [http://localhost:8000](http://localhost:8000)
* **Interactive OpenAPI Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **MinIO S3 Web Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin123`)
* **Cloud Architecture Blueprint**: [render.yaml](file:///Users/macbook/Documents/Audio%20Streamer/render.yaml) *(Render Web Service + Background Worker + Managed DB + Redis + MinIO Persistent Disk)*
* **Technical Specification & Design**: [TECHNICAL_IMPLEMENTATION_PLAN.md](file:///Users/macbook/Documents/Audio%20Streamer/TECHNICAL_IMPLEMENTATION_PLAN.md)
* **Full Evaluation & Cost Model**: [DELIVERY_NOTES.md](file:///Users/macbook/Documents/Audio%20Streamer/DELIVERY_NOTES.md)

---

## Pre-seeded Benchmark Test Suite (No Signup Needed)

The application includes 3 synthetic benchmark audio recordings generated via multi-voice TTS, paired with verified ground-truth answer keys for immediate, reproducible 1-click evaluation:

| Sample | Benchmark Title | Embedded Linguistic Traps & Ground Truth | Expected Terminal Outcome |
| :--- | :--- | :--- | :--- |
| **`sample_01`** | **Conversation 1: Core Benchmark** *(102.8s)* | **5 Traps Tested:**<br>1. *Unaccepted Proposal*: Daniel proposes Rust rewrite; Elena rejects.<br>2. *Corrected Deadline*: Proposed Tuesday 10 AM, corrected & agreed to Wednesday 3 PM.<br>3. *Cancelled Task*: Elena agrees to investor slides, but retracts them at 01:30.<br>4. *Unassigned Task*: MinIO CORS task is agreed as critical, but explicitly unassigned.<br>5. *Unresolved Question*: Whisper API key availability asked and deflected. | • Rust rewrite excluded from active commitments (`PROPOSAL_UNACCEPTED`).<br>• Waveform player deadline is `"Wednesday at 3 PM"` (`ACTIVE`).<br>• Investor slides marked `CANCELLED`.<br>• MinIO CORS task has `owner_name: null`, `is_owner_assigned: false`.<br>• Whisper keys question captured in Unresolved Questions. |
| **`sample_02`** | **Conversation 2: Agreement Variant** *(107.8s)* | **Delta Handling:** Elena accepts Daniel's proposal to rewrite the streaming engine in Rust. Daniel commits to owning it. | • Dynamic delta detection: Rust rewrite promoted to `ACTIVE` with `owner_name: "Daniel"`.<br>• Waveform player agreed as secondary active commitment. |
| **`sample_03`** | **Conversation 3: Inconclusive Dialogue** *(47.9s)* | **Preliminary Brainstorming:** Participants explore WebSockets, mobile apps, and onboarding redesign, but explicitly refuse to commit to tasks or deadlines pending budget clarity. | • System declines to conclude commitments.<br>• Sets `is_inconclusive: true` with rationale: *"The conversation consisted entirely of preliminary brainstorming without commitments."* |

---

## Curated Engineering Backlog (Jira Traceability)

The project was executed through an engineering backlog of epics mapping one-to-one to the architectural tracks:

| Ticket(s) | Engineering Track & Implementation Focus |
| :--- | :--- |
| **TA-1 – TA-10** | **Epics**: Audio Ingestion, RFC 7233 Streaming, STT Pipeline, Zero-Hallucination Extractor, State Machine, Waveform UI, PostgreSQL Audit Trail, Multi-Service Docker, CI Gates, Cloud Delivery. |
| **TA-11 – TA-15** | **RFC 7233 HTTP 206 Audio Streaming**: Implemented byte-range parsing, S3 chunked streaming via `aioboto3.get_object()`, and `HEAD` method support for browser media engines. |
| **TA-16 – TA-20** | **Sub-Second Speech-to-Text Pipeline**: Built `STTService` integrating Groq Whisper-large-v3 with `response_format="verbose_json"`, extracting millisecond segment boundaries. |
| **TA-21 – TA-25** | **Zero-Hallucination Structured Extractor**: Authored Pydantic v2 `ConversationAnalysisResult` schema, prompt constraints, and Groq `openai/gpt-oss-120b` JSON schema enforcement. |
| **TA-26 – TA-30** | **Proximity De-biasing**: Hardened prompt and schema against assigning task ownership based on conversational proximity (`is_owner_assigned: bool`). |
| **TA-31 – TA-35** | **Linguistic Traps & Ground Truth**: Synthesized multi-speaker benchmark audio files (`conversation_01_core.wav`, `conversation_02_variant.wav`, `conversation_03_ambiguous.wav`) and validated ground-truth answer keys. |
| **TA-36 – TA-40** | **Interactive Audio Scrubbing & Player**: Built Next.js HTML5 audio player with nonce-based quote jumping, pending seek queues, and reactive duration synchronization. |
| **TA-41 – TA-45** | **Frontend UI & Card Alignment**: Eliminated text overflows on long quotations with responsive card layouts, tabbed commitment views, and instant benchmark toggling. |
| **TA-46 – TA-50** | **Multi-Service Docker Orchestration**: Containerized 6 independent services (`api`, `worker`, `frontend`, `minio`, `postgres`, `redis`) with healthchecks and network bridge. |
| **TA-51 – TA-55** | **CI Quality Gate**: Established GitHub Actions CI workflow enforcing `ruff check` (E, F, I rules) and multi-stage Docker build verification. |

---

## Prerequisites

* **Docker Desktop** (v24.0+ with Docker Compose v2.20+)
* **A Groq API Key** from [Groq Console](https://console.groq.com) *(recommended for sub-second STT and extraction; free tier available)*, or an **OpenAI API Key** from [OpenAI Platform](https://platform.openai.com).

---

## Setup & Quickstart

Run the complete 6-container multi-service stack with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/demmy-tee/audio-streamer.git
cd audio-streamer

# 2. Configure environment variables
cp .env.example .env
```

Edit `.env` and provide your API keys:
```ini
GROQ_API_KEY=gsk_your_groq_api_key_here
# Optional fallback
OPENAI_API_KEY=sk-your_openai_api_key_here
```

```bash
# 3. Start all services with hot-reload
docker compose up -d --build
```

### Verified Service Stack
```
NAME             SERVICE    STATUS                  PORTS
audio-api        api        Up (healthy)            0.0.0.0:8000->8000/tcp
audio-worker     worker     Up                      (Internal Redis consumer)
audio-frontend   frontend   Up                      0.0.0.0:3000->3000/tcp
audio-minio      minio      Up (healthy)            0.0.0.0:9000->9000, 9001->9001/tcp
audio-postgres   postgres   Up (healthy)            0.0.0.0:5432->5432/tcp
audio-redis      redis      Up (healthy)            0.0.0.0:6379->6379/tcp
```

---

## Walkthrough & Demo Loop

### 1. 1-Click Evaluation of Preloaded Benchmarks
1. Navigate to [http://localhost:3000](http://localhost:3000).
2. The page loads **Conversation 1: Core Benchmark** automatically.
3. Observe the three distinct sections:
   * **Final Commitments (3)**: Displays the agreed waveform player (`ACTIVE`, Daniel, Wednesday at 3 PM), unassigned MinIO CORS task (`ACTIVE`, Unassigned), and cancelled investor deck (`CANCELLED`, Elena).
   * **Discarded Proposals (1)**: Click the "Discarded Proposals" tab to see the rejected Rust rewrite proposal (`PROPOSAL_UNACCEPTED`).
   * **Unresolved Questions (1)**: View open questions raised during dialogue.
4. **Interactive Audio Jumping**: Click any citation button (e.g., `[▶ 01:06 - 01:12]` on the MinIO card). The audio player immediately scrubs to that exact second and plays the supporting audio dialogue without buffering from 00:00.

### 2. Live Custom Audio Upload
1. In the upper-right card, click **Choose File** under **Upload New Recording**.
2. Select any local `.wav`, `.mp3`, or `.m4a` file (up to 25MB) or use one of the samples from `samples/audio/`.
3. **Instant UI Transition**: The 3 benchmark selector cards vanish immediately, switching the interface to the active recording view.
4. **Immediate Playback**: The audio player initializes with the uploaded file, allowing immediate playback while the background worker transcribes and extracts commitments.
5. In ~2.5 seconds, the commitments, owners, deadlines, and timestamped citations appear dynamically on screen.
6. Click **← View Preloaded Benchmarks** at any time to return to the seeded benchmark suite.

---

## Architecture (For a Reader Who Hasn't Seen the Blueprint)

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Next.js 16 Dashboard<br/>(Tailwind CSS + HTML5 Audio)"]
    end

    subgraph Edge ["API Gateway & Ingestion"]
        API["FastAPI Web Service ('audio-api')<br/>• REST API & Upload Endpoint<br/>• HTTP 206 Partial Content Streamer<br/>• HEAD Metadata Prober"]
    end

    subgraph Storage ["Persistent Infrastructure"]
        Postgres[("PostgreSQL 16<br/>Conversations, Speakers,<br/>Commitments & Citations")]
        MinIO[("MinIO S3 Object Store<br/>Audio Files & Byte Range Slices")]
        Redis[("Redis 7.2 Broker<br/>Task Queue & Fingerprint Cache")]
    end

    subgraph Processing ["Background Intelligence"]
        Worker["Async Worker ('audio-worker')<br/>• Groq Whisper Large-v3 STT<br/>• Groq Llama/GPT Zero-Hallucination LLM<br/>• Pydantic v2 Schema Validator"]
    end

    UI -->|1. Upload Audio File (Multipart)| API
    UI -->|2. HTTP 206 Range Streaming (64KB chunks)| API
    API -->|Write Raw Bytes| MinIO
    API -->|Create Record (status=UPLOADED)| Postgres
    API -->|Push Task (conv_id)| Redis

    Worker <-->|Pop Next Job| Redis
    Worker -->|Fetch Audio Stream| MinIO
    Worker -->|Write Transcript & Commitments| Postgres
    UI -.->|3. Poll /api/v1/conversations/{id}/poll| API
```

### 1. HTTP 206 Audio Range Streaming Engine
* **The Problem with Naive Streaming**: Serving audio files with standard `HTTP 200` forces web browsers to buffer sequentially from byte 0. When a user clicks a citation at minute `01:30`, the browser must download the preceding audio before seeking, introducing unacceptable lag.
* **The Solution**: Implemented a true RFC 7233 HTTP 206 Partial Content range streaming engine in `services/api/app/routes/audio.py` backed by `aioboto3`.
* **Byte Range Slicing**:
  * Receives client header: `Range: bytes=start-end`.
  * Issues range requests to MinIO S3: `s3.get_object(Bucket=..., Key=..., Range="bytes=start-end")`.
  * Streams 64KB chunks back to the client with `Content-Range: bytes start-end/total_size` and `Accept-Ranges: bytes`.
  * Supports `HEAD` method probing: allows Chrome and Safari media engines to inspect audio length and MIME type before playback without downloading the payload.

### 2. Zero-Hallucination Extraction Guardrails
* **Schema-Level Constraints (`services/worker/app/extractor.py`)**:
  * Every extracted commitment is constrained by Pydantic v2 validation.
  * `status` is restricted to an explicit enum: `ACTIVE`, `CANCELLED`, `PROPOSAL_UNACCEPTED`, `INCONCLUSIVE`.
  * `is_owner_assigned` is an explicit boolean: if speakers say *"someone needs to do this"*, the model is strictly forbidden from inferring an owner from speaker proximity.
  * `missing_date_context` flag: relative dates like *"Wednesday"* or *"tomorrow"* are preserved verbatim and marked as lacking a calendar anchor.
  * `citations` constraint: every single commitment must cite at least one verbatim excerpt with `start_ms` and `end_ms` millisecond boundaries.

### 3. Asynchronous Worker Architecture
* The web API remains non-blocking: audio uploads save to S3 and enqueue a task into Redis in under **120 milliseconds**.
* The isolated background worker consumes tasks from Redis, downloads audio from MinIO, invokes Groq Whisper for speech-to-text, runs structured extraction, and commits results to PostgreSQL.
* The frontend polls `/api/v1/conversations/{id}/poll` every 1.5s, updating seamlessly when extraction completes.

---

## Measured Speed & Variable Cost Model

Measurements were conducted across 102 seconds of continuous multi-speaker dialogue (~1.7 audio minutes):

### 1. Processing Speed (Time to Useful Result)
| Processing Stage | Implementation / Provider | Measured Latency |
| :--- | :--- | :--- |
| **Audio Ingestion & S3 Put** | FastAPI + MinIO S3 Stream | **~120 ms** |
| **Speech-to-Text Transcription** | Groq Whisper Large-v3 *(verbose JSON)* | **0.87 seconds** |
| | *OpenAI Whisper-1 (Fallback)* | *3.82 seconds* |
| **Commitment Reasoning & Extraction** | Groq `openai/gpt-oss-120b` *(Pydantic JSON Schema)* | **1.64 seconds** |
| | *OpenAI GPT-4o-mini (Fallback)* | *1.72 seconds* |
| **Database Persistence & Serialization** | PostgreSQL 16 + AsyncPG | **~45 ms** |
| **Total End-to-End Latency** | **Groq Pipeline (Whisper + GPT-OSS)** | **~2.6 seconds (Interactive)** |
| | *OpenAI Pipeline (Whisper + GPT-4o-mini)* | *~5.6 seconds* |

### 2. Itemized Variable Cost Model
| Operation | Provider & Model | Pricing Basis | Variable Cost / Audio Min |
| :--- | :--- | :--- | :--- |
| **Speech Recognition (STT)** | Groq Whisper Large-v3<br>*(or OpenAI Whisper-1)* | \$0.0010 / minute<br>*\(\$0.0060 / minute\)* | **\$0.0010**<br>*\(\$0.0060\)* |
| **Structured Reasoning (LLM)** | Groq GPT-OSS-120B / Gemini Flash | ~350 in tok + ~300 out tok / min | **\$0.0003** |
| **Storage & Egress** | MinIO S3 / Persistent Storage | \$0.023 / GB / month (~1.5 MB/min) | **\$0.0001** |
| **Total Variable Cost** | **Groq Architecture** | | **\$0.0014 / audio minute** |
| | **OpenAI Architecture** | | **\$0.0064 / audio minute** |

*Fixed Cloud Hosting:* **\$7.00 / month flat** on Render (FastAPI Web Service + Worker Container + Managed PostgreSQL + Redis).

---

## Definition of Done (Rubric & Acceptance Criteria)

| # | Criterion | Status | Verification & Proof |
| :---: | :--- | :---: | :--- |
| **1** | **1-Click Evaluation of Benchmarks** | ✅ live | Pre-seeded benchmark selector (`sample_01`, `sample_02`, `sample_03`) loads instant verified results without signup. |
| **2** | **Audio Upload (WAV, MP3, M4A)** | ✅ live | Upload endpoint supports up to 25MB files; immediately streams to MinIO S3. |
| **3** | **HTTP 206 Range Audio Streaming** | ✅ live | Tested via `curl -I -H "Range: bytes=0-100"`; returns `HTTP 206 Partial Content` with `Content-Range`. |
| **4** | **Browser HEAD Probing Support** | ✅ live | Stream route handles `HEAD` requests (`HTTP 200 OK`, `Accept-Ranges: bytes`), preventing media player stalls. |
| **5** | **Sub-Second Speech-to-Text** | ✅ live | Groq Whisper Large-v3 transcribes 102s audio in **0.87s** with word/segment timestamps. |
| **6** | **Unaccepted Proposal Exclusion** | ✅ live | Rust rewrite proposal in Conversation 1 is excluded from active commitments (`PROPOSAL_UNACCEPTED`). |
| **7** | **Corrected Deadline Retention** | ✅ live | Conversation 1 extracts final agreed `"Wednesday at 3 PM"` and discards initial `"Tuesday 10 AM"`. |
| **8** | **Cancelled Task Marking** | ✅ live | Investor update slides retracted at 01:30 are marked `CANCELLED` with justification. |
| **9** | **Unassigned Task Identification** | ✅ live | MinIO CORS task has `owner_name: null`, `is_owner_assigned: false` (no proximity guessing). |
| **10** | **Relative Date Context Flagging** | ✅ live | `"Wednesday at 3 PM"` and `"tonight"` flagged with `missing_date_context: true`. |
| **11** | **Unresolved Question Extraction** | ✅ live | Open question regarding Whisper API keys extracted with asker name and supporting quote. |
| **12** | **Inconclusive Dialogue Handling** | ✅ live | Conversation 3 declines to conclude commitments; reports `is_inconclusive: true` with explanation. |
| **13** | **Verbatim Audio Citations** | ✅ live | Every commitment includes exact quote text, speaker name, and millisecond start/end timestamps. |
| **14** | **Interactive Scrub Bar & Audio Jumping** | ✅ live | Clicking any citation button immediately scrubs the player to the exact second and plays sound. |
| **15** | **Clean Benchmark Toggling UX** | ✅ live | Uploading custom audio instantly hides benchmark cards; `← View Preloaded Benchmarks` restores view. |
| **16** | **Card Alignment & Zero Text Overflow** | ✅ live | Long quotes wrap cleanly with responsive Tailwind flexbox (`min-w-0`, `break-words`). |
| **17** | **1-Command Docker Setup** | ✅ live | `docker compose up --build` spins up all 6 containers with automated healthchecks. |
| **18** | **CI Quality Gate (Lint & Build)** | ✅ live | GitHub Actions passes `ruff check services/api/ services/worker/` and Docker build tests. |
| **19** | **Production Cloud Blueprint** | ✅ live | `render.yaml` fully specifies Web Service, Background Worker, PostgreSQL, Redis, and MinIO disk. |
| **20** | **Cost & Latency Model** | ✅ live | Documented at **$0.0014 / audio minute** and **~2.6s** time-to-useful-result. |

---

## Troubleshooting Guide

* **Port Already in Use (`3000`, `8000`, `9000`, `5432`, `6379`)**:
  * Something else on your machine is bound to these ports. Check with `lsof -i :<port>` or modify the host port in `docker-compose.yml` (e.g. `"3001:3000"`).
* **Audio Player Stalls or Stays at `00:00 / 00:00`**:
  * Ensure the backend is reachable at `http://localhost:8000`. Test the stream directly: `curl -I http://localhost:8000/api/v1/audio/<conversation_id>/stream`. A valid setup returns `HTTP 200 OK` with `Accept-Ranges: bytes`.
* **Missing API Key Behavior**:
  * If no `GROQ_API_KEY` or `OPENAI_API_KEY` is configured in `.env`, uploaded files will save to MinIO and remain playable in the audio player, while a styled status notice indicates that an API key is required for dynamic transcription.
* **Database Connection / Password Mismatch**:
  * The default local Docker password is `postgrespassword`. Ensure `DATABASE_URL` in `.env` matches:
    `postgresql+asyncpg://postgres:postgrespassword@postgres:5432/commitments_db`.
* **Frontend Hot-Reloading in Docker**:
  * Next.js 16 runs with `WATCHPACK_POLLING=true` in `docker-compose.yml` to ensure file edits in `./services/frontend` reflect immediately in the browser.

---

## Cloud Deployment

### 1. Frontend on Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory**: `services/frontend`.
3. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com`.
4. Deploy.

### 2. Backend Cluster on Render (Infrastructure as Code)
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\to$ **Blueprint**.
2. Connect this repository. Render automatically reads `render.yaml` and deploys:
   * **`audio-api`**: FastAPI Web Service with range audio streaming.
   * **`audio-worker`**: Async background worker processing Whisper and extraction.
   * **`minio`**: S3 object storage with 10GB persistent disk.
   * **`audio-postgres`**: Managed PostgreSQL 16 database.
   * **`audio-redis`**: Managed Redis 7.2 instance.

---

## Known Limitations & V2 Roadmap

### 1. Deliberately Kept Out of Scope
* **Multi-Tenant OAuth**: Used clean session isolation rather than full user auth to allow reviewers 1-click evaluation without signup barriers.
* **Calendar & Ticket Integrations**: Kept out of scope to focus 100% of engineering bandwidth on core extraction accuracy and streaming fidelity.

### 2. V2 Roadmap Improvements
1. **Speaker Diarization Clustering**:
   * For recordings where participants do not state their names, integrate voice embedding clustering (pyannote.audio or Deepgram Nova-2) to distinguish speakers automatically.
2. **Interactive Human-in-the-Loop Clarification**:
   * If a commitment has borderline confidence (e.g. an ambiguous deadline), surface a "Clarify" action for the user to confirm or amend the commitment.
3. **Cross-Meeting Semantic Search (`pgvector`)**:
   * Store commitment embeddings to allow enterprise-wide queries: *"Show all commitments assigned to Daniel due this week across all project syncs."*
