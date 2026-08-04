import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/**
 * Put a past booking's items back in the cart.
 *
 * The backend rebuilds the lines from the original booking rather than trusting
 * anything sent from here, so a price change since then is picked up and the
 * customer is charged today's rate, not the old one.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.bookingId ?? "");

  if (!bookingId) {
    return NextResponse.json({ ok: false, message: "Missing booking" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/rebook/cart-add",
    { booking_id: bookingId },
    locale
  );

  // The backend answers 200 with a response_code even on refusal, so the
  // envelope decides success here, not the HTTP status. "Already in the cart"
  // is a success for the customer: what they wanted is there either way.
  const code = json?.response_code;
  const succeeded =
    ok &&
    (code === "default_cart_store_200" || code === "default_cart_already_added_store_200");

  return NextResponse.json({
    ok: succeeded,
    message: json?.message ?? null,
  });
}
