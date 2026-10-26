import { NextRequest, NextResponse } from "next/server";

const FALLBACK_SAMPLES = [
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

function getBackendTargets(): string[] {
  const configured = [
    process.env.INTERNAL_API_URL,
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]
    .filter(Boolean)
    .map((u) => u!.trim().replace(/\/$/, ""));

  const defaults = [
    "http://audio-api:8000",
    "http://audio-api:10000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
  ];

  const targets: string[] = [];
  for (const item of [...configured, ...defaults]) {
    let formatted = item;
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = `http://${formatted}`;
    }
    if (!targets.includes(formatted)) {
      targets.push(formatted);
    }
  }
  return targets;
}

async function proxyRequest(request: NextRequest, pathParts: string[], method: string) {
  const subpath = pathParts.join("/");
  const urlObj = new URL(request.url);
  const search = urlObj.search;
  const targets = getBackendTargets();

  let body: ArrayBuffer | undefined = undefined;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      const buf = await request.arrayBuffer();
      if (buf && buf.byteLength > 0) {
        body = buf;
      }
    } catch {
      body = undefined;
    }
  }

  let lastError: any = null;

  for (const base of targets) {
    const targetUrl = `${base}/api/v1/${subpath}${search}`;

    try {
      const headers = new Headers();
      // Forward relevant headers
      const range = request.headers.get("range");
      if (range) headers.set("range", range);

      const contentType = request.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);

      const accept = request.headers.get("accept");
      if (accept) headers.set("accept", accept);

      const res = await fetch(targetUrl, {
        method,
        headers,
        body,
        cache: "no-store",
        // @ts-ignore - duplex is needed for streaming body in Node fetch
        duplex: body ? "half" : undefined,
        signal: AbortSignal.timeout(60000),
      });

      // If backend returned a response (even 4xx/5xx from API), return it
      const responseHeaders = new Headers();
      for (const [key, value] of res.headers.entries()) {
        if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      }

      return new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });
    } catch (err: any) {
      lastError = err;
      // Try next target if connection refused or address not found
    }
  }

  // Fallback for samples if backend is temporarily unreachable
  if (subpath === "samples" && method === "GET") {
    return NextResponse.json(FALLBACK_SAMPLES);
  }

  return NextResponse.json(
    {
      detail: `Backend service is waking up or unreachable: ${lastError?.message || "Connection failed"}. Please retry in a few seconds.`,
      targets,
    },
    { status: 503 }
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, "POST");
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, "HEAD");
}
