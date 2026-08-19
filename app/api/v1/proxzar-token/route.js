const PROXZAR_URL = process.env.PROXZAR_AUTH_URL;

export async function POST(req) {
  if (!PROXZAR_URL) {
    return Response.json({ detail: "PROXZAR_AUTH_URL not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const url = `${PROXZAR_URL}/api/v1/token`;

    console.log(`[proxzar-auth] ▶ POST ${url}`);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    console.log(`[proxzar-auth] ◀ ${res.status}`);

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[proxzar-auth] ✗ Error:", err.message);
    return Response.json({ detail: `Proxzar auth error: ${err.message}` }, { status: 502 });
  }
}
