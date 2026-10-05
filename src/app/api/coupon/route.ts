import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { validateCoupon } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const couponCode = String(body.couponCode ?? "").trim();
  const serviceId = String(body.serviceId ?? "");
  const amount = Number(body.amount ?? 0);
  const locale = isLocale(body.locale) ? body.locale : "en";

  if (!couponCode || !serviceId) {
    return NextResponse.json(
      { valid: false, discount_amount: 0, message: "Missing coupon or service" },
      { status: 400 }
    );
  }

  // The length and day currently on screen, so the offer's own rules are
  // judged against what the customer is actually looking at.
  const minutes = Number(body.minutes ?? 0);
  const dates = Array.isArray(body.dates) ? body.dates.map(String) : [];

  const visitsPerWeek = Number(body.visitsPerWeek ?? 0);

  const result = await validateCoupon(
    couponCode,
    serviceId,
    amount,
    locale,
    minutes,
    dates,
    visitsPerWeek
  );
  return NextResponse.json(result);
}
