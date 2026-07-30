import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/** Transfer loyalty points into wallet balance. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const point = Number(body.point ?? 0);
  if (!Number.isFinite(point) || point <= 0) {
    return NextResponse.json({ ok: false, reason: "invalid_point" }, { status: 400 });
  }

  const { ok } = await authSend(
    "POST",
    "/api/v1/customer/loyalty-point/wallet-transfer",
    { point },
    locale
  );
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
