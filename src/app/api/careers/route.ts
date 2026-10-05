import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * The careers form, forwarded.
 *
 * Through our own origin like everything else here, so the language header is
 * set server-side and the browser never talks to the panel directly. No zone
 * is sent: somebody asking for work is not booking anything.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body?.locale) ? body.locale : "ar";

  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();

  if (name.length < 2 || phone.length < 6) {
    return NextResponse.json({ ok: false, message: "Missing name or phone" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/career/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
      },
      body: JSON.stringify({
        name,
        phone,
        email: String(body?.email ?? "").trim() || undefined,
        experience: String(body?.experience ?? "").trim() || undefined,
      }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok && String(json?.response_code ?? "").startsWith("default_200"),
      message: json?.errors?.[0]?.message ?? json?.message,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Could not send" }, { status: 200 });
  }
}
