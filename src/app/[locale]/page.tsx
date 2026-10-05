import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getOffers,
  getAdvertisements,
  getBanners,
  getHomeSections,
  getNearbyProviders,
  getConfig,
  getPopularServices,
  formatPrice,
  serviceFromPrice,
  serviceFromDuration,
  getServiceAreas,
  getServiceDetail,
  getSiteStats,
} from "@/lib/api";
import { BannerCarousel } from "@/components/BannerCarousel";
import { SearchBox } from "@/components/search/SearchBox";
import { OffersSection } from "@/components/offers/OffersSection";
import { AdvertisementRail } from "@/components/home/AdvertisementRail";
import { HomeHighlights } from "@/components/home/HomeHighlights";
import { Testimonials } from "@/components/home/Testimonials";
import { ProviderRail } from "@/components/home/ProviderRail";
import { ServiceCard } from "@/components/ServiceCard";
import { NaqiHero } from "@/components/naqi/NaqiHero";
import { NaqiServices } from "@/components/naqi/NaqiServices";
import { NaqiHow } from "@/components/naqi/NaqiHow";
import { NaqiCta } from "@/components/naqi/NaqiCta";
import { NaqiZones } from "@/components/naqi/NaqiZones";
import { NaqiPricing, type PriceRow } from "@/components/naqi/NaqiPricing";
import { NaqiFaq } from "@/components/naqi/NaqiFaq";
import { NaqiHeroMedia } from "@/components/naqi/NaqiHeroMedia";
import { NaqiBannerSlot } from "@/components/naqi/NaqiBannerSlot";
import { NaqiContact } from "@/components/naqi/NaqiContact";
import { NaqiCareers } from "@/components/naqi/NaqiCareers";
import { SectionHeader } from "@/components/SectionHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { currencyLabel } from "@/lib/currency";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const [sections, popular, config, banners, slotOne, slotTwo, ads, providers, offers, zones, stats] =
    await Promise.all([
      getHomeSections(locale),
      getPopularServices(locale, 8),
      getConfig(locale),
      // Only the banners the office put in the hero.
      getBanners(locale, 10, "web-hero"),
      // The two mid-page strips. Separate calls rather than one list the
      // page sorts out, because "which slot" is the panel's decision and
      // the server is the one holding it.
      getBanners(locale, 5, "web-1"),
      getBanners(locale, 5, "web-2"),
      getAdvertisements(locale),
      getNearbyProviders(locale),
      getOffers(locale),
      // The panel's own service areas. Fetched with the rest rather than in
      // the section, so a slow answer delays nothing that is already drawn.
      getServiceAreas(locale),
      getSiteStats(locale),
    ]);

  // The two services the pricing section is about, by how the panel books them
  // rather than by name: `single` is the hourly one and `unit` the one sold by
  // home size. Reading the flow rather than a slug means renaming a service in
  // the panel does not empty a section of the website.
  const hourlySlug = sections.find((s) => s.booking_flow === "single")?.service_slug;
  const unitSlug = sections.find((s) => s.booking_flow === "unit")?.service_slug;

  const [hourlyService, unitService] = await Promise.all([
    hourlySlug ? getServiceDetail(hourlySlug, locale) : Promise.resolve(undefined),
    unitSlug ? getServiceDetail(unitSlug, locale) : Promise.resolve(undefined),
  ]);
  const currency = currencyLabel(config, locale);


  const steps = [
    { title: dict.steps.s1Title, text: dict.steps.s1Text },
    { title: dict.steps.s2Title, text: dict.steps.s2Text },
    { title: dict.steps.s3Title, text: dict.steps.s3Text },
  ];

  // The lowest price anybody can actually book, across everything on offer.
  // Nothing is written down: the office changes a variation and the hero
  // follows it.
  const cheapest = popular
    .map((service) => serviceFromPrice(service))
    .filter((price) => price > 0)
    .reduce((low, price) => (low === 0 || price < low ? price : low), 0);

  // The first banner the panel publishes doubles as the hero artwork, so the
  // picture is the office's to change without a release.
  const heroImage =
    banners[0]?.banner_image_full_path ??
    popular.find((service) => service.image_full_path)?.image_full_path ??
    null;

  // The catalogue as the panel orders it — the same four the app shows, so the
  // website and the phone cannot disagree about what is on offer.
  //
  // The price comes from the popular list when that list happens to carry the
  // section's service, and is simply left off when it does not: a card with no
  // price is honest, a card with a guessed one is not.
  const serviceCards = sections.map((section) => {
    const match = popular.find(
      (service) => service.slug && service.slug === section.service_slug
    );
    const from = match ? serviceFromPrice(match) : 0;

    return {
      id: section.id,
      name: section.name,
      description: section.description,
      image: section.image_full_path,
      href: section.service_slug
        ? `${base}/service/${section.service_slug}`
        : `${base}/category/${section.slug}`,
      priceLabel: from > 0 ? formatPrice(from, currency) : null,
    };
  });

  /**
   * Arabic counts things in four shapes, not two.
   *
   * "3 ساعة" is what a plain number-plus-noun produces and it is wrong in the
   * way a native reader notices immediately. Two is its own word, three to ten
   * take the plural, and eleven upwards goes back to the singular — so the
   * figures on a price list have to be written, not concatenated. English is
   * the easy case and gets the ordinary rule.
   */
  const hoursPhrase = (value: number): string => {
    if (locale !== "ar") {
      return `${value} ${value === 1 ? dict.naqi.hourWord : dict.naqi.hoursWord}`;
    }

    if (value === 1) return dict.naqi.hourOne;
    if (value === 2) return dict.naqi.hourTwo;
    if (Number.isInteger(value) && value >= 3 && value <= 10) {
      return `${value} ${dict.naqi.hoursFew}`;
    }

    return `${value} ${dict.naqi.hoursMany}`;
  };

  const cleanersPhrase = (value: number): string => {
    if (locale !== "ar") {
      return `${value} ${value === 1 ? dict.naqi.cleanerWord : dict.naqi.cleanersWord}`;
    }

    if (value === 1) return dict.naqi.cleanerOne;
    if (value === 2) return dict.naqi.cleanerTwo;
    if (value >= 3 && value <= 10) return `${value} ${dict.naqi.cleanersFew}`;

    return `${value} ${dict.naqi.cleanersMany}`;
  };

  /**
   * "4-hours" is a key, not a name.
   *
   * Where the panel never gave a variation a human name it falls back to the
   * key, and an Arabic page then reads "4-hours" in the middle of a sentence.
   * A name somebody actually typed — "Studio", "1 Bedroom" — is left exactly
   * as they typed it; only the machine-made ones are replaced.
   */
  const tidyVariantName = (name: string, hours: number): string => {
    const machineMade = /^\s*\d+(\.\d+)?[\s-]*hours?\s*$/i.test(name);

    return machineMade && hours ? hoursPhrase(hours) : name;
  };

  // Both price columns are the panel's variations, formatted and nothing more.
  // A row whose price will not parse is dropped rather than shown as zero.
  //
  // Sorted by length, not by the order the panel happens to return: a list that
  // runs 2, 3, 4 … 8 and then 2.5 reads as a mistake, and the reader stops
  // trusting the column before they reach the price they came for.
  const priceRows = (service: typeof hourlyService, withDetail: boolean): PriceRow[] =>
    (service?.variations ?? [])
      .map((variation, i) => {
        const price = formatPrice(variation.price, currency);
        if (!price) return null;

        const minutes = variation.duration_minutes ?? 0;
        const hours = minutes ? Math.round((minutes / 60) * 10) / 10 : 0;
        const crew = variation.cleaners_count ?? 0;

        const detail = [
          hours ? hoursPhrase(hours) : null,
          crew ? cleanersPhrase(crew) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return {
          key: variation.variant_key ?? `${i}`,
          // The panel's own name, unless it is the machine-made "4-hours" that
          // nobody typed — then the reader gets the length in their language.
          label: tidyVariantName(variation.variant ?? variation.variant_key ?? "", hours),
          price,
          detail: withDetail && detail ? detail : null,
          sort: minutes || i,
        };
      })
      .filter((row) => row !== null)
      .sort((a, b) => a!.sort - b!.sort) as PriceRow[];

  // The questions the panel already answers on the services themselves, pooled
  // for the home page. Deduplicated by the question: the same "do you bring
  // materials?" is written against several services, and a reader meeting it
  // three times in one list concludes nobody proof-read the page.
  const faqItems = Array.from(
    new Map(
      [hourlyService, unitService]
        .flatMap((service) => service?.faqs ?? [])
        .filter((faq) => faq.question && faq.answer)
        .map((faq) => [faq.question as string, {
          question: faq.question as string,
          answer: faq.answer as string,
        }])
    ).values()
  ).slice(0, 8);

  // Only the figures the server was willing to publish. It withholds a rating
  // under ten votes and a booking count under fifty, so anything that arrives
  // is a figure worth printing — and the row simply shortens when one is not
  // there rather than showing a zero.
  const heroStats = [
    stats.customer_rating != null && {
      value: String(stats.customer_rating),
      label: dict.naqi.statRating,
    },
    stats.completed_bookings != null && {
      value: `+${stats.completed_bookings.toLocaleString(locale === "ar" ? "ar-AE" : "en-AE")}`,
      label: dict.naqi.statBookings,
    },
    stats.served_areas != null && {
      value: String(stats.served_areas),
      label: dict.naqi.statAreas,
    },
  ].filter(Boolean) as { value: string; label: string }[];

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
      {/* Hero — Naqi §4.
          The starting price is the cheapest option the panel actually sells,
          read from the services themselves. A price typed into a page is a
          price that goes stale the first time the office changes one. */}
      <NaqiHero
        eyebrow={dict.naqi.heroEyebrow}
        titleTop={dict.naqi.heroTitleTop}
        titleBottom={dict.naqi.heroTitleBottom}
        subtitle={dict.naqi.heroSubtitle}
        ctaLabel={dict.naqi.heroCta}
        ctaHref={`${base}/services`}
        ctaNote={
          cheapest > 0
            ? dict.naqi.heroCtaNote.replace(
                "{price}",
                formatPrice(cheapest, currency) ?? ""
              )
            : undefined
        }
        secondaryLabel={dict.naqi.heroSecondary}
        secondaryHref={`${base}#how-it-works`}
        facts={[dict.hero.stat1, dict.hero.stat2, dict.hero.stat3]}
        media={
          <NaqiHeroMedia
            banners={banners}
            locale={locale}
            fallbackImage={heroImage}
            alt={dict.naqi.heroImageAlt}
            slideLabel={dict.naqi.slide}
          />
        }
        stats={heroStats}
      />

      {/* Services — Naqi §4 §01, on the panel's own catalogue. */}
      <NaqiServices
        index={dict.naqi.servicesIndex}
        label={dict.naqi.servicesLabel}
        title={dict.naqi.servicesTitle}
        intro={dict.naqi.servicesIntro}
        items={serviceCards}
        fromLabel={dict.naqi.from}
        viewLabel={dict.naqi.viewDetails}
      />
      {/* Website · slot 1 — whatever the office put there, and nothing at
          all when they put nothing. */}
      <NaqiBannerSlot
        banners={slotOne}
        locale={locale}
        slideLabel={dict.naqi.slide}
        alt={dict.naqi.heroImageAlt}
      />

      {/* The catalogue strip that stood here said the same thing as the
          services block three screens up, in smaller pictures. Two lists of the
          same four things is a page asking the reader to choose twice. */}

      {/* Provider advertisements — approved in the admin panel and already
          scoped to the customer's zone by the API, so a promotion only shows
          where its provider actually works. Marked sponsored on every card. */}
      {ads.length > 0 && (
        <section className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)] pt-[clamp(56px,7vw,96px)]">
          <SectionHeader title={dict.ads.title} subtitle={dict.ads.subtitle} />
          <AdvertisementRail
            ads={ads}
            locale={locale}
            sponsoredLabel={dict.ads.label}
            ctaLabel={dict.ads.cta}
            intervalSeconds={Number(config.campaign_slider_interval ?? 0)}
          />
        </section>
      )}

      {/* Popular services */}
      {popular.length > 0 && (
        <section className="bg-surface-soft py-16">
          <div className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)]">
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
                  durationMinutes={serviceFromDuration(service)}
                  minutesLabel={dict.browse.min}
                  featuredLabel={service.is_featured ? dict.browse.featured : undefined}
                  favouriteLabel={dict.browse.favourite}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Providers near you — ordered by real distance when the customer's
          location is known, by rating when it is not. Sits after the services
          because it answers "who would do this?", which is the question that
          follows "what can I book?". */}
      {providers.length > 0 && (
        <section className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)] pt-[clamp(56px,7vw,96px)]">
          <SectionHeader
            title={dict.providers.title}
            subtitle={dict.providers.subtitle}
          />
          <ProviderRail
            providers={providers}
            locale={locale}
            labels={{
              served: dict.providers.served,
              km: dict.providers.km,
              away: dict.providers.away,
            }}
          />
        </section>
      )}

      {/* Campaigns — the discount already applies at checkout; without this the
          customer only met a running promotion by opening one of its services. */}
      {/* The announced offers, between the hero and everything else: a
          limited-time offer that appears below the fold has already lost most
          of the urgency it was written with. */}
      <OffersSection
        featured={offers.featured}
        cards={offers.cards}
        serverTime={offers.server_time}
        locale={locale}
        dict={dict.offers}
      />

      {/* The vendor's campaign carousel used to sit here. Two "limited-time
          offers" sections on one page asked the reader to work out which one
          was the real offer — and the old one cannot show a code, a countdown
          or a Use-offer button, because a vendor campaign has none of those.
          Those campaigns still work: they discount silently, without needing
          to be advertised, which is the thing they are actually good at. */}

      {/* Why choose us — the owner's own words, from the admin panel. */}
      <HomeHighlights
        items={config.home_highlights ?? []}
        title={dict.sections.whyUs}
        subtitle={dict.sections.whyUsSub}
      />

      {/* How it works — Naqi §4 §03. */}
      <NaqiHow
        index={dict.naqi.howIndex}
        label={dict.naqi.howLabel}
        title={dict.naqi.howTitle}
        steps={steps}
      />

      {/* What customers wrote — real reviews only, so the section simply is
          not there until there are some. */}
      <Testimonials
        items={config.home_testimonials ?? []}
        title={dict.sections.testimonials}
        subtitle={dict.sections.testimonialsSub}
      />

      {/* Pricing — Naqi §4 §02, straight from the panel's variations. */}
      <NaqiPricing
        index={dict.naqi.pricingIndex}
        label={dict.naqi.pricingLabel}
        title={dict.naqi.pricingTitle}
        intro={dict.naqi.pricingIntro}
        hourlyTitle={dict.naqi.hourlyTitle}
        hourlyNote={dict.naqi.hourlyNote}
        hourlyRows={priceRows(hourlyService, false)}
        hourlyHref={hourlySlug ? `${base}/service/${hourlySlug}` : `${base}/services`}
        hourlyCta={dict.naqi.hourlyCta}
        packagesTitle={dict.naqi.packagesTitle}
        packageRows={priceRows(unitService, true)}
        packagesHref={unitSlug ? `${base}/service/${unitSlug}` : `${base}/services`}
      />

      {/* Website · slot 2 — after the prices, where a reader who has just
          worked out what it costs is the readiest to be offered something. */}
      <NaqiBannerSlot
        banners={slotTwo}
        locale={locale}
        slideLabel={dict.naqi.slide}
        alt={dict.naqi.heroImageAlt}
      />

      {/* Where we work — Naqi §4 §06, from the panel's service areas. */}
      <NaqiZones
        index={dict.naqi.zonesIndex}
        label={dict.naqi.zonesLabel}
        title={dict.naqi.zonesTitle}
        intro={dict.naqi.zonesIntro}
        zones={zones}
      />

      {/* Questions — Naqi §4, pooled from the services' own FAQs. */}
      <NaqiFaq
        index={dict.naqi.faqIndex}
        label={dict.naqi.faqLabel}
        title={dict.naqi.faqTitle}
        intro={dict.naqi.faqIntro}
        items={faqItems}
      />

      {/* Contact — every line from Business Settings. */}
      {/* Careers — the one block addressed to someone who is not buying
          anything. It sits after the questions and before the way to reach us,
          which is where a reader who has read this far would look for it. */}
      <NaqiCareers
        index={dict.naqi.careersIndex}
        label={dict.naqi.careersLabel}
        title={dict.naqi.careersTitle}
        intro={dict.naqi.careersIntro}
        benefits={[dict.naqi.careersB1, dict.naqi.careersB2, dict.naqi.careersB3]}
        dict={dict.naqi as unknown as Record<string, string>}
      />

      <NaqiContact
        title={dict.naqi.contactTitle}
        intro={dict.naqi.contactIntro}
        phone={config.business_phone}
        email={config.business_email}
        address={config.business_address}
        phoneLabel={dict.naqi.contactPhone}
        emailLabel={dict.naqi.contactEmail}
        addressLabel={dict.naqi.contactAddress}
      />

      {/* The closing call to action — Naqi's green band, in ink. */}
      <NaqiCta
        title={dict.cta.title}
        text={dict.cta.text}
        buttonLabel={dict.cta.button}
        href={`${base}/services`}
      />

    </>
  );
}
