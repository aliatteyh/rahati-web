"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { ServicePackage } from "@/lib/api";
import { formatNumber } from "@/lib/currency";

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
  categoryName,
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
  /** Sub-category name, used only to pick the card's icon. */
  categoryName?: string;
}) {
  const categoryIcon = iconFor(categoryName);
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

  // Which card wears the ribbon.
  //
  // The admin's own switch decides it. Guessing from badge text meant a package
  // labelled "Save 5%" outranked one at 25% — the site was promoting the
  // cheapest thing on the shelf because it happened to carry a word. Only when
  // nobody has chosen does the deepest discount stand in, so the row never
  // looks unfinished.
  const highlightId = useMemo(() => {
    const chosen = ordered.find((p) => Number(p.is_featured) === 1);
    if (chosen) return chosen.id;
    return ordered.reduce<{ id: string | null; pct: number }>(
      (best, p) =>
        p.max_discount_percent > best.pct ? { id: p.id, pct: p.max_discount_percent } : best,
      { id: null, pct: 0 }
    ).id;
  }, [ordered]);

  const visitMinutes = durations.find((d) => d.variantKey === variantKey)?.minutes ?? 0;

  const money = (n: number) =>
    `${currency} ${formatNumber(n, locale, { maximumFractionDigits: 2 })}`;

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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((pkg) => {
            const q = quotes[pkg.id];
            const priced = q?.valid && typeof q.grand_total === "number";
            const saving = Number(q?.you_save ?? 0);
            const percent = Number(q?.discount_percent ?? 0);
            const visits = Number(
              q?.total_visits ?? q?.visits_per_month ?? pkg.min_days_per_week * 4
            );
            // What the same visits cost bought one at a time. The saving only
            // means something next to the number it is measured against.
            const original = Number(q?.undiscounted_visit_price ?? 0) * visits;
            const featured = pkg.id === highlightId;
            // One switch covers the pill and the struck-through price: a
            // crossed-out number with no saving beside it just looks broken.
            const showSaving = Number(pkg.show_saving_badge ?? 1) === 1;

            return (
              <div key={pkg.id} className="relative pt-3">
                {/* The ribbon follows the words, the ring follows the switch.
                    Tying both to "highlight" meant text written on five packages
                    showed on one, and the other four looked as though the admin
                    panel had ignored them. Anything with something to say says
                    it; only the chosen one wears the accent colour. */}
                {(pkg.badge_text || featured) && (
                  <span
                    className={`absolute inset-x-0 top-0 z-10 mx-auto w-fit rounded-full px-4 py-1 text-sm font-bold shadow ${
                      featured ? "bg-primary text-white" : "bg-surface text-ink ring-1 ring-border"
                    }`}
                  >
                    {pkg.badge_text || dict.bestSeller}
                  </span>
                )}

                <button
                  type="button"
                  disabled={!priced}
                  /* The accent is set here rather than left to a swapped colour
                     class. The card paints once with the plain border and keeps
                     it: the class changes, the rendered colour does not, and the
                     ring simply never appears. An inline value has nothing to
                     lose a race with. */
                  style={featured && priced ? { borderColor: "var(--color-primary)" } : undefined}
                  onClick={() =>
                    router.push(
                      `/${locale}/service/${serviceSlug}/book?package=${pkg.id}&variant=${variantKey}`
                    )
                  }
                  className={`flex h-full w-full flex-col rounded-2xl border-2 bg-surface p-5 text-center transition ${
                    !priced
                      ? "border-border bg-surface-soft opacity-60"
                      : featured
                        ? "border-primary shadow-lg"
                        : "border-border hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                  }`}
                >
                  {/* An icon that follows the category rather than an uploaded
                      image: one shape, one size, and nothing to maintain. */}
                  <span aria-hidden className="text-5xl leading-none">
                    {categoryIcon}
                  </span>

                  <h4 className="mt-3 text-lg font-bold text-ink">{pkg.name}</h4>
                  {pkg.short_description && (
                    <p className="mt-0.5 text-sm text-muted">{pkg.short_description}</p>
                  )}

                  {/* Rating and subscribers, and only where they are real.
                      A star with nothing behind it is the one thing on this card
                      a customer would be right to feel misled by, so each half
                      appears only once it has been earned — the score when the
                      work has been rated, the count when someone has bought. */}
                  {(pkg.avg_rating || (pkg.subscriber_count ?? 0) > 0) && (
                    <p className="mt-1 flex items-center justify-center gap-2 text-sm">
                      {pkg.avg_rating ? (
                        <span className="font-semibold text-ink">
                          <span aria-hidden className="text-amber-500">★</span>{" "}
                          {Number(pkg.avg_rating).toFixed(1)}
                        </span>
                      ) : null}
                      {(pkg.subscriber_count ?? 0) > 0 && (
                        <span className="text-muted">
                          ({(dict.subscriberCount ?? "{count}").replace(
                            "{count}",
                            String(pkg.subscriber_count)
                          )})
                        </span>
                      )}
                    </p>
                  )}

                  {/* Loading, priced, or plainly unavailable — never a blank card
                      that leaves the customer guessing which it is. */}
                  {loading && !q ? (
                    <p className="mt-5 text-sm text-muted">{dict.loadingPrice}</p>
                  ) : !priced ? (
                    <p className="mt-5 text-sm text-muted">{dict.unavailableHere}</p>
                  ) : (
                    <>
                      <p className="mt-4 text-3xl font-extrabold text-ink">
                        {formatNumber(q!.grand_total!, locale, { maximumFractionDigits: 2 })}
                        <span className="ms-1 align-middle text-sm font-medium text-muted">
                          {currency}
                        </span>
                      </p>

                      <dl className="mt-4 space-y-2 text-start text-sm">
                        <SpecRow
                          label={dict.packageVisits}
                          value={(dict.visitsEach ?? "")
                            .replace("{count}", String(visits))
                            .replace("{hours}", `${hours(visitMinutes)} ${dict.hours}`)}
                        />
                        <SpecRow
                          label={dict.packageValidity}
                          value={(dict.packageDays ?? "").replace(
                            "{count}",
                            String(pkg.validity_months * 30)
                          )}
                        />
                        {showSaving && original > q!.grand_total! && (
                          <SpecRow
                            label={dict.packageOriginal}
                            value={money(original)}
                            strike
                          />
                        )}
                      </dl>

                      {showSaving && saving > 0 && (
                        <p className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm font-bold text-primary-dark">
                          {(dict.savePill ?? "")
                            .replace("{amount}", money(saving))
                            .replace("{percent}", String(Math.round(percent)))}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-muted">
                        {money(q!.net_visit_price ?? 0)} {dict.perVisit}
                      </p>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * One line of a package's specification: label on one side, value on the other.
 */
function SpecRow({ label, value, strike }: { label: string; value: string; strike?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink/70">{label}</dt>
      <dd className={`text-end font-medium ${strike ? "text-ink/50 line-through" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * An icon for the card, chosen from the sub-category's own name.
 *
 * The packages table has an image column, but every package would need a file
 * uploaded and kept at a consistent size — and mismatched artwork reads worse
 * than no artwork at all. One glyph per family of work costs nothing and is
 * always the same size.
 */
function iconFor(name?: string): string {
  const n = (name ?? "").toLowerCase();
  const table: [string[], string][] = [
    [["clean", "تنظيف", "نظاف"], "🧹"],
    [["ac", "air", "تكييف", "مكيف"], "❄️"],
    [["plumb", "سباك"], "🚿"],
    [["electric", "كهرب"], "💡"],
    [["paint", "دهان", "صباغ"], "🎨"],
    [["pest", "حشر", "مكافح"], "🐜"],
    [["garden", "حديق", "زراع"], "🌱"],
    [["beauty", "salon", "تجميل", "صالون"], "💅"],
    [["car", "سيار", "مركب"], "🚗"],
    [["move", "نقل", "عفش"], "📦"],
  ];
  for (const [keys, icon] of table) {
    if (keys.some((k) => n.includes(k))) return icon;
  }
  return "🛠️";
}
