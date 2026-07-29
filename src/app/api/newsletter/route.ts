import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/** Public newsletter signup — proxies to the backend subscribe endpoint. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/subscribe-newsletter`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    if (res.ok) return NextResponse.json({ ok: true });
    // 400 from the backend most commonly means the email is already subscribed
    // (unique constraint) or failed validation.
    return NextResponse.json({ ok: false, reason: "duplicate" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, reason: "network" }, { status: 502 });
  }
}
