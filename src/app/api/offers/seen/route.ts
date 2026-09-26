import { NextResponse } from "next/server";
import { getZoneId } from "@/lib/zone";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * Forwards a view to the backend.
 *
 * Through our own origin rather than straight from the browser so the zone
 * header is added server-side, the way every other call here works, and so an
 * ad blocker sees a first-party request rather than a cross-origin beacon.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const placement = String(body?.placement ?? "");

  if (!id || !["bar", "featured", "card", "popup"].includes(placement)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await fetch(`${API_BASE}/api/v1/customer/offers/seen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        zoneId: await getZoneId(),
      },
      body: JSON.stringify({ id, placement }),
      cache: "no-store",
    });
  } catch {
    /* the page does not wait on this and must not fail with it */
  }

  return NextResponse.json({ ok: true });
}
