import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const serviceId = String(body.service_id ?? "").trim();
  if (!serviceId) return NextResponse.json({ ok: false }, { status: 400 });

  const { ok } = await authSend(
    "POST",
    `/api/v1/customer/favorite/service-delete/${encodeURIComponent(serviceId)}`,
    {},
    locale
  );
  return NextResponse.json({ ok });
}
