import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { CHAT_API_BASE, chatHeaders } from "@/lib/chat";

/** List the customer's chat channels. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLocale = url.searchParams.get("locale") ?? "en";
  const locale = isLocale(rawLocale) ? rawLocale : "en";

  const headers = await chatHeaders(locale);
  if (!headers) return NextResponse.json({ channels: [] }, { status: 401 });

  try {
    const res = await fetch(
      `${CHAT_API_BASE}/api/v1/customer/chat/channel-list?limit=50&offset=1`,
      { headers, cache: "no-store" }
    );
    const json = await res.json().catch(() => ({}));
    const content = json?.content;
    const channels = Array.isArray(content) ? content : (content?.data ?? []);
    return NextResponse.json({ channels });
  } catch {
    return NextResponse.json({ channels: [] }, { status: 502 });
  }
}
