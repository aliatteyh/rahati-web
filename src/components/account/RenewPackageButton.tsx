"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";

interface RenewQuote {
  valid: boolean;
  total_visits: number;
  visits_per_month: number;
  discount_percent: number;
  grand_total: number;
  first_visit: string;
  last_visit: string;
  previous_total: number;
  reorder: {
    service_id: string;
    variant_key: string;
    weekdays: number[];
    time: string | null;
    start_date: string;
  };
}

/**
 * Renewing shows the price before it commits to anything.
 *
 * A package is a month of someone's time and a month of their money, and rates
 * can have moved since the first purchase — so the button quotes rather than
 * buys, and the customer confirms a number they have actually seen. The confirm
 * hands off to the normal booking flow, which is the only thing that takes
 * payment.
 */
export function RenewPackageButton({
  packageId,
  locale,
  serviceSlug,
  labels,
  money,
}: {
  packageId: string;
  locale: Locale;
  serviceSlug: string | null;
  labels: {
    renew: string;
    renewing: string;
    newPeriod: string;
    visitsLabel: string;
    confirm: string;
    priceChanged: string;
    samePrice: string;
    failed: string;
    back: string;
  };
  money: (n: number) => string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "quoted" | "err">("idle");
  const [quote, setQuote] = useState<RenewQuote | null>(null);
  const [error, setError] = useState("");

  async function fetchQuote() {
    setState("loading");
    try {
      const res = await fetch("/api/service-package/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, locale }),
      });
      const json = await res.json().catch(() => ({}));

      if (json?.ok && json.quote?.valid) {
        setQuote(json.quote as RenewQuote);
        setState("quoted");
        return;
      }

      // The backend refuses for reasons the customer can act on — a canceled
      // package, a service no longer sold here — so show its words, not ours.
      setError(json?.errors?.[0]?.message || json?.message || labels.failed);
      setState("err");
    } catch {
      setError(labels.failed);
      setState("err");
    }
  }

  if (state === "quoted" && quote) {
    const dearer = quote.grand_total > quote.previous_total;
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface-soft p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{labels.newPeriod}</span>
          <span className="text-sm font-medium text-ink" dir="ltr">
            {quote.first_visit.slice(0, 10)} → {quote.last_visit.slice(0, 10)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{labels.visitsLabel}</span>
          <span className="text-sm font-medium text-ink">{quote.total_visits}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="font-semibold text-ink">{money(quote.grand_total)}</span>
          {/* Naming the change is the point: a renewal at a new rate should not
              arrive as a surprise on the receipt. */}
          <span className={`text-xs ${dearer ? "text-accent-dark" : "text-muted"}`}>
            {quote.grand_total === quote.previous_total
              ? labels.samePrice
              : `${labels.priceChanged} ${money(quote.previous_total)}`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {serviceSlug && (
            <Link
              href={`/${locale}/service/${serviceSlug}/book`}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
            >
              {labels.confirm}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setState("idle")}
            className="rounded-full border border-border px-5 py-2 text-sm text-muted"
          >
            {labels.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={fetchQuote}
        disabled={state === "loading"}
        className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary disabled:opacity-60"
      >
        {state === "loading" ? labels.renewing : labels.renew}
      </button>
      {state === "err" && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
