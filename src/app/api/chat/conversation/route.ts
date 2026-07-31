import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { CHAT_API_BASE, chatHeaders } from "@/lib/chat";

/** Fetch a channel's messages (newest first). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const channelId = (url.searchParams.get("channel_id") ?? "").trim();
  const rawLocale = url.searchParams.get("locale") ?? "en";
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  if (!channelId) return NextResponse.json({ messages: [] }, { status: 400 });

  const headers = await chatHeaders(locale);
  if (!headers) return NextResponse.json({ messages: [] }, { status: 401 });

  try {
    const res = await fetch(
      `${CHAT_API_BASE}/api/v1/customer/chat/conversation?channel_id=${encodeURIComponent(channelId)}&limit=50&offset=1`,
      { headers, cache: "no-store" }
    );
    const json = await res.json().catch(() => ({}));
    const content = json?.content;
    const messages = Array.isArray(content) ? content : (content?.data ?? []);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] }, { status: 502 });
  }
}
