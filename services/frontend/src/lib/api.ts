import { ConversationDetail, SampleSummary } from "../types";

export const FALLBACK_SAMPLE_SUMMARIES: SampleSummary[] = [
  {
    sample_id: "sample_01",
    title: "Conversation 1: Core Benchmark",
    description: "5 traps: unaccepted proposal, corrected deadline, cancelled task, unassigned owner, and open question.",
  },
  {
    sample_id: "sample_02",
    title: "Conversation 2: Agreement Variant",
    description: "Variant demonstrating delta handling where the Rust proposal is accepted.",
  },
  {
    sample_id: "sample_03",
    title: "Conversation 3: Inconclusive Dialogue",
    description: "Exploratory discussion where the product declines to conclude commitments.",
  },
];

export const FALLBACK_BENCHMARKS: Record<string, ConversationDetail> = {
  sample_01: {
    id: "sample_01",
    title: "Conversation 1: Core Benchmark",
    audio_s3_key: "samples/sample_01.wav",
    duration_seconds: 102.8,
    status: "COMPLETED",
    is_inconclusive: false,
    inconclusive_reason: null,
    speakers: ["Daniel", "Elena"],
    commitments: [
      {
        id: "c1",
        task_description: "Build the interactive waveform audio player with timestamp jumping",
        owner_name: "Daniel",
        is_owner_assigned: true,
        deadline_raw: "Wednesday at 3 PM",
        missing_date_context: true,
        status: "ACTIVE",
        rationale: "Daniel agreed to take on the waveform player. The deadline was initially proposed as Tuesday 10 AM, but corrected and agreed as Wednesday at 3 PM.",
        citations: [
          {
            quote_text: "Yes, I will take that on. I'll build the waveform and the scrub bar.",
            start_ms: 31940,
            end_ms: 36060,
            speaker_name: "Daniel",
          },
        ],
      },
      {
        id: "c2",
        task_description: "Configure MinIO CORS policy and range request headers for audio scrubbing",
        owner_name: null,
        is_owner_assigned: false,
        deadline_raw: null,
        missing_date_context: false,
        status: "ACTIVE",
        rationale: "Both agreed the task is critical, but explicitly stated nobody is assigned yet.",
        citations: [
          {
            quote_text: "Nobody is assigned to that yet, so let's leave it unassigned for now and pick it up tomorrow.",
            start_ms: 66240,
            end_ms: 72780,
            speaker_name: "Elena",
          },
        ],
      },
      {
        id: "c3",
        task_description: "Prepare the investor update slides",
        owner_name: "Elena",
        is_owner_assigned: true,
        deadline_raw: "tonight",
        missing_date_context: true,
        status: "CANCELLED",
        rationale: "Elena originally agreed to do the slides tonight, but at 01:30 explicitly cancelled it because the meeting was postponed.",
        citations: [
          {
            quote_text: "So scratch the investor deck—I won't do the slides anymore.",
            start_ms: 89920,
            end_ms: 93640,
            speaker_name: "Elena",
          },
        ],
      },
      {
        id: "c4",
        task_description: "Rewrite the entire audio streaming pipeline in Rust",
        owner_name: null,
        is_owner_assigned: false,
        deadline_raw: null,
        missing_date_context: false,
        status: "PROPOSAL_UNACCEPTED",
        rationale: "Daniel suggested rewriting the pipeline in Rust, but Elena rejected it as overkill and decided to stay with FastAPI.",
        citations: [
          {
            quote_text: "That's overkill for our current volume. Let's stick with Python FastAPI for now. We won't do the Rust rewrite.",
            start_ms: 18660,
            end_ms: 25020,
            speaker_name: "Elena",
          },
        ],
      },
    ],
    unresolved_questions: [
      {
        question_text: "Do we already have the production API keys for the Whisper transcription provider?",
        asked_by: "Elena",
        supporting_quote: "Quick question: do we already have the production API keys for the Whisper transcription provider?",
        start_ms: 73560,
        end_ms: 78940,
      },
    ],
    transcript: [],
  },
  sample_02: {
    id: "sample_02",
    title: "Conversation 2: Agreement Variant",
    audio_s3_key: "samples/sample_02.wav",
    duration_seconds: 107.8,
    status: "COMPLETED",
    is_inconclusive: false,
    inconclusive_reason: null,
    speakers: ["Daniel", "Elena"],
    commitments: [
      {
        id: "c2-1",
        task_description: "Rewrite the entire audio streaming pipeline in Rust",
        owner_name: "Daniel",
        is_owner_assigned: true,
        deadline_raw: null,
        missing_date_context: false,
        status: "ACTIVE",
        rationale: "Elena enthusiastically agreed to the Rust rewrite and Daniel explicitly agreed to take it on.",
        citations: [
          {
            quote_text: "Awesome! Yes, I will take on the Rust rewrite.",
            start_ms: 26140,
            end_ms: 29340,
            speaker_name: "Daniel",
          },
        ],
      },
      {
        id: "c2-2",
        task_description: "Build the interactive waveform audio player with timestamp jumping",
        owner_name: "Daniel",
        is_owner_assigned: true,
        deadline_raw: "Wednesday at 3 PM",
        missing_date_context: true,
        status: "ACTIVE",
        rationale: "Daniel agreed to take on the waveform player with deadline corrected to Wednesday at 3 PM.",
        citations: [
          {
            quote_text: "Yes, I will take that on too. I'll build the waveform and the scrub bar.",
            start_ms: 36740,
            end_ms: 41120,
            speaker_name: "Daniel",
          },
        ],
      },
      {
        id: "c2-3",
        task_description: "Configure MinIO CORS policy and range request headers for audio scrubbing",
        owner_name: null,
        is_owner_assigned: false,
        deadline_raw: null,
        missing_date_context: false,
        status: "ACTIVE",
        rationale: "Both agreed the task is critical, but explicitly stated nobody is assigned yet.",
        citations: [
          {
            quote_text: "Nobody is assigned to that yet, so let's leave it unassigned for now and pick it up tomorrow.",
            start_ms: 71320,
            end_ms: 77860,
            speaker_name: "Elena",
          },
        ],
      },
      {
        id: "c2-4",
        task_description: "Prepare the investor update slides",
        owner_name: "Elena",
        is_owner_assigned: true,
        deadline_raw: "tonight",
        missing_date_context: true,
        status: "CANCELLED",
        rationale: "Elena initially agreed to make the slides tonight, but explicitly cancelled them at 01:35.",
        citations: [
          {
            quote_text: "So scratch the investor deck—I won't do the slides anymore.",
            start_ms: 95000,
            end_ms: 98720,
            speaker_name: "Elena",
          },
        ],
      },
    ],
    unresolved_questions: [
      {
        question_text: "Do we already have the production API keys for the Whisper transcription provider?",
        asked_by: "Elena",
        supporting_quote: "Quick question: do we already have the production API keys for the Whisper transcription provider?",
        start_ms: 78620,
        end_ms: 84020,
      },
    ],
    transcript: [],
  },
  sample_03: {
    id: "sample_03",
    title: "Conversation 3: Inconclusive Dialogue",
    audio_s3_key: "samples/sample_03.wav",
    duration_seconds: 47.9,
    status: "COMPLETED",
    is_inconclusive: true,
    inconclusive_reason: "The conversation consisted entirely of preliminary brainstorming. The participants explicitly agreed not to commit to any tasks, owners, or deadlines pending budget clarity.",
    speakers: ["Daniel", "Elena"],
    commitments: [],
    unresolved_questions: [],
    transcript: [],
  },
};

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
    if (raw && (raw.includes(".") || raw.includes("localhost"))) {
      if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
        return `https://${raw}`;
      }
      return raw;
    }
    return "";
  }

  const serverUrl =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://127.0.0.1:8000";

  let formatted = serverUrl.replace(/\/$/, "");
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `http://${formatted}`;
  }
  return formatted;
}

