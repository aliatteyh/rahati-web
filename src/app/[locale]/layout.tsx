import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales, localeDirection, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";
import { isLoggedIn } from "@/lib/session";
import { SITE_URL, absoluteUrl, alternatesFor, ogLocale } from "@/lib/seo";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Analytics } from "@/components/seo/Analytics";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-tajawal",
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
  const image = config.logo_full_path || undefined;
  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: brand, template: `%s · ${brand}` },
    description,
    applicationName: brand,
    alternates: alternatesFor(locale, ""),
    robots: { index: true, follow: true },
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
  const [config, loggedIn] = await Promise.all([
    getConfig(typedLocale),
    isLoggedIn(),
  ]);

  return (
    <html lang={locale} dir={localeDirection[typedLocale]} className={tajawal.variable}>
      <body className="min-h-screen bg-surface text-ink">
        <SiteHeader locale={typedLocale} dict={dict} config={config} isLoggedIn={loggedIn} />
        <main>{children}</main>
        <SiteFooter locale={typedLocale} dict={dict} config={config} />
        <Analytics />
      </body>
    </html>
  );
}
