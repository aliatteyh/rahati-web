import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Empties the cart.
 *
 * There is no cart in this interface — a booking is built in the wizard and paid
 * for at checkout, and the customer never sees a basket. But one exists on the
 * server, and an abandoned booking leaves a line in it that blocks every later
 * booking from a different sub-category. Telling someone to "clear your cart
 * first" when they have never seen a cart is not an instruction they can follow,
 * so the wizard offers to do it for them and calls this.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const { ok, json } = await authSend("DELETE", "/api/v1/customer/cart/data/empty", undefined, locale);

  // A cart that was already empty answers 204, which is the outcome asked for.
  return NextResponse.json({ ok: ok || json?.response_code === "default_204", message: apiErrorMessage(json) });
}
