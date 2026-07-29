import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { sendOtpRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim();
  const locale = isLocale(body.locale) ? body.locale : "en";

  if (!phone) {
    return NextResponse.json({ ok: false, message: "Missing phone" }, { status: 400 });
  }

  const result = await sendOtpRequest(phone, locale);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
