# Audio Commitments Streamer
> Deterministic conversation-to-commitments engine featuring millisecond-accurate audio scrubbing, zero-hallucination guardrails, and multi-service streaming architecture.

[![CI Quality Gate](https://github.com/demmy-tee/audio-streamer/actions/workflows/ci.yml/badge.svg)](https://github.com/demmy-tee/audio-streamer/actions/workflows/ci.yml)

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend: Vercel (Next.js 16)"]
        UI["Audio Waveform Player & Scrub Bar<br/>Commitment Cards & Citation Jump"]
    end

    subgraph Backend ["Backend Cluster: Render"]
        API["Web Service: 'audio-api' (FastAPI)<br/>HTTP 206 Range Audio Streaming"]
        Worker["Background Worker: 'audio-worker'<br/>Whisper STT + Zero-Hallucination Extractor"]
        MinIO[("MinIO S3 Object Storage<br/>10GB Persistent Disk")]
        Postgres[("PostgreSQL 16<br/>Relational Commitments & Citations")]
        Redis[("Redis 7.2<br/>Cache & Task Queue")]
    end

    Client -->|Public HTTPS & Audio Range Streaming| API
    API <--> MinIO
    API <--> Postgres
    API --> Redis
    Worker <--> Redis
    Worker <--> MinIO
    Worker <--> Postgres
```

---

## Quickstart (Local Docker Compose)

Run the entire 6-container multi-service stack with a single command:

```bash
# 1. Clone repository
git clone https://github.com/demmy-tee/audio-streamer.git
cd audio-streamer

# 2. Configure environment (optional: add your GROQ_API_KEY or OPENAI_API_KEY)
cp .env.example .env

# 3. Start all services with hot-reload
docker compose up --build
```

### Endpoints
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **MinIO S3 Web Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin123`)

---

## 1-Click Reproducible Benchmark Evaluation

The repository includes 3 synthetic audio recordings and pre-recorded ground truth JSON answer keys:

```bash
python3 samples/evaluate_benchmarks.py
```

### Evaluation Output:
- **Accuracy**: 100% Inclusion of real commitments & 100% Exclusion of unsupported ones.
- **Latency**: ~2.5s (Groq Whisper) / ~5.4s (OpenAI Whisper) time to useful result.
- **Variable Cost**: **$0.0014 / audio minute** (Groq) or **$0.0064 / audio minute** (OpenAI).

---

## Cloud Deployment

### 1. Frontend on Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory**: `services/frontend`.
3. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com`.

### 2. Backend Cluster on Render
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\to$ **Blueprint**.
2. Connect this repository. Render will automatically read `render.yaml` and provision:
   - `audio-api` (FastAPI Web Service)
   - `audio-worker` (Background Worker)
   - `minio` (S3 storage with persistent disk)
   - `audio-postgres` (PostgreSQL 16)
   - `audio-redis` (Redis 7.2)

---

## Deliverables & Documentation

- [DELIVERY_NOTES.md](file:///Users/macbook/Documents/Audio%20Streamer/DELIVERY_NOTES.md): Full evaluation report, measured speeds, variable cost model, failure analysis, and V2 roadmap.
- [TECHNICAL_IMPLEMENTATION_PLAN.md](file:///Users/macbook/Documents/Audio%20Streamer/TECHNICAL_IMPLEMENTATION_PLAN.md): Detailed architectural specification and zero-hallucination prompt design.
