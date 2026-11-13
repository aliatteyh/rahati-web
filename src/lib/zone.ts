import { cookies } from "next/headers";

export { ZONE_COOKIE } from "./cookies";
import { ZONE_COOKIE } from "./cookies";

/**
 * The zone an anonymous visitor browses in before they tell us where they are.
 *
 * It has to be a zone with cleaners in it. It used to be
 * `a1614dbe-…` — the seeded "All over the World" zone, which covers the
 * planet and has **no provider subscribed to anything**. Measured on
 * production on 2026-11-13: that zone returned 0 days and 0 slots from
 * `available-slots`, while JVC returned 13 days of 09:00–18:00. So every
 * first-time visitor saw a booking page with no times at all and nothing
 * explaining why — and 33 of the 56 saved customer addresses sit in that same
 * empty zone.
 *
 * Rahati serves JVC today. When the service area grows, this is one of the two
 * places to change (the other is NEXT_PUBLIC_DEFAULT_ZONE_ID in the
 * environment, which wins).
 */
export const DEFAULT_ZONE_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ZONE_ID ?? "298e918a-4b3d-4ebd-8f60-12034574fa6c";

/** The area we actually cover, for telling somebody outside it. */
export const SERVED_AREA_KEY = "jvc";

export interface ZoneInfo {
  id: string;
  name?: string;
  count?: number;
  /** Where the customer actually is, when they have let us know. */
  lat?: number;
  lon?: number;
}

/** Read the chosen zone (id/name/available-count) from the cookie, if any. */
export async function getZoneInfo(): Promise<ZoneInfo | null> {
  const store = await cookies();
  const raw = store.get(ZONE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ZoneInfo;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The customer's own coordinates, or null.
 *
 * Null is an ordinary case, not a failure: someone who has never shared their
 * location still gets the whole site, just ordered by rating instead of by
 * distance. Nothing may depend on this being present.
 */
export async function getCustomerCoords(): Promise<{ lat: number; lon: number } | null> {
  const info = await getZoneInfo();
  if (typeof info?.lat !== "number" || typeof info?.lon !== "number") return null;
  return { lat: info.lat, lon: info.lon };
}

/** Zone id for API requests — the chosen zone, else the default zone. */
export async function getZoneId(): Promise<string> {
  const info = await getZoneInfo();
  return info?.id ?? DEFAULT_ZONE_ID;
}
