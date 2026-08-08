"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { ServicePackage } from "@/lib/api";

type Dict = Record<string, string>;

export interface SubscriptionDuration {
  variantKey: string;
  minutes: number;
  price: number;
}

interface Quote {
  valid: boolean;
  total_visits?: number;
  visits_per_month?: number;
  discount_percent?: number;
  net_visit_price?: number;
  undiscounted_visit_price?: number;
  grand_total?: number;
  you_save?: number;
  reason?: string;
}

/**
 * Two questions, in the order a customer actually answers them: how long should
 * each visit be, and how often should we come.
 *
 * The alternative — a grid of "2 hours once a week", "2 hours twice a week",
 * "3 hours once a week" and so on — is the same information as thirty-six cards
 * nobody can compare. Splitting it means six choices, then six more.
 *
 * Every price on the second screen comes from the packages endpoint, one request
 * per frequency. Nothing is worked out here: these figures are what the customer
 * will be charged, and a second implementation in the browser is how the two
 * drift apart.
 */
export function SubscriptionBrowser({
  locale,
  dict,
  currency,
  serviceId,
  serviceSlug,
  durations,
  packages,
  workingWeeks = [],
}: {
  locale: Locale;
  dict: Dict;
  currency: string;
  serviceId: string;
  serviceSlug: string;
  durations: SubscriptionDuration[];
  packages: ServicePackage[];
  /** ISO weekdays each provider actually works, longest week first. */
  workingWeeks?: number[][];
}) {
  const router = useRouter();
  const [variantKey, setVariantKey] = useState<string | null>(
    durations.length > 0 ? durations[0].variantKey : null
  );
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);

  const ordered = useMemo(
    () => [...packages].sort((a, b) => a.min_days_per_week - b.min_days_per_week),
    [packages]
  );

  const money = (n: number) =>
    `${currency} ${n.toLocaleString(locale === "ar" ? "ar" : "en", {
      maximumFractionDigits: 2,
    })}`;

  const hours = (minutes: number) => {
    const h = minutes / 60;
    return Number.isInteger(h) ? String(h) : (minutes / 60).toFixed(1);
  };

  useEffect(() => {
    if (!variantKey || ordered.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setQuotes({});

    // Start on the next free day rather than today: a subscription beginning in
    // an hour is not what anyone means by "twice a week".
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
      start.getDate()
    ).padStart(2, "0")}`;

    // Weekdays are spread across the week so a three-a-week package is Sun/Tue/
    // Thu rather than three consecutive days. The booking page lets the customer
    // change them; this only needs a schedule real enough to price.
    const spread = (count: number) => {
      // Days are drawn from a week some provider actually works. Six visits a
      // week is the whole working week — one day off is all it takes — so
      // picking from all seven guarantees the server drops one and refuses a
      // frequency the customer was shown as available.
      const week =
        workingWeeks.find((w) => w.length >= count) ?? [7, 1, 2, 3, 4, 5, 6];

      const step = Math.floor(week.length / count) || 1;
      const picked: number[] = [];
      for (let i = 0; picked.length < count && i < week.length; i += step) {
        picked.push(week[i]);
      }
      for (const day of week) {
        if (picked.length >= count) break;
        if (!picked.includes(day)) picked.push(day);
      }
      return picked;
    };

    // One at a time, not six at once.
    //
    // Every tier used to be priced in parallel, so opening this page fired six
    // concurrent requests at a shared host that allows only a handful. The
    // first few answered and the rest queued until the proxy gave up with a
    // 502 — and because the section only renders priced tiers, a single
    // timeout emptied the whole thing. The customer saw a subscription page
    // with no subscriptions on it.
    //
    // Sequential is slower to finish and far likelier to finish at all. Each
    // tier is shown the moment its own price arrives.
    const priceEachInTurn = async () => {
      for (const pkg of ordered) {
        if (cancelled) return;
        try {
          const res = await fetch("/api/service-package/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locale,
              packageId: pkg.id,
              serviceId,
              variantKey,
              startDate,
              time: "09:00",
              weekdays: spread(pkg.min_days_per_week),
              professionalCount: 1,
              needMaterials: false,
              addOns: [],
            }),
          });
          const quote = res.ok ? ((await res.json()) as Quote) : { valid: false };
          if (!cancelled) setQuotes((prev) => ({ ...prev, [pkg.id]: quote }));
        } catch {
          if (!cancelled) setQuotes((prev) => ({ ...prev, [pkg.id]: { valid: false } }));
        }
      }
      if (!cancelled) setLoading(false);
    };

    void priceEachInTurn();

    return () => {
      cancelled = true;
    };
  }, [variantKey, ordered, serviceId, locale, workingWeeks]);

  if (durations.length === 0) return null;

  return (
    <div>
      {/* Step one — how long */}
      <h2 className="text-2xl font-bold text-ink">{dict.selectDuration}</h2>
      <p className="mt-1 text-muted">{dict.chooseDuration}</p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {durations.map((d) => {
          const active = d.variantKey === variantKey;
          return (
            <button
              key={d.variantKey}
              type="button"
              onClick={() => setVariantKey(d.variantKey)}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition ${
                active
                  ? "border-primary bg-primary-light"
                  : "border-border bg-surface hover:border-primary"
              }`}
            >
              <span className={`text-2xl font-bold ${active ? "text-primary-dark" : "text-ink"}`}>
                {hours(d.minutes)}
              </span>
              <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                {dict.hours}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step two — how often */}
      <div className="mt-10">
        <h3 className="text-xl font-bold text-ink">{dict.howOften}</h3>
        <p className="mt-1 text-sm text-muted">{dict.howOftenSub}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((pkg) => {
            const q = quotes[pkg.id];
            const priced = q?.valid && typeof q.grand_total === "number";
            const saving = Number(q?.you_save ?? 0);

            return (
              <button
                key={pkg.id}
                type="button"
                disabled={!priced}
                onClick={() =>
                  router.push(
                    `/${locale}/service/${serviceSlug}/book?package=${pkg.id}&variant=${variantKey}`
                  )
                }
                className={`rounded-2xl border p-4 text-start transition ${
                  priced
                    ? "border-border bg-surface hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                    : "border-border bg-surface-soft opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-ink">{pkg.name}</span>
                  {priced && Number(q?.discount_percent) > 0 && (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                      {q?.discount_percent}%
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted">
                  {dict.visitsAMonth.replace(
                    "{count}",
                    String(q?.total_visits ?? q?.visits_per_month ?? pkg.min_days_per_week * 4)
                  )}
                </p>

                {/* Loading, priced, or plainly unavailable — never a blank card
                    that leaves the customer guessing which it is. */}
                {loading && !q ? (
                  <p className="mt-3 text-sm text-muted">{dict.loadingPrice}</p>
                ) : priced ? (
                  <>
                    <p className="mt-3 text-lg font-bold text-ink">{money(q!.grand_total!)}</p>
                    <p className="text-xs text-muted">
                      {money(q!.net_visit_price ?? 0)} {dict.perVisit}
                    </p>
                    {saving > 0 && (
                      <p className="mt-1 text-xs font-semibold text-primary-dark">
                        {dict.youSave} {money(saving)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted">{dict.unavailableHere}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
