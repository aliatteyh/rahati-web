import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ suggestions: [] });
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/customer/config/place-api-autocomplete?search_text=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json", zoneId: "configuration" }, cache: "no-store" }
    );
    const json = await res.json();
    return NextResponse.json(json?.content ?? { suggestions: [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
