import { ConversationDetail, SampleSummary } from "../types";

let rawUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
  rawUrl = `https://${rawUrl}`;
}
const API_BASE_URL = rawUrl || "http://localhost:8000";

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
