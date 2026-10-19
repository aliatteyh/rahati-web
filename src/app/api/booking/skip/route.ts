import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/**
 * Postpones one visit of a plan to the end of that plan.
 *
 * Not a cancellation: the customer paid for a number of visits and still
 * receives them, the same visit on a later date. The server picks the date, on
 * the plan's own weekdays and around the team's days off.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const visitId = String(body.visit_id ?? "").trim();

  if (!visitId) {
    return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    `/api/v1/customer/booking/visit/${encodeURIComponent(visitId)}/skip`,
    {},
    locale
  );

  const content = (json as { content?: { reason?: string; moved_to?: string } })?.content;

  // The date it landed on is the proof it moved. Reading only the absence of
  // the word "refused" called a 204 and a validation failure a success.
  const moved = ok && Boolean(content?.moved_to);

  return NextResponse.json(
    {
      ok: moved,
      reason: moved ? null : content?.reason ?? "refused",
      moved_to: content?.moved_to ?? null,
    },
    { status: moved ? 200 : 400 }
  );
}
