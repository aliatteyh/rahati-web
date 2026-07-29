import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = params.get("lat");
  const lng = params.get("lng");
  if (!lat || !lng) return NextResponse.json({}, { status: 400 });
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/customer/config/geocode-api?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { headers: { Accept: "application/json", zoneId: "configuration" }, cache: "no-store" }
    );
    const json = await res.json();
    return NextResponse.json(json?.content ?? {});
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
