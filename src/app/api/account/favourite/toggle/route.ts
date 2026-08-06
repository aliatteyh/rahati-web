import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";
import { getToken } from "@/lib/session";

/**
 * Add or remove a favourite, from wherever the service appears.
 *
 * Two endpoints on the backend, one here: the button that toggles it should not
 * have to know which of the two it is calling, and every caller would otherwise
 * repeat the same branch.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const serviceId = String(body.service_id ?? "").trim();
  const favourite = Boolean(body.favourite);

  if (!serviceId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Answered as 401 rather than a plain failure: authSend cannot distinguish
  // "not signed in" from "the request failed", and the button needs to know —
  // one sends the customer to log in, the other is a heart that flickers and
  // gives no reason.
  if (!(await getToken())) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const { ok } = favourite
    ? await authSend("POST", "/api/v1/customer/favorite/service", { service_id: serviceId }, locale)
    : await authSend(
        "POST",
        `/api/v1/customer/favorite/service-delete/${encodeURIComponent(serviceId)}`,
        {},
        locale
      );

  return NextResponse.json({ ok, favourite });
}
