"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Offer } from "@/lib/api";
import { compactCountdown, useCountdown } from "./useCountdown";
import { reportSeen } from "./reportSeen";

const DISMISSED_KEY = "rahati_offer_popup_seen";
const ONE_DAY = 24 * 60 * 60 * 1000;
const APPEARS_AFTER = 3500;

/**
 * The welcome offer, once a day.
 *
 * Three and a half seconds is not an arbitrary delay. A modal that arrives
 * with the page interrupts someone who has not yet seen what they came for,
 * and is closed without being read; a few seconds in, the visitor has taken in
 * the page and an offer reads as an offer rather than an obstacle.
 *
 * Once every twenty-four hours, per browser. Per session would mean a regular
 * customer meets the same modal several times a day; never again would mean a
 * campaign launched next week is never seen by the people who visit most.
 */
export function OfferPopup({
  offer,
  serverTime,
  locale,
  dict,
}: {
  offer: Offer | null;
  serverTime: string;
  locale: Locale;
  dict: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const left = useCountdown(offer?.ends_at ?? null, serverTime);

  useEffect(() => {
    if (!offer) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(`${DISMISSED_KEY}:${offer.id}`) ?? 0);
    } catch {
      // A private window shows it once per page, which is the honest
      // fallback: better a repeated offer than a broken one.
    }

    if (Date.now() - dismissedAt < ONE_DAY) return;

    const timer = setTimeout(() => setOpen(true), APPEARS_AFTER);
    return () => clearTimeout(timer);
  }, [offer?.id]);

  useEffect(() => {
    if (open && offer) reportSeen(offer.id, "popup");
  }, [open, offer?.id]);

  // Escape closes it. A modal that can only be dismissed by finding the right
  // small button is a trap, whatever it is offering.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    if (!offer) return;
    try {
      localStorage.setItem(`${DISMISSED_KEY}:${offer.id}`, String(Date.now()));
    } catch {
      /* nothing to remember it with, and nothing that depends on it */
    }
  }

  if (!open || !offer || left.finished) return null;

  const clock = compactCountdown(left);
  const href = offer.service_slug
    ? `/${locale}/service/${offer.service_slug}/book?offer=${offer.code}`
    : `/${locale}/services?offer=${offer.code}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={offer.headline}
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-surface p-7 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={dict.close}
          onClick={close}
          className="absolute end-4 top-4 h-8 w-8 rounded-full bg-black/5 text-ink transition hover:bg-black/10"
        >
          ✕
        </button>

        {offer.tag && (
          <span className="inline-block rounded-full bg-[#e8d9ae] px-3 py-1 text-xs font-semibold text-[#6b5a24]">
            {offer.tag}
          </span>
        )}

        {offer.big_number && (
          <p className="mt-4 text-5xl font-extrabold text-primary">{offer.big_number}</p>
        )}

        <p className="mt-2 text-lg font-bold text-ink">{offer.headline}</p>

        {offer.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted">{offer.description}</p>
        )}

        {clock && (
          <p className="mt-4 text-sm text-danger">
            {dict.endsIn} <span className="font-mono">{clock}</span>
          </p>
        )}

        <p className="mt-5 rounded-lg border border-dashed border-line py-3 text-center font-mono text-lg tracking-widest text-ink">
          {offer.code}
        </p>

        <Link
          href={href}
          onClick={close}
          className="mt-4 block rounded-lg bg-primary py-3 text-center font-semibold text-white transition hover:bg-primary-dark"
        >
          {dict.useOffer}
        </Link>

        <button
          type="button"
          onClick={close}
          className="mt-3 w-full text-center text-sm text-muted transition hover:text-ink"
        >
          {dict.noThanks}
        </button>
      </div>
    </div>
  );
}
