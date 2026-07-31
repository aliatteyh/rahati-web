import type { Locale } from "@/i18n/config";
import { getToken } from "./session";
import { getZoneId } from "./zone";

export const CHAT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/**
 * Auth + zone headers for chat proxy routes. Returns null when the user has no
 * session token (the route should then answer 401 instead of redirecting).
 */
export async function chatHeaders(
  locale: Locale
): Promise<Record<string, string> | null> {
  const token = await getToken();
  if (!token) return null;
  const zoneId = await getZoneId();
  return {
    Accept: "application/json",
    "X-localization": locale,
    Authorization: `Bearer ${token}`,
    zoneId,
  };
}
