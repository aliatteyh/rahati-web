import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/** Delete a saved customer address. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const { ok } = await authSend(
    "DELETE",
    `/api/v1/customer/address/${encodeURIComponent(id)}`,
    undefined,
    locale
  );
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
