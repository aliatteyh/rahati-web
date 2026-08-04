"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
// Straight from `currency`, not the `api` re-export: `api.ts` reads cookies, and
// importing it here would pull `next/headers` into the browser bundle.
import { formatPrice } from "@/lib/currency";

/** A top-up bonus the admin is running, exactly as the backend stores it. */
export interface WalletBonus {
  id?: string;
  bonus_title?: string;
  short_description?: string;
  bonus_amount_type?: string;
  bonus_amount?: number | string;
  minimum_add_amount?: number | string;
  maximum_bonus_amount?: number | string;
  end_date?: string;
}

/**
 * Work out the bonus a given top-up earns.
 *
 * This deliberately mirrors `get_add_money_bonus()` in the backend rather than
 * inventing its own rule: bonuses do not stack — the one with the highest
 * threshold the amount clears wins — and a percentage bonus is capped by
 * `maximum_bonus_amount`. If the two ever disagreed, the customer would be
 * promised one figure and credited another.
 */
export function bonusFor(amount: number, bonuses: WalletBonus[]): number {
  const eligible = bonuses.filter((b) => amount >= Number(b.minimum_add_amount ?? 0));
  if (eligible.length === 0) return 0;

  const topThreshold = Math.max(...eligible.map((b) => Number(b.minimum_add_amount ?? 0)));

  const values = eligible
    .filter((b) => Number(b.minimum_add_amount ?? 0) === topThreshold)
    .map((b) => {
      const value = Number(b.bonus_amount ?? 0);
      if (b.bonus_amount_type !== "percent") return value;
      const cap = Number(b.maximum_bonus_amount ?? 0);
      const raw = (amount * value) / 100;
      return cap > 0 ? Math.min(raw, cap) : raw;
    });

  return Math.max(0, ...values);
}

/**
 * Add money to the wallet, with whatever bonus the admin is offering.
 *
 * The bonus was already being credited on every top-up — the customer just had
 * no way to know it existed, so nobody topped up to reach a threshold. Showing
 * the live figure as the amount is typed is the whole point of the feature.
 */
export function WalletTopUp({
  locale,
  currency,
  bonuses,
  gateways,
  labels,
}: {
  locale: Locale;
  currency: string;
  bonuses: WalletBonus[];
  gateways: Array<{ key: string; title: string }>;
  labels: Record<string, string>;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(gateways[0]?.key ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const bonus = valid ? bonusFor(value, bonuses) : 0;

  // The next threshold worth reaching, so "add 50 more for 25 free" is possible
  // rather than only ever confirming what the customer already qualified for.
  const nextUp = bonuses
    .map((b) => Number(b.minimum_add_amount ?? 0))
    .filter((min) => min > (valid ? value : 0))
    .sort((a, b) => a - b)[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !method) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/add-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, amount: value, payment_method: method }),
      });
      const data = await res.json();
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      setError(labels.failed);
    } catch {
      setError(labels.failed);
    } finally {
      setBusy(false);
    }
  }

  // Without a gateway there is no way to take the money, so the form would be a
  // dead end. The offers still matter — they apply to any top-up.
  const canPay = gateways.length > 0;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{labels.title}</h2>

      {bonuses.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {bonuses.map((b, i) => (
            <li
              key={b.id ?? i}
              className="rounded-2xl border border-accent/40 bg-accent/5 p-4"
            >
              <p className="font-semibold text-ink">{b.bonus_title}</p>
              {b.short_description && (
                <p className="mt-0.5 text-sm text-muted">{b.short_description}</p>
              )}
              <p className="mt-2 text-sm font-semibold text-accent-dark">
                {b.bonus_amount_type === "percent"
                  ? `${Number(b.bonus_amount ?? 0)}%`
                  : formatPrice(Number(b.bonus_amount ?? 0), currency)}{" "}
                {labels.bonusOn}{" "}
                {formatPrice(Number(b.minimum_add_amount ?? 0), currency)}
                {b.bonus_amount_type === "percent" &&
                  Number(b.maximum_bonus_amount ?? 0) > 0 && (
                    <span className="font-normal text-muted">
                      {" "}
                      · {labels.upTo}{" "}
                      {formatPrice(Number(b.maximum_bonus_amount), currency)}
                    </span>
                  )}
              </p>
              {b.end_date && (
                <p className="mt-1 text-xs text-muted">
                  {labels.endsOn} {String(b.end_date).slice(0, 10)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canPay && (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">{labels.amount}</span>
              <input
                type="number"
                min="1"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">{labels.method}</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-ink outline-none focus:border-primary"
              >
                {gateways.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {bonus > 0 && (
            <p className="rounded-xl bg-primary-light px-3 py-2 text-sm font-semibold text-primary-dark">
              {labels.youGet
                .replace("{bonus}", formatPrice(bonus, currency) ?? String(bonus))
                .replace("{total}", formatPrice(value + bonus, currency) ?? String(value + bonus))}
            </p>
          )}

          {bonus === 0 && nextUp > 0 && (
            <p className="text-sm text-muted">
              {labels.addMore.replace(
                "{amount}",
                formatPrice(nextUp, currency) ?? String(nextUp)
              )}
            </p>
          )}

          {error && <p className="text-sm text-accent-dark">{error}</p>}

          <button
            type="submit"
            disabled={!valid || busy}
            className="h-11 rounded-full bg-primary px-6 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? labels.processing : labels.submit}
          </button>
        </form>
      )}
    </section>
  );
}
