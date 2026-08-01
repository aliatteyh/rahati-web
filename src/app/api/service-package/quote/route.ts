import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { fetchPackageQuote } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const packageId = String(body.packageId ?? "");
  const serviceId = String(body.serviceId ?? "");
  const variantKey = String(body.variantKey ?? "");
  const weekdays: number[] = Array.isArray(body.weekdays) ? body.weekdays.map(Number) : [];

  if (!packageId || !serviceId || !variantKey || weekdays.length === 0) {
    return NextResponse.json({ error: "Missing package, service or weekdays" }, { status: 400 });
  }

  const quote = await fetchPackageQuote(
    packageId,
    {
      startDate: String(body.startDate ?? ""),
      time: String(body.time ?? "09:00"),
      weekdays,
      serviceId,
      variantKey,
      providerId: body.providerId ?? null,
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
