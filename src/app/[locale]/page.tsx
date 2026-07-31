import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getBanners,
  getCategories,
  getConfig,
  getPopularServices,
  formatPrice,
  serviceFromPrice,
} from "@/lib/api";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryCard } from "@/components/CategoryCard";
import { ServiceCard } from "@/components/ServiceCard";
import { SectionHeader } from "@/components/SectionHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const [categories, popular, config, banners] = await Promise.all([
    getCategories(locale),
    getPopularServices(locale, 8),
    getConfig(locale),
    getBanners(locale),
  ]);
  const currency = config.currency_symbol || dict.common.currency;

  const steps = [
    { title: dict.steps.s1Title, text: dict.steps.s1Text },
    { title: dict.steps.s2Title, text: dict.steps.s2Text },
    { title: dict.steps.s3Title, text: dict.steps.s3Text },
  ];

  const brand = config.business_name || dict.brand;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brand,
      url: absoluteUrl(`/${locale}`),
      ...(config.logo_full_path ? { logo: config.logo_full_path } : {}),
      ...(config.business_email ? { email: config.business_email } : {}),
      ...(config.business_phone ? { telephone: config.business_phone } : {}),
      ...(config.business_address
        ? { address: { "@type": "PostalAddress", streetAddress: config.business_address } }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: brand,
      url: absoluteUrl(`/${locale}`),
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl(`/${locale}/services`)}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-light to-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {dict.hero.badge}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-ink sm:text-5xl">
              {dict.hero.title}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted">{dict.hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${base}/services`}
                className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark"
              >
                {dict.hero.ctaPrimary}
              </Link>
              <Link
                href={`${base}#how-it-works`}
                className="rounded-full border border-border bg-surface px-6 py-3 font-semibold text-ink transition hover:border-primary"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
              {[dict.hero.stat1, dict.hero.stat2, dict.hero.stat3].map((s) => (
                <span key={s} className="inline-flex items-center gap-2">
                  <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </span>
              ))}
            </div>
          </div>
          {banners.length > 0 ? (
            /* Promotional banners inside the hero showcase box */
            <BannerCarousel banners={banners} locale={locale} variant="hero" />
          ) : (
            <div className="relative hidden md:block">
              <div className="aspect-square rounded-[2rem] bg-primary/10" />
              <div className="absolute inset-6 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-dark opacity-90" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-6xl font-bold text-white/90">
                  {(config.business_name || dict.brand).charAt(0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeader
            title={dict.sections.categories}
            subtitle={dict.sections.categoriesSub}
            href={`${base}/services`}
            seeAllLabel={dict.sections.seeAll}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                locale={locale}
                label={dict.category.book}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular services */}
      {popular.length > 0 && (
        <section className="bg-surface-soft py-16">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeader
              title={dict.sections.popular}
              subtitle={dict.sections.popularSub}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {popular.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  href={service.slug ? `${base}/service/${service.slug}` : undefined}
                  fromLabel={dict.category.from}
                  priceLabel={formatPrice(serviceFromPrice(service), currency)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeader title={dict.sections.howItWorks} />
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-light text-lg font-bold text-primary">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark px-8 py-14 text-center">
          <h2 className="text-3xl font-bold text-white">{dict.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{dict.cta.text}</p>
          <Link
            href={`${base}/services`}
            className="mt-8 inline-block rounded-full bg-white px-7 py-3 font-semibold text-primary transition hover:bg-primary-light"
          >
            {dict.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
