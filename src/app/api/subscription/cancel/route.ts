import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/** Cancel the customer's active Pro Member subscription. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const { ok } = await authSend(
    "POST",
    "/api/v1/customer/subscription/cancel",
    {},
    locale
  );
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
