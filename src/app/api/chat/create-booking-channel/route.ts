import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { CHAT_API_BASE, chatHeaders } from "@/lib/chat";

/** Create (or reuse) the group chat channel for a booking. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.booking_id ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const headers = await chatHeaders(locale);
  if (!headers) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const res = await fetch(`${CHAT_API_BASE}/api/v1/customer/chat/create-booking-channel`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    const channelId = (json?.content as { id?: string } | undefined)?.id ?? null;
    return NextResponse.json(
      { ok: res.ok && !!channelId, channel_id: channelId },
      { status: res.ok ? 200 : 400 }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
