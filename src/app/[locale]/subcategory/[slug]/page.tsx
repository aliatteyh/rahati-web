import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo";
import {
  getCategories,
  getConfig,
  getBookableProviders,
  getHomeSections,
  getServicePackages,
  getServicesBySubcategory,
  getSubcategories,
  serviceFromPrice,
} from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { SubscriptionBrowser } from "@/components/browse/SubscriptionBrowser";
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

/**
 * The slug, written as a title.
 *
 * Only ever a fallback for a sub-category that really exists and whose parent
 * could not be read — never a way to give a made-up URL a name. A page that
 * titles itself "Nope" because somebody typed /subcategory/nope is a page the
 * site invented, and search engines index it.
 */
function prettify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Whether this is a sub-category at all.
 *
 * Asked of the panel's own ordered list, which is the same list the home page
 * and the top bar are built from — so a section that exists is always found,
 * and anything else is not a page.
 */
async function isRealSubcategory(slug: string, locale: Locale): Promise<boolean> {
  const sections = await getHomeSections(locale);
  if (sections.some((section) => section.slug === slug)) return true;

  // A sub-category with no bookable service yet is absent from that list but
  // is still a real page, so fall back to asking its parent.
  const categories = await getCategories(locale);
  const childLists = await Promise.all(
    categories.map((category) =>
      category.slug ? getSubcategories(category.slug, locale) : Promise.resolve([])
    )
  );

  return childLists.some((children) => children.some((child) => child.slug === slug));
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
    const minPrice = serviceFromPrice(s);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug ?? "",
      image: s.cover_image_full_path ?? s.thumbnail_full_path ?? s.image_full_path ?? null,
      shortDescription: s.short_description ?? null,
      isFeatured: Boolean(s.is_featured),
      badgeText: s.badge_text ?? null,
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

  if (services.length === 0 && !(await isRealSubcategory(slug, loc))) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

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

  // A sub-category with no services is an ordinary state — the catalogue is
  // filled over time — but a slug that belongs to no sub-category at all is
  // not a page, and must not be dressed up as one.
  if (services.length === 0 && !(await isRealSubcategory(slug, locale))) {
    notFound();
  }
  const currency = currencyLabel(config, locale);
  const name = await resolveName(slug, services, locale);
  const parent = services[0]?.category;

  // A sub-category sold by subscription asks two questions instead of listing
  // services: how long each visit runs, then how often. The packages decide
  // which shape this page takes — where there are none, nothing changes.
  const subCategoryId = services[0]?.sub_category_id ?? "";
  const packages = subCategoryId ? await getServicePackages(subCategoryId, locale) : [];
  const subscription = packages.length > 0 ? services[0] : null;

  // Each provider's working week, longest first, so the frequency screen prices
  // schedules somebody can actually staff.
  const ISO_BY_WEEKDAY: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 7,
  };
  const providers = subscription ? await getBookableProviders(subCategoryId, locale) : [];
  const workingWeeks = providers
    .map((p) => {
      const off = (p.weekends ?? []).map((d) => ISO_BY_WEEKDAY[String(d).toLowerCase()]);
      return [7, 1, 2, 3, 4, 5, 6].filter((d) => !off.includes(d));
    })
    .sort((a, b) => b.length - a.length);
  const durations = (subscription?.variations ?? [])
    .filter((v) => Number(v.duration_minutes) > 0 && Number(v.price) > 0)
    .map((v) => ({
      variantKey: String(v.variant_key ?? ""),
      minutes: Number(v.duration_minutes),
      price: toNumber(v.price),
    }))
    .sort((a, b) => a.minutes - b.minutes);

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
        {subscription && durations.length > 0 ? (
          <SubscriptionBrowser
            locale={locale}
            dict={dict.browse as unknown as Record<string, string>}
            currency={currency}
            serviceId={subscription.id}
            serviceSlug={subscription.slug ?? ""}
            durations={durations}
            packages={packages}
            workingWeeks={workingWeeks}
            categoryName={name}
          />
        ) : (
          <SubcategoryBrowser
            locale={locale}
            dict={dict.browse as unknown as Record<string, string>}
            currency={currency}
            services={toBrowseServices(services)}
            fromLabel={dict.category.from}
          />
        )}
      </div>
    </div>
  );
}
