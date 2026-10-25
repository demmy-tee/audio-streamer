import { ConversationDetail, SampleSummary } from "../types";

function getApiBaseUrl(): string {
  // In the browser, check if NEXT_PUBLIC_API_URL is an explicit public domain or localhost
  if (typeof window !== "undefined") {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
    if (raw && (raw.includes(".") || raw.includes("localhost"))) {
      if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
        return `https://${raw}`;
      }
      return raw;
    }
    // Default to relative URL so browser requests are proxied via Next.js rewrites to backend
    return "";
  }

  // Server-side (SSR)
  const serverUrl =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
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
  return `${API_BASE_URL}/api/v1/audio/${conversationId}/stream`;
}

export async function fetchSamples(): Promise<SampleSummary[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/samples`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load samples: ${res.statusText}`);
  }
  return res.json();
}

export async function loadSample(sampleId: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE_URL}/api/v1/samples/${sampleId}/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to seed sample ${sampleId}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchConversation(
  conversationId: string
): Promise<ConversationDetail> {
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
    throw new Error(errorData.detail || "Upload failed");
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
