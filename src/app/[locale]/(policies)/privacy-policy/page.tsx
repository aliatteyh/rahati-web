import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo";
import { PolicyPage } from "@/components/PolicyPage";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const title = (getDictionary(loc).footer as unknown as Record<string, string>).privacy;
  return {
    title,
    alternates: alternatesFor(loc, "/privacy-policy"),
    // Five near-identical legal pages competing with the pages that sell.
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const title = (getDictionary(loc).footer as unknown as Record<string, string>).privacy;
  return <PolicyPage locale={loc} settingKey="privacy_policy" title={title} />;
}
