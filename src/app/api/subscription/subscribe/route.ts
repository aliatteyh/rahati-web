import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/** Subscribe the logged-in customer to a Pro Member plan (wallet / free trial). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const planId = String(body.plan_id ?? "").trim();
  const paymentMethod =
    body.payment_method != null ? String(body.payment_method) : undefined;

  if (!planId) {
    return NextResponse.json({ ok: false, reason: "missing_plan" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    "/api/v1/customer/subscription/subscribe",
    paymentMethod ? { plan_id: planId, payment_method: paymentMethod } : { plan_id: planId },
    locale
  );

  // The backend may return a payment-gateway redirect URL for card payments.
  const redirect =
    (json?.content as { redirect_link?: string; payment_url?: string } | undefined)
      ?.redirect_link ||
    (json?.content as { redirect_link?: string; payment_url?: string } | undefined)
      ?.payment_url ||
    null;

  return NextResponse.json({ ok, redirect }, { status: ok ? 200 : 400 });
}
