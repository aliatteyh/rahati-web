import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getToken } from "@/lib/session";
import { getZoneId } from "@/lib/zone";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/**
 * Clear the customer's search history.
 *
 * A proxy rather than a direct call: the token lives in an httpOnly cookie, so
 * the browser cannot send it itself. Sending no `id` clears every term, which is
 * what the "clear" control means.
 *
 * The upstream endpoint is a GET even though it deletes — a quirk of the backend
 * this cannot change. This route stays a POST so the destructive action is not
 * something a prefetch or a crawler can trigger.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}/api/v1/customer/remove-searched-keywords`, {
      headers: {
        Accept: "application/json",
        "X-localization": locale,
        Authorization: `Bearer ${token}`,
        zoneId,
      },
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
