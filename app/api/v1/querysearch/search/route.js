import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL;

// QuerySearch runs an NER→intent→retrieval→LLM pipeline which can take 10-40s
export const maxDuration = 60;

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

  const url = `${BACKEND}/querysearch/search`;
  console.log(`[querysearch] ▶ POST ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

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
    console.log(`[querysearch] ◀ ${res.status}`);

    const data = await res.json().catch(() => ({ detail: "Invalid response from search engine" }));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      console.error("[querysearch] ✗ Timeout after 55s");
      return NextResponse.json({ detail: "Search timed out. Please try again." }, { status: 504 });
    }
    console.error("[querysearch] ✗ Network error:", err.message);
    return NextResponse.json({ detail: `Unable to reach search engine: ${err.message}` }, { status: 502 });
  }
}
