import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL;

// Virtual MR AI answers can take 10-30s — needs a longer timeout
export const maxDuration = 60; // seconds (Next.js route config)

export async function POST(req) {
  if (!BACKEND) {
    return NextResponse.json({ detail: "BACKEND_URL not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") || "";

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const url = `${BACKEND}/virtual-mr/chat`;

  console.log(`[virtual-mr] ▶ POST ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "DrxFrontend-Proxy/1.0",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log(`[virtual-mr] ◀ ${res.status}`);

    const data = await res.json().catch(() => ({ detail: "Invalid response from AI service" }));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      console.error("[virtual-mr] ✗ Timeout after 55s");
      return NextResponse.json(
        { detail: "AI service timed out. The server may be waking up — please try again in a moment." },
        { status: 504 }
      );
    }
    console.error("[virtual-mr] ✗ Network error:", err.message);
    return NextResponse.json(
      { detail: `Unable to reach AI service: ${err.message}. Please try again.` },
      { status: 502 }
    );
  }
}
