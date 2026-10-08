import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor, absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getBookableProviders,
  getConfig,
  getHomeSections,
  getPackageAvailability,
  getServiceAddOns,
  getServiceDetail,
  getServicePackages,
  getServiceReviews,
  formatPrice,
  serviceFromPrice,
  serviceFromDuration,
} from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { sectionHref } from "@/lib/sections";
import { ReviewsSection } from "@/components/service/ReviewsSection";
import { ServiceHero, type ServiceFact } from "@/components/sections/ServiceHero";
import { OtherServices } from "@/components/sections/OtherServices";
import { ServiceInfo } from "@/components/sections/ServiceInfo";
import {
  BookingWizard,
  type WizardAddOn,
  type WizardVariant,
} from "@/components/booking/BookingWizard";

type Params = Promise<{ locale: string; slug: string }>;
/**
 * The booking's own parameters now arrive here.
 *
 * They used to belong to a separate `/book` page; the form is on this page, so
 * a link that pre-answers one of its questions — a package from the
 * subscription browser, a visit length from an offer, a promo code from a
 * campaign — has to land here instead.
 */
type Search = Promise<{
  package?: string;
  variant?: string;
  hours?: string;
  promo?: string;
}>;

function stripHtml(html?: string | null): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** The crew sizes the booking form offers. */
const MAX_PROFESSIONALS = 4;

function toNumber(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const service = await getServiceDetail(slug, loc);
  if (!service) return { title: "Not found" };
  const desc =
    service.short_description || stripHtml(service.description).slice(0, 160);
  const image = service.cover_image_full_path || service.thumbnail_full_path;
  return {
    title: service.name,
    description: desc,
    alternates: alternatesFor(loc, `/service/${slug}`),
    openGraph: {
      title: service.name,
      description: desc,
      type: "website",
      images: image ? [image] : undefined,
    },
  };
}

