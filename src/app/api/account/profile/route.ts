import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const payload = {
    first_name: String(body.first_name ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
  };
  if (!payload.first_name || !payload.last_name || !payload.email) {
    return NextResponse.json({ ok: false, message: "Missing required fields" }, { status: 400 });
  }

  const { ok, json } = await authSend("PUT", "/api/v1/customer/update/profile", payload, locale);
  const message =
    (json?.message as string) ??
    (json?.errors as Array<{ message?: string }> | undefined)?.[0]?.message;
  return NextResponse.json({ ok, message }, { status: 200 });
}
