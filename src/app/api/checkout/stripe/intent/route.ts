import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";
import { apiErrorMessage } from "@/lib/apiError";

/**
 * Asks the backend to prepare a card payment for what is in the cart.
 *
 * Returns a client secret the card fields need, and the publishable key to mount
 * them with. Neither is sensitive — the publishable key is designed to sit in a
 * public page, and the client secret is scoped to this one payment.
 *
 * No booking exists yet at this point, and that is deliberate: a booking created
 * before the money arrives is a service promised for free.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const isRepeat = String(body.service_type ?? "") === "repeat";

  if (!body.service_address_id) {
    return NextResponse.json({ ok: false, message: "Address required" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/payment/stripe/intent",
    {
      zone_id: String(body.zone_id ?? ""),
      service_address_id: body.service_address_id,
      service_location: "customer",
      is_partial: 0,
      ...(isRepeat
        ? { service_type: "repeat", dates: String(body.dates ?? "") }
        : { service_schedule: String(body.service_schedule ?? "") }),
    },
    locale
  );

  const content = json?.content as Record<string, unknown> | undefined;

  return NextResponse.json(
    { ok: ok && Boolean(content?.client_secret), ...content, message: apiErrorMessage(json) },
    { status: 200 }
  );
}
