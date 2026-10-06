import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BusinessConfig } from "@/lib/types";
import { getZoneInfo } from "@/lib/zone";
import { uploadedImage } from "@/lib/branding";
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
  const logo = uploadedImage(config.logo_full_path);
  const zone = await getZoneInfo();
  const showName = config.show_business_name === true;

  // The page's own sections, in the order they appear on it.
  //
  // Anchors, not pages: every one of these is a block of the home page, and a
  // link that loads a new document to show something already on screen is
  // slower and loses the reader's place. Only entries whose section exists are
  // listed — a nav item that scrolls nowhere is worse than one that is absent.
  const nav = [
    { href: `${base}#offers`, label: dict.naqi.navOffers },
    { href: `${base}#services`, label: dict.naqi.navServices },
    { href: `${base}#pricing`, label: dict.naqi.navPricing },
    { href: `${base}#how-it-works`, label: dict.nav.howItWorks },
    { href: `${base}#business`, label: dict.naqi.navBusiness },
    { href: `${base}#zones`, label: dict.naqi.navAreas },
    { href: `${base}#careers`, label: dict.naqi.navCareers },
    // A page, not an anchor, and the only one in this list: the articles are
    // their own documents and the panel publishes them without touching the
    // home page. Dropping it when the header was redesigned took the only
    // route a reader had to them.
    { href: `${base}/blog`, label: dict.nav.blog },
    { href: `${base}#faq`, label: dict.naqi.navFaq },
  ];

  return (
    /* Naqi §4 header: translucent paper over whatever scrolls beneath it, a
       hairline rather than a border, and the page's own container so the logo
       sits on the same line as everything else on the page. */
    <header className="sticky top-0 z-50 border-b border-line bg-paper/[0.88] backdrop-blur-[14px]">
      <div className="mx-auto flex h-[72px] w-full max-w-page items-center gap-4 px-[clamp(20px,4vw,48px)]">
        <Link href={base} className="flex shrink-0 items-center gap-2.5">
          {/* The uploaded logo when there is one, the brand's initial when there
              is not — so the header is never a broken image or the admin
              panel's grey "upload a file" placeholder. */}
          {logo ? (
            // Fixed height, free width, and never cropped: a logo is whatever
            // shape its owner drew it. The square `object-cover` that stood
            // here was written for a square mark and cut the wordmark off a
            // wide one, leaving the icon alone.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={brand}
              className="h-9 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-green text-base font-bold text-white">
              {brand.charAt(0)}
            </span>
          )}
          {/* Printed only when the office asks for it, or when there is no logo
              to carry the name — otherwise a logo with the name already in it
              says it twice and pushes the rest of the row off a narrow
              screen. */}
          {(showName || !logo) && (
            <span className="text-[19px] font-semibold text-ink">{brand}</span>
          )}
        </Link>

        {/* Centred, and only where there is room for it. Below the wide
            breakpoint the links move into the menu button at the end of the
            row — they used to simply stop being drawn, which left a phone with
            no way to reach any section of the site. */}
        <nav className="hidden flex-1 items-center justify-center gap-7 wide:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14.5px] font-medium text-ink-62 transition hover:text-green"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2.5 wide:flex-none">
          {/* Hides itself on the home page, where the hero already carries a
              real search field. */}
          <HeaderSearchLink locale={locale} label={dict.search.title} />
          {/* Asks the browser for the visitor's area once, on a first visit,
              and does nothing visible either way. */}
          <AutoLocate />
          <HeaderLocation
            dict={dict.location as unknown as Record<string, string>}
            initialZoneName={zone?.name}
          />
          <LocaleSwitcher current={locale} />
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
          {/* The one filled button on the page, and the last thing in the row:
              everything beside it is an outline or plain text, which is what
              makes it read as the thing to press. */}
          <Link
            href={`${base}/services`}
            className="hidden shrink-0 rounded-full bg-ink px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-green wide:inline-block"
          >
            {dict.nav.book}
          </Link>

          {/* Everything that drops out of the row at this width lives in here,
              including the booking button above. */}
          <MobileMenu
            items={nav}
            bookHref={`${base}/services`}
            bookLabel={dict.nav.book}
            openLabel={dict.nav.menu}
            closeLabel={dict.nav.closeMenu}
          />
        </div>
      </div>
    </header>
  );
}
