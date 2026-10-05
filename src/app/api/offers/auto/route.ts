import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getZoneId } from "@/lib/zone";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * Asks the server whether anything discounts this booking on its own.
 *
 * Through our own origin so the zone header is added server-side, like every
 * other call here — and a quiet failure, because an offer that cannot be
 * fetched is simply an offer the customer does not get, never a broken screen.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const serviceId = String(body?.serviceId ?? "");
  const amount = Number(body?.amount ?? 0);
  const locale = isLocale(body?.locale) ? body.locale : "en";

  if (!serviceId || !(amount > 0)) {
    return NextResponse.json({ offer: null });
  }

  const params = new URLSearchParams({
    service_id: serviceId,
    amount: String(amount),
  });

  if (Number(body?.minutes) > 0) params.set("minutes", String(Number(body.minutes)));
  if (Number(body?.visitsPerWeek) > 0) {
    params.set("visits_per_week", String(Number(body.visitsPerWeek)));
  }
  if (Array.isArray(body?.dates)) {
    body.dates.filter(Boolean).forEach((d: unknown) => params.append("dates[]", String(d)));
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/customer/offers/auto?${params}`, {
      headers: {
        Accept: "application/json",
        "X-localization": locale,
        zoneId: await getZoneId(),
      },
      cache: "no-store",
    });

    const json = await res.json();

    return NextResponse.json({ offer: json?.content?.offer ?? null });
  } catch {
    return NextResponse.json({ offer: null });
  }
}
