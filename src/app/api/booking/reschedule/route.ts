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
  const code = String((json as { response_code?: string })?.response_code ?? "");
  const refused = /refused/i.test(code);
  const content = (json as { content?: { reason?: string } })?.content;

  return NextResponse.json(
    { ok: ok && !refused, reason: refused ? content?.reason ?? "refused" : null },
    { status: ok && !refused ? 200 : 400 }
  );
}
