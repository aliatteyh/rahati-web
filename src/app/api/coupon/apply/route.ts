import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getToken } from "@/lib/session";
import { authSend } from "@/lib/account";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Attaches the typed code to the cart the booking is about to be made from.
 *
 * The separate `/api/coupon` route only *checks* a code — it is called in step
 * one, before the cart exists, so the customer sees straight away whether what
 * they typed is real. Nothing was ever attached, so the summary showed a
 * discount the booking did not carry and the customer was charged in full.
 *
 * This is also where the rules that need a cart are enforced: the minimum
 * hours, the allowed weekdays and a limited offer's remaining places. Those
 * cannot be judged in step one, where no hours and no dates have been chosen
 * yet.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const couponCode = String(body.couponCode ?? "").trim();

  if (!couponCode) {
    return NextResponse.json({ ok: false, message: "Missing coupon" }, { status: 400 });
  }

  if (!(await getToken())) {
    return NextResponse.json({ ok: false, needsLogin: true }, { status: 200 });
  }

  // The dates go with it so a weekday-limited offer is judged against the days
  // actually booked rather than against today.
  const dates = Array.isArray(body.dates) ? body.dates.map(String) : [];

  const { json } = await authSend(
    "POST",
    "/api/v1/customer/coupon/apply",
    { coupon_code: couponCode, ...(dates.length ? { dates } : {}) },
    locale
  );

  // This endpoint answers 200 for a refusal as well as for a success, and says
  // which it was in the response code — so the HTTP status tells us nothing and
  // the body has to be read.
  const applied = String((json as { response_code?: string })?.response_code ?? "")
    .startsWith("coupon_applied");

  return NextResponse.json(
    { ok: applied, message: apiErrorMessage(json) },
    { status: 200 }
  );
}
