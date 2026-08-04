import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BusinessConfig } from "@/lib/types";
import { getZoneInfo } from "@/lib/zone";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { AuthButtons } from "./auth/AuthButtons";
import { AccountMenu } from "./auth/AccountMenu";
import { HeaderLocation } from "./location/HeaderLocation";

export async function SiteHeader({
  locale,
  dict,
  config,
  isLoggedIn = false,
}: {
  locale: Locale;
  dict: Dictionary;
  config: BusinessConfig;
  isLoggedIn?: boolean;
}) {
  const base = `/${locale}`;
  const brand = config.business_name || dict.brand;
  const zone = await getZoneInfo();

  const nav = [
    { href: `${base}`, label: dict.nav.home },
    { href: `${base}/services`, label: dict.nav.services },
    { href: `${base}#how-it-works`, label: dict.nav.howItWorks },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={base} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
            {brand.charAt(0)}
          </span>
          <span className="text-lg font-bold text-ink">{brand}</span>
        </Link>

        {/* In the bar itself, so a customer who knows what they want never has
            to guess which category it lives under. */}
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted transition hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* The bar is already full; the field itself lives in the hero, where
              the customer is deciding what they want. */}
          <Link
            href={`${base}/search`}
            aria-label={dict.search.title}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted transition hover:border-primary hover:text-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <HeaderLocation
            dict={dict.location as unknown as Record<string, string>}
            initialZoneName={zone?.name}
          />
          {isLoggedIn ? (
            <AccountMenu
              locale={locale}
              dict={dict.account as unknown as Record<string, string>}
              logoutLabel={dict.auth.logout}
            />
          ) : (
            <AuthButtons
              locale={locale}
              dict={dict.auth as unknown as Record<string, string>}
              isLoggedIn={false}
            />
          )}
          <LocaleSwitcher current={locale} />
          <Link
            href={`${base}/services`}
            className="hidden rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark sm:inline-block"
          >
            {dict.nav.book}
          </Link>
        </div>
      </div>
    </header>
  );
}
