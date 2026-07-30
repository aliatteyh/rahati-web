import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/** Customer cancels a pending booking. Backend only allows cancel while pending. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.booking_id ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "PUT",
    `/api/v1/customer/booking/status-update/${encodeURIComponent(bookingId)}`,
    { booking_status: "canceled" },
    locale
  );

  // The backend returns 200 with a "already accepted/ongoing/completed" message
  // when the booking can no longer be canceled — surface that as not-canceled.
  const code = String((json as { response_code?: string })?.response_code ?? "");
  const canceled = ok && !/already/i.test(code);

  return NextResponse.json({ ok: canceled }, { status: canceled ? 200 : 400 });
}
