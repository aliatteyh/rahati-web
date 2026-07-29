import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** Absolute URL for a site-relative path (leading slash optional). */
export function absoluteUrl(path = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "" : clean}`;
}

/**
 * Canonical + hreflang alternates for a page.
 * `path` is the locale-less path, e.g. "" (home), "/services", "/service/foo".
 */
export function alternatesFor(locale: Locale, path = ""): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = absoluteUrl(`/${l}${path}`);
  }
  languages["x-default"] = absoluteUrl(`/en${path}`);
  return {
    canonical: absoluteUrl(`/${locale}${path}`),
    languages,
  };
}

/** OpenGraph locale code (Facebook style) for a UI locale. */
export function ogLocale(locale: Locale): string {
  return locale === "ar" ? "ar_AR" : "en_US";
}
