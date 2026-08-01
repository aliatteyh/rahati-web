import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { fetchBookingQuote } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const serviceId = String(body.serviceId ?? "");
  const variantKey = String(body.variantKey ?? "");
  const dates: string[] = Array.isArray(body.dates) ? body.dates.map(String) : [];

  if (!serviceId || !variantKey || dates.length === 0) {
    return NextResponse.json({ error: "Missing service or dates" }, { status: 400 });
  }

  const quote = await fetchBookingQuote(
    {
      dates,
      serviceId,
      variantKey,
      quantity: Number(body.quantity ?? 1),
      professionalCount: Number(body.professionalCount ?? 1),
      needMaterials: Boolean(body.needMaterials),
      addOns: Array.isArray(body.addOns)
        ? body.addOns.map((a: { id: string; quantity?: number }) => ({
            id: String(a.id),
            quantity: Number(a.quantity ?? 1),
          }))
        : [],
    },
    locale
  );

  if (!quote) {
    return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
  }

  return NextResponse.json(quote);
}