export default async function ServicePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale: raw, slug } = await params;
  const {
    package: presetPackage,
    variant: presetVariant,
    hours: offerHours,
  } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const service = await getServiceDetail(slug, locale);
  if (!service) notFound();

  // Everything the page needs, in one round: the facts in the hero, the
  // reviews at the foot, the catalogue the "other services" grid is drawn
  // from, and the five lists the booking form cannot open without.
  const [
    config,
    reviewData,
    sections,
    servicePackages,
    availability,
    bookableProviders,
    rawAddOns,
  ] = await Promise.all([
    getConfig(locale),
    getServiceReviews(service.id, locale),
    getHomeSections(locale),
    getServicePackages(service.sub_category_id ?? "", locale),
    getPackageAvailability(service.sub_category_id ?? null, locale),
    getBookableProviders(service.sub_category_id ?? "", locale),
    getServiceAddOns(service.id, locale),
  ]);

  const currency = currencyLabel(config, locale);
  const price = formatPrice(serviceFromPrice(service), currency);

  // A service whose variations are lengths is sold by the hour, and quoting
  // the cheapest *visit* beside a form that charges by the hour reads as the
  // price of the service. The lowest rate the price list actually contains is
  // the honest "starting at", and the suffix says what it is a price of.
  // A service sold by the unit or by the package keeps its own total.
  //
  // What makes a service hourly is the panel's own booking type, not the
  // shape of the variation names: a `single` service sells one visit of a
  // length the customer picks, while `unit`, `subscription` and `addons`
  // sell something else and keep their totals.
  const hourlyRates = (service.variations ?? [])
    .filter((v) => toNumber(v.price) > 0 && Number(v.duration_minutes) > 0)
    .map((v) => toNumber(v.price) / (Number(v.duration_minutes) / 60));
  const soldByHour =
    (service.booking_flow ?? "single") === "single" &&
    hourlyRates.length > 0 &&
    hourlyRates.length === (service.variations ?? []).filter((v) => toNumber(v.price) > 0).length;
  const heroPrice = soldByHour
    ? `${formatPrice(Math.min(...hourlyRates), currency)} ${dict.site.svcPerHour}`
    : price;
  const categoryName = service.category?.name;

  const avg = reviewData.rating.average_rating ?? 0;
  const totalReviews =
    reviewData.rating.review_count ?? reviewData.rating.rating_count ?? 0;

  // Questions belong to the service: that is the level at which the answers
  // actually differ.
  const faqs = service.faqs ?? [];

  /* ----------------------------------------------------------------------
     The hero's own figures.
     -------------------------------------------------------------------- */

  // Every bookable version of the service. The facts describe the whole price
  // list — what it can be booked for at the shortest and the longest — and
  // the cheapest one is kept only for what materials cost.
  const priced = (service.variations ?? []).filter((v) => toNumber(v.price) > 0);
  const cheapest = priced.length
    ? priced.reduce((a, b) => (toNumber(a.price) <= toNumber(b.price) ? a : b))
    : null;

  /**
   * The small boxes under the name.
   *
   * The panel decides what they say now, and the server resolves them — so a
   * length added to the price list widens "1–8 hours" by itself, the app shows
   * the same four, and a box the office wrote by hand arrives already written.
   * Nothing is computed here any more; a page that worked the figures out for
   * itself could only ever disagree with the phone.
   */
  const facts: ServiceFact[] = (service.page_facts_resolved ?? []).map((fact) => ({
    key: fact.label,
    value: fact.value,
  }));

  // Where this service sits in the panel's ordered catalogue, and what the
  // rest of that catalogue is.
  const position = sections.findIndex((s) => s.id === service.sub_category_id);
  const ownSection = position >= 0 ? sections[position] : undefined;

  // Three frames, each a different picture: the service's own cover, its
  // thumbnail and its third image, all three uploaded on the service in the
  // panel. The section's picture stands in only while that third box is
  // empty, so a page is never short a frame and never shows the same photo
  // twice — duplicates are dropped rather than drawn again.
  const images = Array.from(
    new Set(
      [
        service.cover_image_full_path,
        service.thumbnail_full_path,
        service.gallery_image_full_path,
        ownSection?.image_full_path,
        service.image_full_path,
      ].filter((src): src is string => Boolean(src))
    )
  ).slice(0, 3);
  const otherServices = sections
    .map((section, i) => ({ section, index: i + 1 }))
    .filter(({ section }) => section.id !== service.sub_category_id)
    .map(({ section, index }) => ({
      id: section.id,
      name: section.name,
      index,
      // The same helper the home page uses: a section with several services
      // opens its list, which lives under /subcategory, not /category.
      href: sectionHref(section, locale),
      priceLabel: null,
    }));

  /* ----------------------------------------------------------------------
     What the booking form needs — unchanged from the page it used to live
     on, so the prices, the discounts and the offers behave exactly as they
     did when the form was a step away.
     -------------------------------------------------------------------- */

  // Shortest first. The panel stores a variation whenever it is added, so a
  // length added later sits at the end of the list and the row of chips reads
  // 2, 3, 4 … 8, 1, 1.5 — which looks like a mistake and hides the new option
  // past the fold.
  const variants: WizardVariant[] = [...(service.variations ?? [])]
    .sort((a, b) => Number(a.duration_minutes ?? 0) - Number(b.duration_minutes ?? 0))
    .map((v) => ({
    key: v.variant_key || v.variant || "variant",
    price: toNumber(v.price),
    durationMinutes: v.duration_minutes ?? 60,
    label: v.variant ?? null,
    cleanersCount: v.cleaners_count ?? null,
    materialCharge: v.material_charge != null ? toNumber(v.material_charge) : null,
  }));
  if (variants.length === 0) {
    variants.push({
      key: "default",
      price: toNumber(service.starting_price ?? service.price ?? service.min_bidding_price),
      durationMinutes: 60,
    });
  }

  const addOns: WizardAddOn[] = rawAddOns.map((a) => ({
    id: a.id,
    name: a.name,
    price: toNumber(a.price),
    image: a.image_full_path,
    description: a.description ?? null,
    durationMinutes: a.duration_minutes ?? 0,
    rating: a.rating ?? 0,
    ratingCount: a.rating_count ?? 0,
  }));

  /* ----------------------------------------------------------------------
     What a visit involves — the panel's own four lists, the same ones the
     customer app reads, so the website and the phone cannot describe the
     service differently. An empty list draws nothing.
     -------------------------------------------------------------------- */

  // The monthly plan, offered on every service that is not itself the plan.
  // It is a real page in the panel's catalogue, so the banner disappears by
  // itself in an installation that does not sell subscriptions.
  const planSection = sections.find((s) => s.booking_flow === "subscription");
  const subscription =
    planSection && planSection.id !== service.sub_category_id
      ? {
          title: dict.site.svcSubTitle,
          note: dict.site.svcSubNote,
          cta: dict.site.svcSubCta,
          href: planSection.service_slug
            ? `${base}/service/${planSection.service_slug}`
            : `${base}/category/${planSection.slug}`,
        }
      : null;

  const credentials = (config.cleaner_credentials ?? [])
    .map((row) => row.label)
    .filter(Boolean);

  /**
   * Arabic counts things in four shapes, not two, so the length in the
   * schedule's heading is written rather than concatenated.
   */
  const hoursPhrase = (value: number): string => {
    if (locale !== "ar") return `${value} ${value === 1 ? "hour" : dict.site.hoursWord}`;
    if (value === 1) return dict.site.hourOne;
    if (value === 2) return dict.site.hourTwo;
    if (Number.isInteger(value) && value >= 3 && value <= 10) {
      return `${value} ${dict.site.hoursFew}`;
    }
    return `${value} ${dict.site.hoursMany}`;
  };

  // The schedule is stored as shares of a visit. Printed here against the
  // shortest visit this service sells, because that is the one the price above
  // quotes — and the line under the heading says it can be rearranged.
  const durations = (service.variations ?? [])
    .map((v) => Number(v.duration_minutes))
    .filter((m) => Number.isFinite(m) && m > 0);
  const sampleMinutes = durations.length ? Math.min(...durations) : 0;
  const scheduleRows = sampleMinutes
    ? (config.cleaning_schedule_tasks ?? [])
        .filter((row) => row.label)
        .map((row) => ({
          label: row.label,
          minutes: Math.round((Number(row.share ?? 0) / 100) * sampleMinutes),
        }))
        .filter((row) => row.minutes > 0)
        .map((row) => ({ label: row.label, value: `${row.minutes} ${dict.site.svcMinutes}` }))
    : [];

  const materialItems = (config.cleaning_materials ?? [])
    .filter((row) => row.label)
    .map((row) => ({ label: row.label, image: row.image_full_path ?? null }));

  const needItems = (config.customer_provides ?? []).map((row) => row.label).filter(Boolean);

  // The picture beside the cleaners. The panel's own, where the office has
  // uploaded one — it is a photograph of the team and belongs with the lines
  // it illustrates, not to any one service. Failing that, one of this
  // service's pictures, so the card is never a bare list.
  const trustImage = config.cleaner_credentials_image || images[2] || images[1] || null;

  const description = service.short_description || stripHtml(service.description).slice(0, 300);
  const rawPrice = serviceFromPrice(service);
  const serviceUrl = absoluteUrl(`/${locale}/service/${slug}`);
  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      ...(description ? { description } : {}),
      ...(images[0] ? { image: images[0] } : {}),
      ...(categoryName ? { serviceType: categoryName } : {}),
      provider: { "@type": "Organization", name: config.business_name || dict.brand },
      ...(rawPrice > 0
        ? {
            offers: {
              "@type": "Offer",
              price: rawPrice,
              priceCurrency: config.currency_code || "AED",
              availability: "https://schema.org/InStock",
              url: serviceUrl,
            },
          }
        : {}),
      ...(totalReviews > 0 && avg > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: Number(avg).toFixed(1),
              reviewCount: totalReviews,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.nav.home, item: absoluteUrl(`/${locale}`) },
        { "@type": "ListItem", position: 2, name: dict.nav.services, item: absoluteUrl(`/${locale}/services`) },
        { "@type": "ListItem", position: 3, name: service.name, item: serviceUrl },
      ],
    },
    ...(faqs.filter((f) => f.question && f.answer).length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs
              .filter((f) => f.question && f.answer)
              .map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
          },
        ]
      : []),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <ServiceHero
        crumbs={[
          { label: dict.nav.home, href: base },
          { label: dict.nav.services, href: `${base}/services` },
          { label: service.name },
        ]}
        index={position >= 0 ? position + 1 : null}
        total={sections.length}
        label={dict.site.servicesLabel}
        title={service.name}
        tagline={service.short_description || stripHtml(service.description).slice(0, 200)}
        fromLabel={dict.site.svcStartsAt}
        price={rawPrice > 0 ? heroPrice : null}
        facts={facts}
        bookLabel={dict.site.svcBook}
        askLabel={dict.site.svcAsk}
        askHref={`${base}#contact`}
        images={images}
      />

      {/* The booking itself — the page the customer used to be sent to, now
          the middle of the page they are already on. Everything it is given
          is what the separate page gave it, so nothing about the pricing or
          the discounts changes with the move. */}
      <section id="book" className="scroll-mt-[90px] pb-[clamp(24px,3vw,40px)]">
        <div className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)]">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-green">
              {dict.site.svcBookEyebrow}
            </span>
            <h2 className="text-[clamp(24px,2.4vw,32px)] font-semibold text-ink">
              {dict.site.svcBookTitle}
            </h2>
          </div>
        </div>

        <BookingWizard
          locale={locale}
          dict={dict.booking as unknown as Record<string, string>}
          currency={currency}
          currencyCode={String(config.currency_code ?? "AED")}
          vatPercent={toNumber(config.vat_percentage)}
          serviceFee={toNumber(config.additional_charge_fee_amount)}
          materialCharge={toNumber(config.material_charge)}
          professionalTiers={config.professional_discount_tiers ?? []}
          serviceDiscount={service.service_discount ?? []}
          campaignDiscount={service.campaign_discount ?? []}
          categoryDiscount={service.category?.category_discount ?? []}
          categoryCampaignDiscount={service.category?.campaign_discount ?? []}
          serviceId={service.id}
          categoryId={service.category_id ?? ""}
          subCategoryId={service.sub_category_id ?? ""}
          serviceName={service.name}
          serviceSlug={slug}
          variants={variants}
          presetPackageId={presetPackage ?? null}
          presetVariantKey={presetVariant ?? null}
          offerHours={toNumber(offerHours)}
          addOns={addOns}
          workStart={service.service_availability?.time_schedule?.start_time ?? null}
          workEnd={service.service_availability?.time_schedule?.end_time ?? null}
          repeatDiscountTiers={
            (config as unknown as { repeat_discount_tiers?: { min_services: number; discount_percent: number }[] })
              .repeat_discount_tiers ?? []
          }
          planDayTiers={
            (config as unknown as { plan_days_discount_tiers?: { days: number; discount_percent: number }[] })
              .plan_days_discount_tiers ?? []
          }
          planMonthTiers={
            (config as unknown as { plan_month_bonus_tiers?: { months: number; bonus_percent: number }[] })
              .plan_month_bonus_tiers ?? []
          }
          servicePackages={servicePackages}
          selectableWeekdays={availability.selectable_weekdays}
          providerOffDays={availability.off_days_iso}
          maxDaysPerWeek={availability.max_days_per_week}
          providerId={service.service_availability?.provider_id ?? null}
          bookableProviders={bookableProviders}
          bookingFlow={service.booking_flow ?? null}
          subscriptionMonths={service.subscription_months ?? [1]}
          durationDayBands={config.plan_duration_day_bands ?? []}
          addonsMinMinutes={service.addons_min_minutes ?? 60}
        />
      </section>

      {/* What the service actually is, read after the form rather than before
          it: the customer who came from a card already knows what they want,
          and the one who does not scrolls past the form to find out. */}
      <section className="pb-[clamp(40px,5vw,64px)]">
        <div className="mx-auto flex w-full max-w-page flex-col gap-[18px] px-[clamp(20px,4vw,48px)]">
          {service.description && stripHtml(service.description) && (
            <div className="rounded-[22px] border border-line bg-surface p-[22px]">
              <h2 className="mb-4 text-[clamp(19px,1.8vw,24px)] font-semibold text-ink">
                {dict.site.svcAbout}
              </h2>
              <div
                className="space-y-3 text-[14px] leading-[1.8] text-ink-62 [&_a]:text-green [&_li]:ms-5 [&_li]:list-disc"
                dangerouslySetInnerHTML={{ __html: service.description }}
              />
            </div>
          )}

          <ServiceInfo
            subscription={subscription}
            trust={
              credentials.length
                ? { title: dict.site.svcTrustTitle, points: credentials, image: trustImage }
                : null
            }
            schedule={
              scheduleRows.length
                ? {
                    title: dict.site.svcScheduleTitle.replace(
                      "{hours}",
                      hoursPhrase(Math.round((sampleMinutes / 60) * 10) / 10)
                    ),
                    note: dict.site.svcScheduleNote,
                    rows: scheduleRows,
                  }
                : null
            }
            materials={
              materialItems.length
                ? {
                    title: dict.site.svcMaterialsTitle,
                    note: dict.site.svcMaterialsNote,
                    items: materialItems,
                  }
                : null
            }
            needs={needItems.length ? { title: dict.site.svcNeedsTitle, items: needItems } : null}
          />

          {faqs.length > 0 && (
            <div className="rounded-[22px] border border-line bg-surface p-[22px]">
              <h2 className="mb-2 text-[clamp(19px,1.8vw,24px)] font-semibold text-ink">
                {dict.service.faq}
              </h2>
              <div className="divide-y divide-line">
                {faqs.map((faq, i) => (
                  <details key={faq.id ?? i} className="group py-[15px]">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-medium text-ink marker:content-none">
                      {faq.question}
                      <span aria-hidden className="text-green transition group-open:rotate-180">
                        ⌄
                      </span>
                    </summary>
                    {faq.answer && (
                      <p className="mt-2 text-[14px] leading-[1.7] text-ink-62">{faq.answer}</p>
                    )}
                  </details>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[22px] border border-line bg-surface p-[22px]">
            <ReviewsSection
              locale={locale}
              dict={dict.service as unknown as Record<string, string>}
              rating={reviewData.rating}
              reviews={reviewData.reviews}
            />
          </div>
        </div>
      </section>

      <OtherServices
        title={dict.site.svcOtherTitle}
        items={otherServices}
        fromLabel={dict.site.from}
      />
    </>
  );
}
