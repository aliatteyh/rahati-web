import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

export async function GET(request: Request) {
  const placeId = new URL(request.url).searchParams.get("place_id")?.trim();
  if (!placeId) return NextResponse.json({}, { status: 400 });
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/customer/config/place-api-details?placeid=${encodeURIComponent(placeId)}`,
      { headers: { Accept: "application/json", zoneId: "configuration" }, cache: "no-store" }
    );
    const json = await res.json();
    return NextResponse.json(json?.content ?? {});
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
