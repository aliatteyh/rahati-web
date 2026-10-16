import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authGet } from "@/lib/account";

/**
 * One subscription, answered by the server rather than assembled here.
 *
 * The days, the times, how many visits are left, what one costs and what may
 * be done to each — the app asks the same endpoint, so the two surfaces cannot
 * come to disagree about the same plan.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.booking_id ?? "").trim();

  if (!bookingId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const plan = await authGet<unknown>(
    `/api/v1/customer/booking/plan/${encodeURIComponent(bookingId)}`,
    locale,
    null
  );

  return NextResponse.json({ ok: plan != null, plan });
}
