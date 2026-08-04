import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getToken } from "@/lib/session";
import { authSend } from "@/lib/account";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  // Checkout requires a logged-in customer (we have OTP auth).
  if (!(await getToken())) {
    return NextResponse.json({ ok: false, needsLogin: true }, { status: 200 });
  }

  const payload = {
    service_id: String(body.service_id ?? ""),
    category_id: String(body.category_id ?? ""),
    sub_category_id: String(body.sub_category_id ?? ""),
    variant_key: String(body.variant_key ?? ""),
    quantity: Number(body.quantity ?? 1),
    professional_count: Number(body.professional_count ?? 1),
    need_materials: Number(body.need_materials ?? 0),
    add_ons: Array.isArray(body.add_ons) ? body.add_ons : [],
    // Omitted unless the customer chose, so the backend keeps assigning as
    // before rather than receiving an empty string it has to validate away.
    ...(body.provider_id ? { provider_id: String(body.provider_id) } : {}),
    // Only sent when the customer is buying a package; the backend treats a
    // null package id as an ordinary line.
    ...(body.service_package_id
      ? {
          service_package_id: String(body.service_package_id),
          package_days_per_week: Number(body.package_days_per_week ?? 0),
          package_payment_mode: String(body.package_payment_mode ?? "pay_per_visit"),
        }
      : {}),
  };
  if (!payload.service_id || !payload.category_id || !payload.sub_category_id || !payload.variant_key) {
    return NextResponse.json({ ok: false, message: "Missing service data" }, { status: 400 });
  }

  const { ok, json } = await authSend("POST", "/api/v1/customer/cart/add", payload, locale);
  const message =
    (json?.message as string) ??
    (json?.errors as Array<{ message?: string }> | undefined)?.[0]?.message;
  return NextResponse.json({ ok, message }, { status: 200 });
}
