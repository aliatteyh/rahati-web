import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authSend } from "@/lib/account";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";

  const payload = {
    lat: String(body.lat ?? ""),
    lon: String(body.lon ?? ""),
    address: String(body.address ?? "").trim(),
    address_type: "service",
    address_label: String(body.address_label ?? "Home"),
    contact_person_name: String(body.contact_person_name ?? "").trim(),
    contact_person_number: String(body.contact_person_number ?? "").trim(),
    city: String(body.city ?? ""),
    street: String(body.street ?? ""),
    house: String(body.house ?? ""),
    floor: String(body.floor ?? ""),
  };
  if (!payload.lat || !payload.lon || !payload.address || !payload.contact_person_name || !payload.contact_person_number) {
    return NextResponse.json({ ok: false, message: "Missing address fields" }, { status: 400 });
  }

  const { ok, json } = await authSend("POST", "/api/v1/customer/address", payload, locale);
  return NextResponse.json({ ok, address: json?.content, message: json?.message }, { status: 200 });
}
