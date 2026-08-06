import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/**
 * Attaches the customer's transfer details to a booking already placed with
 * payment_method=offline_payment.
 *
 * Two steps rather than one because the booking must exist before there is
 * anything to attach the payment to — the backend keys the record on booking_id.
 * If this second call fails the booking still stands, unpaid, which is the safe
 * direction: the admin sees it awaiting payment rather than the customer losing
 * a booking they believe they made.
 *
 * The backend expects customer_information as base64 of a single-element array,
 * an encoding the mobile apps established; it is reproduced here rather than
 * changed, since the same endpoint serves them.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.booking_id ?? "").trim();
  const offlinePaymentId = String(body.offline_payment_id ?? "").trim();
  const fields = (body.customer_information ?? {}) as Record<string, string>;

  if (!bookingId || !offlinePaymentId) {
    return NextResponse.json({ ok: false, message: "Missing booking or method" }, { status: 400 });
  }

  const encoded = Buffer.from(JSON.stringify([fields])).toString("base64");

  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/booking/store-offline-payment-data",
    {
      booking_id: bookingId,
      offline_payment_id: offlinePaymentId,
      customer_information: encoded,
      is_partial: 0,
    },
    locale
  );

  return NextResponse.json({ ok, message: json?.message }, { status: 200 });
}
