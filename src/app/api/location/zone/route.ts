import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/** Resolve a zone from coordinates. Returns { found, id, name, count }. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = params.get("lat");
  const lng = params.get("lng");
  if (!lat || !lng) return NextResponse.json({ found: false }, { status: 400 });
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/customer/config/get-zone-id?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { headers: { Accept: "application/json", zoneId: "configuration" }, cache: "no-store" }
    );
    const json = await res.json();
    const zone = json?.content?.zone as { id?: string; name?: string } | undefined;
    if (!zone?.id) {
      return NextResponse.json({ found: false, message: json?.message });
    }
    return NextResponse.json({
      found: true,
      id: zone.id,
      name: zone.name,
      count: Number(json?.content?.available_services_count ?? 0),
    });
  } catch {
    return NextResponse.json({ found: false }, { status: 500 });
  }
}
