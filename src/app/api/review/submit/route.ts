import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/** Submit a rating + comment for a service on a completed booking. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.booking_id ?? "").trim();
  const serviceId = String(body.service_id ?? "").trim();
  const rating = Number(body.review_rating ?? 0);
  const comment = String(body.review_comment ?? "").trim();

  if (!bookingId || !serviceId || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const { ok } = await authSend(
    "POST",
    "/api/v1/customer/review/submit",
    {
      booking_id: bookingId,
      service_id: serviceId,
      review_rating: rating,
      review_comment: comment,
    },
    locale
  );
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
