import { cookies } from "next/headers";

export { ZONE_COOKIE } from "./cookies";
import { ZONE_COOKIE } from "./cookies";

/** The public/default zone used for anonymous browsing when none is chosen. */
export const DEFAULT_ZONE_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ZONE_ID ?? "a1614dbe-4732-11ee-9702-dee6e8d77be4";

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
