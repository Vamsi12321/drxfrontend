import { NextResponse } from "next/server";

const DOBO_URL = process.env.DOBO_URL || "https://eulalia-indeciduous-danyell.ngrok-free.dev/dobodb";

async function proxyRequest(request, { params }) {
  const { path } = await params;
  const segments = Array.isArray(path) ? path.join("/") : path;
  const url = new URL(request.url);
  const search = url.search || "";
  const target = `${DOBO_URL}/api/onboarding/${segments}${search}`;

  const headers = { "Content-Type": "application/json" };

  const fetchOptions = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const body = await request.json();
      fetchOptions.body = JSON.stringify(body);
    } catch {
      // No body
    }
  }

  try {
    console.log(`[dobo-proxy] ▶ ${request.method} ${target}`);
    const res = await fetch(target, fetchOptions);
    console.log(`[dobo-proxy] ◀ ${res.status}`);

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[dobo-proxy] ✗ Error:", err.message);
    return NextResponse.json({ detail: `DOBO proxy error: ${err.message}` }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
