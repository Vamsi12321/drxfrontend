import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const PROXZAR_AUTH_URL = process.env.PROXZAR_AUTH_URL || "https://oauth2.proxzar.ai/staging";

    const res = await fetch(`${PROXZAR_AUTH_URL}/api/v1/requestOAuth2OTP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ detail: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}
