"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import { ServiceCard } from "@/components/ServiceCard";
import type { Service } from "@/lib/types";

type Dict = Record<string, string>;

export interface BrowseVariant {
  minutes: number;
  price: number;
}
export interface BrowseService {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  shortDescription?: string | null;
  isFeatured?: boolean;
  variants: BrowseVariant[];
  minPrice: number;
  avgRating?: number;
  ratingCount?: number;
}

export function SubcategoryBrowser({
  locale,
  dict,
  currency,
  services,
  fromLabel,
}: {
  locale: Locale;
  dict: Dict;
  currency: string;
  services: BrowseService[];
  fromLabel: string;
}) {
  const durations = useMemo(() => {
    const set = new Set<number>();
    services.forEach((s) => s.variants.forEach((v) => set.add(v.minutes)));
    return Array.from(set).sort((a, b) => a - b);
  }, [services]);

  const [selected, setSelected] = useState<number | null>(
    durations.length > 0 ? durations[0] : null
  );

  function label(minutes: number) {
    if (minutes % 60 === 0) {
      const h = minutes / 60;
      return { big: String(h), unit: h === 1 ? dict.hour : dict.hours };
    }
    return { big: String(minutes), unit: dict.min };
  }

  const filtered =
    selected === null
      ? services
      : services.filter((s) => s.variants.some((v) => v.minutes === selected));

  function priceFor(s: BrowseService): number {
    if (selected === null) return s.minPrice;
    const v = s.variants.find((x) => x.minutes === selected);
    return v ? v.price : s.minPrice;
  }

  const money = (n: number) =>
    `${currency} ${n.toLocaleString(locale === "ar" ? "ar" : "en")}`;

  return (
    <div>
      {/* Duration tiles */}
      {durations.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-ink">{dict.selectDuration}</h2>
          <p className="mt-1 text-muted">{dict.chooseDuration}</p>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {durations.map((minutes) => {
              const l = label(minutes);
              const active = minutes === selected;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setSelected(minutes)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition ${
                    active
                      ? "border-primary bg-primary-light"
                      : "border-border bg-surface hover:border-primary"
                  }`}
                >
                  <span
                    className={`text-2xl font-bold ${
                      active ? "text-primary-dark" : "text-ink"
                    }`}
                  >
                    {l.big}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    {l.unit}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Services for the selected duration */}
      <div className="mt-10">
        <h3 className="mb-5 text-xl font-bold text-ink">{dict.services}</h3>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((s) => {
              const service: Service = {
                id: s.id,
                name: s.name,
                slug: s.slug,
                image_full_path: s.image,
                short_description: s.shortDescription ?? undefined,
                avg_rating: s.avgRating,
                rating_count: s.ratingCount,
              };
              // The duration shown is the one being filtered on, and the price
              // is that duration's price — so the card describes a booking the
              // customer can actually make.
              const minutes =
                selected ??
                (s.variants.length
                  ? s.variants.reduce((a, b) => (a.price <= b.price ? a : b)).minutes
                  : null);
              return (
                <ServiceCard
                  key={s.id}
                  service={service}
                  href={`/${locale}/service/${s.slug}`}
                  fromLabel={fromLabel}
                  priceLabel={money(priceFor(s))}
                  durationMinutes={minutes}
                  minutesLabel={dict.min}
                  featuredLabel={s.isFeatured ? dict.featured : undefined}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-surface-soft p-8 text-center text-muted">
            {dict.noServices}
          </p>
        )}
      </div>
    </div>
  );
}
