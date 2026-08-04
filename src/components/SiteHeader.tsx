import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BusinessConfig } from "@/lib/types";
import { getZoneInfo } from "@/lib/zone";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { AuthButtons } from "./auth/AuthButtons";
import { AccountMenu } from "./auth/AccountMenu";
import { HeaderSearchLink } from "./search/HeaderSearchLink";
import { HeaderLocation } from "./location/HeaderLocation";
import { AutoLocate } from "./location/AutoLocate";

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
          {/* Hides itself on the home page, where the hero already carries a
              real search field. */}
          <HeaderSearchLink locale={locale} label={dict.search.title} />
          {/* Asks the browser for the visitor's area once, on a first visit,
              and does nothing visible either way. Lives in the header because
              it must run on every page, not only the home page. */}
          <AutoLocate />
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
