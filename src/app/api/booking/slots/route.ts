import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { fetchAvailableSlots } from "@/lib/api";

/** The days and times the server will accept, for the booking being built. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const serviceId = String(body.serviceId ?? "");
  const variantKey = String(body.variantKey ?? "");
  if (!serviceId || !variantKey) {
    return NextResponse.json({ error: "Missing service" }, { status: 400 });
  }

  const days = await fetchAvailableSlots(
    {
      serviceId,
      variantKey,
      professionalCount: Number(body.professionalCount ?? 1),
      needMaterials: Boolean(body.needMaterials),
      addOns: Array.isArray(body.addOns)
        ? body.addOns.map((a: { id: string; quantity?: number }) => ({
            id: String(a.id),
            quantity: Number(a.quantity ?? 1),
          }))
        : [],
      weekdays: Array.isArray(body.weekdays) ? body.weekdays.map(String) : [],
    },
    locale
  );

  return NextResponse.json({ days });
}
