import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProviderDetails } from "@/lib/api";

type Params = Promise<{ locale: string; id: string }>;

const WEEKDAY_ORDER = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const details = await getProviderDetails(id, loc);
  return {
    title: details?.provider.company_name ?? "Provider",
    // A provider profile is thin, near-duplicate content across many pages;
    // indexing it competes with the service pages that actually sell.
    robots: { index: false, follow: true },
  };
}

export default async function ProviderPage({ params }: { params: Params }) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.provider as unknown as Record<string, string>;

  const details = await getProviderDetails(id, locale);
  if (!details) notFound();

  const { provider, reviews = [], sub_categories: subCategories = [] } = details;
  const rating = Number(details.rating?.average_rating ?? provider.avg_rating ?? 0);
  const served = Number(provider.total_service_served ?? 0);

  // Off days are stored as lowercase weekday names; show the working week.
  const offDays = (provider.weekends ?? []).map((d) => String(d).toLowerCase());
  const workingDays = WEEKDAY_ORDER.filter((d) => !offDays.includes(d));
  const dayName = (key: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      // 2024-06-01 is a Saturday; step forward to the wanted weekday.
      new Date(2024, 5, 1 + WEEKDAY_ORDER.indexOf(key))
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/${locale}`} className="hover:text-primary">
          {dict.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{provider.company_name}</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-border bg-surface">
        {provider.cover_image_full_path && (
          <img src={provider.cover_image_full_path} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="flex flex-wrap items-center gap-4 p-5">
          {provider.logo_full_path && (
            <img
              src={provider.logo_full_path}
              alt=""
              className="h-16 w-16 rounded-xl border border-border object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-ink">{provider.company_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {rating > 0 && (
                <span className="text-ink">
                  ★ {rating.toFixed(2)}
                  {details.rating?.rating_count ? ` (${details.rating.rating_count})` : ""}
                </span>
              )}
              {served > 0 && (
                <span>
                  {served} {t.servicesServed}
                </span>
              )}
            </div>
          </div>
          {provider.service_availability === 0 && (
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-muted">
              {t.unavailable}
            </span>
          )}
        </div>
      </header>

      {(workingDays.length > 0 || provider.time_schedule?.start_time) && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold text-ink">{t.availability}</h2>
          {provider.time_schedule?.start_time && (
            <p className="text-sm text-muted">
              {t.hours}{" "}
              <span dir="ltr" className="text-ink">
                {provider.time_schedule.start_time} – {provider.time_schedule.end_time}
              </span>
            </p>
          )}
          {workingDays.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {WEEKDAY_ORDER.map((d) => {
                const off = offDays.includes(d);
                return (
                  <span
                    key={d}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      off
                        ? "border-border bg-surface-soft text-muted/60 line-through"
                        : "border-primary bg-primary-light text-primary-dark"
                    }`}
                  >
                    {dayName(d)}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}

      {subCategories.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold text-ink">{t.services}</h2>
          <div className="flex flex-wrap gap-2">
            {subCategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/${locale}/subcategory/${sub.slug}`}
                className="rounded-full border border-border px-3 py-1 text-sm text-muted transition hover:border-primary hover:text-primary"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 font-semibold text-ink">{t.reviews}</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">{t.noReviews}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((review, i) => (
              <li
                key={review.id ?? i}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">
                    {[review.customer?.first_name, review.customer?.last_name]
                      .filter(Boolean)
                      .join(" ") || t.aCustomer}
                  </span>
                  {review.review_rating != null && (
                    <span className="text-sm text-accent-dark">★ {review.review_rating}</span>
                  )}
                </div>
                {review.review_comment && (
                  <p className="mt-1 text-sm text-muted">{review.review_comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