const API_BASE_URL = getApiBaseUrl();

export function getAudioStreamUrl(conversationId: string): string {
  if (conversationId.startsWith("sample_")) {
    return `/audio/${conversationId}.wav`;
  }
  return `${API_BASE_URL}/api/v1/audio/${conversationId}/stream`;
}

export async function fetchSamples(): Promise<SampleSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/samples`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend samples endpoint failed, using fallback:", err);
  }
  return FALLBACK_SAMPLE_SUMMARIES;
}

export async function loadSample(sampleId: string): Promise<ConversationDetail> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/samples/${sampleId}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Backend seed for ${sampleId} failed, using local benchmark:`, err);
  }

  if (FALLBACK_BENCHMARKS[sampleId]) {
    return FALLBACK_BENCHMARKS[sampleId];
  }
  throw new Error(`Failed to load sample ${sampleId}`);
}

export async function fetchConversation(
  conversationId: string
): Promise<ConversationDetail> {
  if (FALLBACK_BENCHMARKS[conversationId]) {
    return FALLBACK_BENCHMARKS[conversationId];
  }

  const res = await fetch(
    `${API_BASE_URL}/api/v1/conversations/${conversationId}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch conversation: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadAudio(
  file: File
): Promise<{ conversation_id: string; title: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/v1/audio/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Upload failed. Backend may still be starting up, please try again in a few moments.");
  }

  return res.json();
}

export async function pollConversationStatus(conversationId: string): Promise<{
  id: string;
  status: string;
  is_inconclusive: boolean;
  inconclusive_reason: string | null;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/conversations/${conversationId}/poll`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to poll status: ${res.statusText}`);
  }
  return res.json();
}
