import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/**
 * Moves a booking, or one visit of a plan, to a time the customer picked.
 *
 * Two endpoints behind one route because the screen makes no distinction: a
 * card offers "Reschedule" whether it is a single visit or the third of
 * twelve, and which one it is, is a property of the row, not a decision the
 * customer makes.
 *
 * A refusal comes back as a key — the time is too close, the team is closed
 * that day, it does not fit their hours — and the page says it in the reader's
 * language. The server decides; the page only asks.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const visitId = String(body.visit_id ?? "").trim();
  const bookingId = String(body.booking_id ?? "").trim();
  const schedule = String(body.service_schedule ?? "").trim();

  if ((!visitId && !bookingId) || !schedule) {
    return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 400 });
  }

  const path = visitId
    ? `/api/v1/customer/booking/visit/${encodeURIComponent(visitId)}/reschedule`
    : `/api/v1/customer/booking/single/${encodeURIComponent(bookingId)}/reschedule`;

  const { ok, json } = await authSend("POST", path, { service_schedule: schedule }, locale);
  const content = (json as { content?: { reason?: string; service_schedule?: string } })?.content;

  // Success is the new time coming back, not the absence of the word
  // "refused". The backend answers a validation failure with response_code
  // "default_400" carried on an HTTP 200, and an unknown visit with a 204 —
  // neither contains "refused", and both looked like success here: the sheet
  // closed, the page refreshed, and the old time was still there.
  const moved = ok && Boolean(content?.service_schedule);

  return NextResponse.json(
    { ok: moved, reason: moved ? null : content?.reason ?? "refused" },
    { status: moved ? 200 : 400 }
  );
}
