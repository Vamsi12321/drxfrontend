const BACKEND = process.env.BACKEND_URL;

async function forward(req, { params }) {
  if (!BACKEND) {
    console.error("[proxy] BACKEND_URL is not set in environment");
    return Response.json({ detail: "Proxy misconfigured: BACKEND_URL not set" }, { status: 500 });
  }

  const { path: segments } = await params;
  const path = segments.join("/");
  const { searchParams } = new URL(req.url);
  const query = searchParams.toString();
  const url = `${BACKEND}/${path}${query ? "?" + query : ""}`;

  const method = req.method;
  const auth = req.headers.get("authorization") || "";
  const contentType = req.headers.get("content-type") || "";

  const forwardHeaders = {
    Authorization: auth,
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "DrxFrontend-Proxy/1.0",
  };

  let body;

  if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    if (contentType.includes("multipart/form-data")) {
      body = await req.formData();
    } else {
      const rawText = await req.text();
      if (rawText && rawText.trim()) {
        body = rawText;
        forwardHeaders["Content-Type"] = "application/json";
      }
    }
  }

  console.log(`[proxy] ▶ ${method} ${url}`);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: forwardHeaders,
      redirect: "follow",
      ...(body !== undefined ? { body } : {}),
    });
  } catch (fetchErr) {
    console.error(`[proxy] ✗ Network error calling ${url}:`, fetchErr.message);
    return Response.json({ detail: `Proxy network error: ${fetchErr.message}` }, { status: 502 });
  }

  console.log(`[proxy] ◀ ${method} ${url} → ${res.status}`);

  const resContentType = res.headers.get("content-type") || "";
  if (
    resContentType.includes("text/csv") ||
    resContentType.includes("application/octet-stream") ||
    resContentType.includes("application/pdf") ||
    resContentType.includes("text/plain")
  ) {
    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "attachment; filename=file";
    return new Response(blob, {
      status: res.status,
      headers: {
        "Content-Type": resContentType,
        "Content-Disposition": disposition,
      },
    });
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { detail: text }; }

  return Response.json(data, { status: res.status });
}

export async function GET(req, ctx)    { return forward(req, ctx); }
export async function POST(req, ctx)   { return forward(req, ctx); }
export async function PUT(req, ctx)    { return forward(req, ctx); }
export async function DELETE(req, ctx) { return forward(req, ctx); }
export async function PATCH(req, ctx)  { return forward(req, ctx); }
