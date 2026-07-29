import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { getToken } from "./session";
import { getZoneId } from "./zone";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/**
 * Authenticated GET for account pages (server-only). Redirects to /login when
 * there is no token. Returns the response `content`, or `fallback` on failure.
 */
export async function authGet<T>(path: string, locale: Locale, fallback: T): Promise<T> {
  const token = await getToken();
  if (!token) redirect(`/${locale}/login`);
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "X-localization": locale,
        Authorization: `Bearer ${token}`,
        zoneId,
      },
      cache: "no-store",
    });
    if (res.status === 401) redirect(`/${locale}/login`);
    if (!res.ok) return fallback;
    const json = await res.json();
    return (json?.content ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** Paginated account lists wrap rows in content.data. */
export async function authGetList<T>(path: string, locale: Locale): Promise<T[]> {
  const content = await authGet<{ data?: T[] } | T[]>(path, locale, []);
  if (Array.isArray(content)) return content;
  return content?.data ?? [];
}

/** Authenticated mutation used by client-triggered account actions. */
export async function authSend(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body: Record<string, unknown> | undefined,
  locale: Locale
): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const token = await getToken();
  if (!token) return { ok: false, json: {} };
  try {
    const zoneId = await getZoneId();
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-localization": locale,
        Authorization: `Bearer ${token}`,
        zoneId,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  } catch {
    return { ok: false, json: {} };
  }
}
