import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { CHAT_API_BASE, chatHeaders } from "@/lib/chat";

/** Send a message (text and/or file attachments) to a channel. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false }, { status: 400 });

  const rawLocale = String(form.get("locale") ?? "en");
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const channelId = String(form.get("channel_id") ?? "").trim();
  if (!channelId) return NextResponse.json({ ok: false }, { status: 400 });

  const headers = await chatHeaders(locale);
  if (!headers) return NextResponse.json({ ok: false }, { status: 401 });

  const forward = new FormData();
  forward.append("channel_id", channelId);
  const message = form.get("message");
  if (message != null && String(message) !== "") forward.append("message", String(message));
  for (const f of form.getAll("files")) {
    if (f instanceof File && f.size > 0) forward.append("files[]", f);
  }

  try {
    const res = await fetch(`${CHAT_API_BASE}/api/v1/customer/chat/send-message`, {
      method: "POST",
      headers, // no Content-Type: fetch sets the multipart boundary
      body: forward,
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
