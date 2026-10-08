import type { Metadata } from "next";
import { Almarai, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales, localeDirection, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";
import { uploadedImage } from "@/lib/branding";
import { isLoggedIn } from "@/lib/session";
import { SITE_URL, absoluteUrl, alternatesFor, ogLocale } from "@/lib/seo";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PromoBar } from "@/components/offers/PromoBar";
import { OfferPopup } from "@/components/offers/OfferPopup";
import { getOffers } from "@/lib/api";
import { Analytics } from "@/components/seo/Analytics";
import { GoogleTagManager } from "@/components/seo/GoogleTagManager";

/**
 * Two faces, one voice.
 *
 * One family was set for both scripts, which sounds tidy and is not: a Latin
 * face with Arabic bolted on draws the Arabic a little flat, and an Arabic
 * face's Latin is almost always its weaker half. Readers see whichever half
 * was the afterthought.
 *
 * So each script gets a face chosen for it, and the stack decides per glyph:
 * Latin letters and figures come from the first, every Arabic letter falls
 * through to the second. The two are matched on the only things that make a
 * pair read as one voice — an open aperture, a generous x-height and the same
 * weights.
 *
 * Almarai is the Arabic: even, quiet and unfussy, which is what a page of
 * prices and dates wants. It ships four weights and no 500 or 600, so the
 * browser resolves a medium to the regular and a semibold to the bold — the
 * hierarchy stays, it simply has three steps rather than four.
 */
const arabic = Almarai({
  subsets: ["arabic"],
  weight: ["400", "700", "800"],
  variable: "--font-arabic",
  display: "swap",
});

/**
 * The Latin half. Humanist rather than grotesque — the figures have real
 * shapes, which matters on a page that is mostly prices and durations.
 */
const latin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
});

// Numbers, promo codes, booking refs and countdowns. A countdown set in a
// proportional face jumps on every tick because its digits are different
// widths; these do not.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const config = await getConfig(locale);
  const brand = config.business_name || dict.brand;
  const description = dict.hero.subtitle;
  const image = uploadedImage(config.logo_full_path) ?? undefined;
  // The tab icon follows the admin panel, with a file in `public/` behind it.
  //
  // The file used to live at `src/app/favicon.ico`, which Next turns into a
  // route and advertises itself — and browsers ask for `/favicon.ico` by
  // convention before reading any <link> tag, so the built-in file answered
  // first and the uploaded icon never appeared. Moved to `public/`, it is only
  // ever served when this points at it.
  const favicon = uploadedImage(config.favicon_full_path) ?? "/favicon.ico";
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: brand, template: `%s · ${brand}` },
    description,
    applicationName: brand,
    alternates: alternatesFor(locale, ""),
    robots: { index: true, follow: true },
    icons: { icon: favicon, shortcut: favicon, apple: favicon },
    openGraph: {
      title: brand,
      description,
      type: "website",
      siteName: brand,
      locale: ogLocale(locale),
      url: absoluteUrl(`/${locale}`),
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: brand,
      description,
      images: image ? [image] : undefined,
    },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);
  const [config, loggedIn, offers] = await Promise.all([
    getConfig(typedLocale),
    isLoggedIn(),
    getOffers(typedLocale),
  ]);

  return (
    <html lang={locale} dir={localeDirection[typedLocale]} className={`${latin.variable} ${arabic.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-surface text-ink">
        {/* First inside <body>, where Google's own snippet expects it. */}
        <GoogleTagManager />
        {/* Above the header, so it reads as an announcement about the site
            rather than as part of the navigation. */}
        <PromoBar
          offers={offers.bar}
          serverTime={offers.server_time}
          locale={typedLocale}
          dict={dict.offers}
        />
        <SiteHeader locale={typedLocale} dict={dict} config={config} isLoggedIn={loggedIn} />
        <main>{children}</main>
        <SiteFooter locale={typedLocale} dict={dict} config={config} />
        {/* In the layout rather than on the home page: a visitor who arrives
            on a service page from a search result is just as new. */}
        <OfferPopup
          offer={offers.popup}
          serverTime={offers.server_time}
          locale={typedLocale}
          dict={dict.offers}
        />
        <Analytics />
      </body>
    </html>
  );
}
