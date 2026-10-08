import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getOffers,
  getAdvertisements,
  getBanners,
  getHomeSections,
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
import { ServiceCard } from "@/components/ServiceCard";
import { HomeHero } from "@/components/sections/HomeHero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { AreasSection } from "@/components/sections/AreasSection";
import { PricingSection, type PriceRow } from "@/components/sections/PricingSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { HomeHeroMedia } from "@/components/sections/HomeHeroMedia";
import { BannerSlot } from "@/components/sections/BannerSlot";
import { ContactSection } from "@/components/sections/ContactSection";
import { BusinessSection } from "@/components/sections/BusinessSection";
import { CareersSection } from "@/components/sections/CareersSection";
import { SectionHeader } from "@/components/SectionHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { currencyLabel } from "@/lib/currency";
import { sectionHref } from "@/lib/sections";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const [sections, popular, config, banners, slotOne, slotTwo, ads, offers, zones, stats] =
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


  // The three steps, the office's where they wrote them.
  const steps = config.home_texts?.steps?.length
    ? config.home_texts.steps
    : [
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

  // The business block is the office's to write, picture included. When they
  // have not uploaded one, a catalogue picture stands in — never the hero's,
  // because the same photograph twice on one page reads as a site with one
  // photograph.
  const business = config.business_section
    ? {
        ...config.business_section,
        image:
          config.business_section.image ??
          sections
            .map((section) => section.image_full_path)
            .filter(Boolean)
            .find((image) => image !== heroImage) ??
          null,
      }
    : null;

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
      // One helper decides where a section leads, everywhere. Written out by
      // hand here, it pointed a section with no single service at
      // /category/<sub-category slug> — a path that answers 404, because that
      // slug belongs to a sub-category and the route expects a main one.
      href: sectionHref(section, locale),
      priceLabel: from > 0 ? formatPrice(from, currency) : null,
      // What this section's own service has earned. The section carries no
      // rating of its own — the service behind it does, and that is the thing
      // the card leads to.
      rating: match?.avg_rating ?? null,
      ratingCount: match?.rating_count ?? null,
      bookings: match?.bookings_count ?? null,
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
      return `${value} ${value === 1 ? dict.site.hourWord : dict.site.hoursWord}`;
    }

    if (value === 1) return dict.site.hourOne;
    if (value === 2) return dict.site.hourTwo;
    if (Number.isInteger(value) && value >= 3 && value <= 10) {
      return `${value} ${dict.site.hoursFew}`;
    }

    return `${value} ${dict.site.hoursMany}`;
  };

  const cleanersPhrase = (value: number): string => {
    if (locale !== "ar") {
      return `${value} ${value === 1 ? dict.site.cleanerWord : dict.site.cleanersWord}`;
    }

    if (value === 1) return dict.site.cleanerOne;
    if (value === 2) return dict.site.cleanerTwo;
    if (value >= 3 && value <= 10) return `${value} ${dict.site.cleanersFew}`;

    return `${value} ${dict.site.cleanersMany}`;
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
  // All three, always. The row is part of the page's shape, and a column that
  // appears and disappears with the week's takings makes the headline above it
  // jump about. A figure with nothing behind it yet prints as a dash — an
  // honest "not yet" rather than a zero dressed up as an achievement.
  const figure = (value: number | null | undefined, plus = false) => {
    if (value == null) return "—";

    const printed = value.toLocaleString(locale === "ar" ? "ar-AE" : "en-AE");

    return plus && value > 0 ? `+${printed}` : printed;
  };

  const heroStats = [
    { value: figure(stats.customer_rating), label: dict.site.statRating },
    { value: figure(stats.completed_bookings, true), label: dict.site.statBookings },
    { value: figure(stats.served_areas), label: dict.site.statAreas },
  ];

  // The opening block's words. The panel's when the office has written them,
  // and the built-in wording when they have not — a home page with no headline
  // is not a state anybody should be able to reach from a settings screen.
  //
  // A link is stored without the language and gains it here, so the same row
  // serves both sites.
  const heroWritten = config.hero_section ?? null;
  const withLocale = (href?: string | null, fallback = "") =>
    href ? (href.startsWith("#") ? `${base}${href}` : `${base}${href}`) : fallback;

  const hero = {
    eyebrow: heroWritten?.eyebrow || dict.site.heroEyebrow,
    headlines:
      heroWritten?.headlines?.length
        ? heroWritten.headlines
        : [{ top: dict.site.heroTitleTop, bottom: dict.site.heroTitleBottom }],
    rotate: heroWritten?.rotate ?? true,
    rotateSeconds: heroWritten?.rotate_seconds ?? 6,
    subtitle: heroWritten?.subtitle || dict.site.heroSubtitle,
    ctaLabel: heroWritten?.cta_label || dict.site.heroCta,
    ctaHref: withLocale(heroWritten?.cta_href, `${base}/services`),
    secondaryLabel: heroWritten?.secondary_label || dict.site.heroSecondary,
    secondaryHref: withLocale(heroWritten?.secondary_href, `${base}#how-it-works`),
    facts: heroWritten?.facts?.length
      ? heroWritten.facts
      : [dict.hero.stat1, dict.hero.stat2, dict.hero.stat3],
  };

  // The headings the office has written, with the page's own wording standing
  // in wherever they have not. A cleared box is not a published blank.
  const written = config.home_texts ?? null;
  type Said = { title?: string; intro?: string } | undefined;
  const say = (
    section: keyof NonNullable<typeof written>,
    field: "title" | "intro",
    fallback: string
  ) => ((written?.[section] as Said)?.[field] || fallback);

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
      {/* Hero — handoff §4.
          The starting price is the cheapest option the panel actually sells,
          read from the services themselves. A price typed into a page is a
          price that goes stale the first time the office changes one. */}
      <HomeHero
        eyebrow={hero.eyebrow}
        headlines={hero.headlines}
        rotate={hero.rotate}
        rotateSeconds={hero.rotateSeconds}
        subtitle={hero.subtitle}
        ctaLabel={hero.ctaLabel}
        ctaHref={hero.ctaHref}
        ctaNote={
          cheapest > 0
            ? dict.site.heroCtaNote.replace(
                "{price}",
                formatPrice(cheapest, currency) ?? ""
              )
            : undefined
        }
        secondaryLabel={hero.secondaryLabel}
        secondaryHref={hero.secondaryHref}
        facts={hero.facts}
        media={
          <HomeHeroMedia
            banners={banners}
            locale={locale}
            fallbackImage={heroImage}
            alt={dict.site.heroImageAlt}
            slideLabel={dict.site.slide}
          />
        }
        stats={heroStats}
      />

      {/* Services — handoff §4 §01, on the panel's own catalogue. */}
      <ServicesGrid
        index={dict.site.servicesIndex}
        label={dict.site.servicesLabel}
        title={say("services", "title", dict.site.servicesTitle)}
        intro={say("services", "intro", dict.site.servicesIntro)}
        items={serviceCards}
        fromLabel={dict.site.from}
        viewLabel={dict.site.viewDetails}
        locale={locale}
        statsDict={dict.browse as unknown as Record<string, string>}
      />
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
                  statsDict={dict.browse as unknown as Record<string, string>}
                />
              ))}
            </div>
          </div>
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

      {/* Pricing — handoff §4 §02, straight from the panel's variations. */}
      <PricingSection
        index={dict.site.pricingIndex}
        label={dict.site.pricingLabel}
        title={say("pricing", "title", dict.site.pricingTitle)}
        intro={say("pricing", "intro", dict.site.pricingIntro)}
        hourlyTitle={dict.site.hourlyTitle}
        hourlyNote={dict.site.hourlyNote}
        hourlyRows={priceRows(hourlyService, false)}
        hourlyHref={hourlySlug ? `${base}/service/${hourlySlug}` : `${base}/services`}
        hourlyCta={dict.site.hourlyCta}
        packagesTitle={dict.site.packagesTitle}
        packageRows={priceRows(unitService, true)}
        packagesHref={unitSlug ? `${base}/service/${unitSlug}` : `${base}/services`}
      />

      {/* Website · slot 1 — whatever the office put there, and nothing at
          all when they put nothing. */}
      <BannerSlot
        banners={slotOne}
        locale={locale}
        slideLabel={dict.site.slide}
        alt={dict.site.heroImageAlt}
      />

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

      {/* How it works — handoff §4 §03. */}
      <HowItWorks
        index={dict.site.howIndex}
        label={dict.site.howLabel}
        title={say("how", "title", dict.site.howTitle)}
        steps={steps}
      />

      {/* Business — the one block written for somebody buying for a
          building rather than a home, which is why it is the only dark
          section on the page. */}
      {business && (
        <BusinessSection
          index={dict.site.businessIndex}
          label={dict.site.businessLabel}
          title={business.title}
          intro={business.intro}
          chips={business.sectors}
          points={business.points}
          image={business.image}
          ctaTitle={business.cta_title}
          ctaNote={business.cta_note}
          quoteLabel={dict.site.businessQuote}
          quoteHref={`${base}#contact`}
          phone={business.phone || config.business_phone}
        />
      )}

      {/* Where we work — handoff §4 §06, from the panel's service areas. */}
      <AreasSection
        index={dict.site.zonesIndex}
        label={dict.site.zonesLabel}
        title={say("zones", "title", dict.site.zonesTitle)}
        intro={say("zones", "intro", dict.site.zonesIntro)}
        zones={zones}
      />

      {/* Website · slot 2 — after the prices, where a reader who has just
          worked out what it costs is the readiest to be offered something. */}
      <BannerSlot
        banners={slotTwo}
        locale={locale}
        slideLabel={dict.site.slide}
        alt={dict.site.heroImageAlt}
      />

      {/* Why choose us — the owner's own words, from the admin panel. */}
      <HomeHighlights
        items={config.home_highlights ?? []}
        title={dict.sections.whyUs}
        subtitle={dict.sections.whyUsSub}
      />

      {/* What customers wrote — real reviews only, so the section simply is
          not there until there are some. */}
      <Testimonials
        items={config.home_testimonials ?? []}
        index={dict.site.reviewsIndex}
        label={dict.site.reviewsLabel}
        title={say("reviews", "title", dict.sections.testimonials)}
        subtitle={say("reviews", "intro", dict.sections.testimonialsSub)}
      />

      {/* Careers — the one block addressed to someone who is not buying
          anything at all. */}
      <CareersSection
        index={dict.site.careersIndex}
        label={dict.site.careersLabel}
        title={say("careers", "title", dict.site.careersTitle)}
        intro={say("careers", "intro", dict.site.careersIntro)}
        benefits={
          written?.careers_benefits?.length
            ? written.careers_benefits.map((row) => row.title)
            : [dict.site.careersB1, dict.site.careersB2, dict.site.careersB3]
        }
        dict={dict.site as unknown as Record<string, string>}
      />

      {/* Questions — handoff §4, pooled from the services' own FAQs. */}
      <FaqSection
        index={dict.site.faqIndex}
        label={dict.site.faqLabel}
        title={say("faq", "title", dict.site.faqTitle)}
        intro={say("faq", "intro", dict.site.faqIntro)}
        items={faqItems}
      />

      {/* Contact — every line from Business Settings. */}
      <ContactSection
        title={say("contact", "title", dict.site.contactTitle)}
        intro={say("contact", "intro", dict.site.contactIntro)}
        phone={config.business_phone}
        email={config.business_email}
        address={config.business_address}
        phoneLabel={dict.site.contactPhone}
        emailLabel={dict.site.contactEmail}
        addressLabel={dict.site.contactAddress}
      />

      {/* The catalogue strip that stood here said the same thing as the
          services block three screens up, in smaller pictures. Two lists of the
          same four things is a page asking the reader to choose twice. */}

      {/* The vendor's campaign carousel used to sit here. Two "limited-time
          offers" sections on one page asked the reader to work out which one
          was the real offer — and the old one cannot show a code, a countdown
          or a Use-offer button, because a vendor campaign has none of those.
          Those campaigns still work: they discount silently, without needing
          to be advertised, which is the thing they are actually good at. */}

      {/* The closing call to action — the handoff's green band, in ink. */}
      <ClosingCta
        title={say("cta", "title", dict.cta.title)}
        text={say("cta", "intro", dict.cta.text)}
        buttonLabel={written?.cta?.button || dict.cta.button}
        href={`${base}/services`}
      />

    </>
  );
}
