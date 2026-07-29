import { cookies } from "next/headers";

export const ZONE_COOKIE = "rahati_zone";

/** The public/default zone used for anonymous browsing when none is chosen. */
export const DEFAULT_ZONE_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ZONE_ID ?? "a1614dbe-4732-11ee-9702-dee6e8d77be4";

export interface ZoneInfo {
  id: string;
  name?: string;
  count?: number;
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

/** Zone id for API requests — the chosen zone, else the default zone. */
export async function getZoneId(): Promise<string> {
  const info = await getZoneInfo();
  return info?.id ?? DEFAULT_ZONE_ID;
}
