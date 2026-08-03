import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

/**
 * Quotes a repeat of a package the customer already holds.
 *
 * Read-only on purpose — the backend creates nothing here. Buying the renewal
 * goes through the same booking request that sold the original, so there is one
 * purchase path rather than two that can drift apart.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const packageId = String(body.packageId ?? "");

  if (!packageId) {
    return NextResponse.json({ ok: false, message: "Missing package" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    `/api/v1/customer/service-package/my/${packageId}/renew`,
    undefined,
    locale
  );

  // The backend answers 200 with a response_code even on refusal, so the
  // envelope decides success here, not the HTTP status.
  const succeeded = ok && json?.response_code === "default_200";

  return NextResponse.json({
    ok: succeeded,
    quote: succeeded ? json?.content ?? null : null,
    message: json?.message ?? null,
    errors: json?.errors ?? null,
  });
}
