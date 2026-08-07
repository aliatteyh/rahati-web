import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Tells the backend the card cleared, so it can go and check.
 *
 * Deliberately carries no proof of payment: whatever this sends, the backend
 * reads the intent back from Stripe before creating anything. A caller who lies
 * here gets nothing.
 *
 * Stripe's webhook settles the same payment independently, so a customer who
 * closes the tab before this fires still gets their booking. Whichever arrives
 * first wins and the other finds the work done.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const paymentId = String(body.payment_id ?? "").trim();

  if (!paymentId) {
    return NextResponse.json({ ok: false, message: "Missing payment" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/payment/stripe/confirm",
    { payment_id: paymentId },
    locale
  );

  const content = json?.content as { paid?: boolean } | undefined;

  return NextResponse.json(
    { ok: ok && Boolean(content?.paid), message: apiErrorMessage(json) },
    { status: 200 }
  );
}
