"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

/**
 * The header's route to search — everywhere except the home page.
 *
 * The hero carries a real search field, but only on the home page; from a
 * service or category page there would otherwise be no way to search at all.
 * Showing the icon there too would just be the same control twice on one
 * screen, so it stands down where the field already is.
 */
export function HeaderSearchLink({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();

  // Home is `/en` or `/en/` and nothing else; a trailing segment is a real page.
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  if (isHome) return null;

  return (
    <Link
      href={`/${locale}/search`}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
