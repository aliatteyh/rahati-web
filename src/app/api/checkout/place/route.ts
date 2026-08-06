import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend, authGet } from "@/lib/account";
import { apiErrorMessage } from "@/lib/apiError";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

// Gateways that use the hosted redirect flow rather than direct booking placement.
const DIGITAL = new Set([
  "ssl_commerz", "stripe", "paytm", "razor_pay", "paystack", "senang_pay", "flutterwave",
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const method = String(body.payment_method ?? "cash_after_service");
  const zoneId = String(body.zone_id ?? "");
  const schedule = String(body.service_schedule ?? "");
  const addressId = body.service_address_id;
  const isRepeat = String(body.service_type ?? "") === "repeat";
  const dates = String(body.dates ?? "");

  if (!addressId) {
    return NextResponse.json({ ok: false, message: "Address required" }, { status: 400 });
  }

  // Digital gateway: hand off to the backend's hosted payment page, which
  // processes the gateway and creates the booking on success.
  if (DIGITAL.has(method)) {
    const info = await authGet<{ id?: string }>("/api/v1/customer/info", locale, {});
    const userId = info?.id ?? "";
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const callback = `${origin}/${locale}/account/bookings`;
    // Standard base64, not base64url: the payment page decodes with PHP's
    // base64_decode, which silently drops the "-" and "_" that base64url
    // substitutes — corrupting the id for any user whose encoding happens to
    // contain them. The value is URI-encoded below, so "+" and "/" travel safely.
    const accessToken = Buffer.from(userId).toString("base64");
    const redirect =
      `${API_BASE}/payment?payment_method=${encodeURIComponent(method)}` +
      `&access_token=${encodeURIComponent(accessToken)}` +
      `&zone_id=${encodeURIComponent(zoneId)}` +
      `&service_address_id=${encodeURIComponent(String(addressId))}` +
      // Required by the payment page's validator; omitting it bounced every
      // card payment to ?flag=fail before a gateway was ever reached. We only
      // ever send someone to the customer's own address.
      `&service_location=customer` +
      (isRepeat
        ? `&service_type=repeat&dates=${encodeURIComponent(dates)}`
        : `&service_schedule=${encodeURIComponent(schedule)}`) +
      `&callback=${encodeURIComponent(callback)}`;
    return NextResponse.json({ ok: true, redirect }, { status: 200 });
  }

  // Cash / offline: place the booking directly.
  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/booking/request/send",
    {
      payment_method: method,
      zone_id: zoneId,
      service_address_id: addressId,
      service_location: "customer",
      is_partial: 0,
      ...(isRepeat
        ? { service_type: "repeat", dates }
        : { service_type: "regular", service_schedule: schedule }),
    },
    locale
  );
  const content = json?.content as { flag?: string } | undefined;
  const success = ok && content?.flag !== "fail";
  return NextResponse.json(
    { ok: success, booking: content, message: apiErrorMessage(json) },
    { status: 200 }
  );
}
