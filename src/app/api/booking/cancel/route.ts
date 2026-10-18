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

  // The backend refuses with a 400 and a reason key, and reports on success
  // how many visits it actually called off — a plan is cancelled visit by
  // visit, and one too close to its time stays. Both are passed straight
  // through so the sheet can say which happened instead of closing in silence.
  const content = (json as { content?: Record<string, unknown> })?.content ?? {};
  const cancelled = Number(content.cancelled ?? 0);
  const canceled = ok && cancelled > 0;

  return NextResponse.json(
    {
      ok: canceled,
      cancelled,
      kept: Number(content.kept ?? 0),
      hours: Number(content.hours ?? 0),
      reason: typeof content.reason === "string" ? content.reason : null,
    },
    { status: canceled ? 200 : 400 }
  );
}
