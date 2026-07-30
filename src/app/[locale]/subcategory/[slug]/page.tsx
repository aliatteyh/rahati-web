import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo";
import {
  getConfig,
  getServicesBySubcategory,
  getSubcategories,
} from "@/lib/api";
import type { Service } from "@/lib/types";
import {
  SubcategoryBrowser,
  type BrowseService,
} from "@/components/browse/SubcategoryBrowser";

type Params = Promise<{ locale: string; slug: string }>;

function toNumber(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function prettify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Resolve the subcategory display name via its parent's childes list. */
async function resolveName(
  slug: string,
  services: Service[],
  locale: Locale
): Promise<string> {
  const parentSlug = services[0]?.category?.slug;
  if (parentSlug) {
    const subs = await getSubcategories(parentSlug, locale);
    const found = subs.find((s) => s.slug === slug);
    if (found?.name) return found.name;
  }
  return prettify(slug);
}

function toBrowseServices(services: Service[]): BrowseService[] {
  return services.map((s) => {
    const variants = (s.variations ?? [])
      .map((v) => ({
        minutes: v.duration_minutes ?? 0,
        price: toNumber(v.price),
      }))
      .filter((v) => v.minutes > 0);
    const prices = variants.map((v) => v.price).filter((p) => p > 0);
    const minPrice =
      prices.length > 0
        ? Math.min(...prices)
        : toNumber(s.min_bidding_price ?? s.starting_price ?? s.price);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug ?? "",
      image: s.thumbnail_full_path ?? s.image_full_path ?? s.cover_image_full_path ?? null,
      variants,
      minPrice,
      avgRating: s.avg_rating,
      ratingCount: s.rating_count,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const services = await getServicesBySubcategory(slug, loc);
  const name = await resolveName(slug, services, loc);
  return {
    title: name,
    description: name,
    alternates: alternatesFor(loc, `/subcategory/${slug}`),
    openGraph: { title: name, description: name },
  };
}

export default async function SubcategoryPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const [services, config] = await Promise.all([
    getServicesBySubcategory(slug, locale),
    getConfig(locale),
  ]);
  const currency = config.currency_symbol || dict.common.currency;
  const name = await resolveName(slug, services, locale);
  const parent = services[0]?.category;

  return (
    <div>
      <section className="bg-gradient-to-b from-primary-light to-surface">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <nav className="mb-2 text-sm text-muted">
            <Link href={`/${locale}`} className="hover:text-primary">
              {dict.nav.home}
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/${locale}/services`} className="hover:text-primary">
              {dict.nav.services}
            </Link>
            {parent?.slug && parent?.name && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`/${locale}/category/${parent.slug}`}
                  className="hover:text-primary"
                >
                  {parent.name}
                </Link>
              </>
            )}
          </nav>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{name}</h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <SubcategoryBrowser
          locale={locale}
          dict={dict.browse as unknown as Record<string, string>}
          currency={currency}
          services={toBrowseServices(services)}
          fromLabel={dict.category.from}
        />
      </div>
    </div>
  );
}
