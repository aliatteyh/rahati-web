import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZONE_COOKIE } from "@/lib/zone";

/** Persist the chosen zone (id/name/available-count) in a cookie. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  // The coordinates come free with the zone lookup and were being thrown away
  // the moment they had served it. Kept, they let the site answer "nearest to
  // me" — a zone is a whole city, and everything in it looked equally close.
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  const value = JSON.stringify({
    id,
    name: body.name ? String(body.name) : undefined,
    count: Number.isFinite(body.count) ? Number(body.count) : undefined,
    ...(hasCoords ? { lat, lon } : {}),
  });

  const store = await cookies();
  store.set(ZONE_COOKIE, value, {
    httpOnly: false, // readable client-side for the header indicator
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return NextResponse.json({ ok: true });
}
