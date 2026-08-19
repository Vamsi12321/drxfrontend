const PROXZAR_URL = process.env.PROXZAR_AUTH_URL;

export async function POST(req) {
  if (!PROXZAR_URL) {
    return Response.json({ detail: "PROXZAR_AUTH_URL not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const url = `${PROXZAR_URL}/api/v1/addUser`;

    console.log(`[proxzar-register] ▶ POST ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log(`[proxzar-register] ◀ ${res.status}`);

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[proxzar-register] ✗ Error:", err.message);
    return Response.json({ detail: `Proxzar register error: ${err.message}` }, { status: 502 });
  }
}
