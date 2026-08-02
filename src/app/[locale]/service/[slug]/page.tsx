import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor, absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getConfig,
  getServiceDetail,
  getServiceReviews,
  formatPrice,
  serviceFromPrice,
} from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { Thumb } from "@/components/Thumb";
import { ReviewsSection } from "@/components/service/ReviewsSection";

type Params = Promise<{ locale: string; slug: string }>;

function stripHtml(html?: string | null): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

export default async function ServicePage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const service = await getServiceDetail(slug, locale);
  if (!service) notFound();

  const [config, reviewData] = await Promise.all([
    getConfig(locale),
    getServiceReviews(service.id, locale),
  ]);

  const currency = currencyLabel(config, locale);
  const price = formatPrice(serviceFromPrice(service), currency);
  const categoryName = service.category?.name;
  const coverImage = service.cover_image_full_path;

  const avg = reviewData.rating.average_rating ?? 0;
  const totalReviews =
    reviewData.rating.review_count ?? reviewData.rating.rating_count ?? 0;

  // Category-level FAQs take priority; fall back to any service-level FAQs
  // Questions belong to the service: that is the level at which the answers
  // actually differ. Category FAQs are gone — they used to hide these entirely
  // whenever a category had even one question of its own.
  const faqs = service.faqs ?? [];

  const description = service.short_description || stripHtml(service.description).slice(0, 300);
  const rawPrice = serviceFromPrice(service);
  const serviceUrl = absoluteUrl(`/${locale}/service/${slug}`);
  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      ...(description ? { description } : {}),
      ...(coverImage ? { image: coverImage } : {}),
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={jsonLd} />
      <nav className="mb-6 text-sm text-muted">
        <Link href={`/${locale}`} className="hover:text-primary">
          {dict.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${locale}/services`} className="hover:text-primary">
          {dict.nav.services}
        </Link>
        {categoryName && (
          <>
            <span className="mx-2">/</span>
            <span className="text-ink">{categoryName}</span>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content — ordered: name → short → long → gallery → FAQ → reviews */}
        <div className="lg:col-span-2">
          {/* 1. Name + rating */}
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            {service.name}
          </h1>
          {totalReviews > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 font-semibold text-primary-dark">
                <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17l-6.9 3.6 1.6-6.9L1.4 9.1l7-.6L12 2z" />
                </svg>
                {avg.toFixed(1)}
              </span>
              <span>
                {totalReviews} {dict.service.reviews}
              </span>
            </div>
          )}

          {/* 2. Cover image (hero) */}
          {coverImage && (
            <div className="mt-5 aspect-[16/9] overflow-hidden rounded-3xl">
              <Thumb src={coverImage} alt={service.name} rounded="rounded-3xl" />
            </div>
          )}

          {/* 3. Short description */}
          {service.short_description && (
            <p className="mt-6 text-lg leading-relaxed text-ink/80">
              {service.short_description}
            </p>
          )}

          {/* 4. Long description */}
          {service.description && stripHtml(service.description) && (
            <div className="mt-8">
              <h2 className="mb-4 text-2xl font-bold text-ink">
                {dict.service.about}
              </h2>
              <div
                className="space-y-3 leading-relaxed text-muted [&_a]:text-primary [&_li]:ms-5 [&_li]:list-disc"
                dangerouslySetInnerHTML={{ __html: service.description }}
              />
            </div>
          )}

          {/* 5. FAQ */}
          {faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-4 text-2xl font-bold text-ink">{dict.service.faq}</h2>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {faqs.map((faq, i) => (
                  <details key={faq.id ?? i} className="group p-4">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink marker:content-none">
                      {faq.question}
                      <span className="text-primary transition group-open:rotate-45">+</span>
                    </summary>
                    {faq.answer && <p className="mt-2 text-muted">{faq.answer}</p>}
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* 6. Ratings & reviews */}
          <ReviewsSection
            locale={locale}
            dict={dict.service as unknown as Record<string, string>}
            rating={reviewData.rating}
            reviews={reviewData.reviews}
          />
        </div>

        {/* Sticky booking card */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            {price && (
              <div className="mb-4">
                <span className="text-sm text-muted">{dict.service.from}</span>
                <div className="text-3xl font-bold text-primary">{price}</div>
              </div>
            )}
            <Link
              href={`/${locale}/service/${slug}/book`}
              className="block rounded-full bg-accent px-6 py-3 text-center font-semibold text-white transition hover:bg-accent-dark"
            >
              {dict.service.book}
            </Link>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              {[dict.service.trustVetted, dict.service.trustCancellation].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
