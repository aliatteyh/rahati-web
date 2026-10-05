"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Offer } from "@/lib/api";
import { compactCountdown, useCountdown } from "./useCountdown";
import { reportSeen } from "./reportSeen";

type Dict = Record<string, string>;

/**
 * The offers a visitor can read at leisure: one big card and a row of small
 * ones.
 *
 * The featured offer gets the room because a page with four equal offers asks
 * the reader to choose before they have been persuaded of anything. One
 * leading offer and a few alternatives is a recommendation; four of the same
 * size is a menu.
 */
export function OffersSection({
  featured,
  cards,
  serverTime,
  locale,
  dict,
}: {
  featured: Offer | null;
  cards: Offer[];
  serverTime: string;
  locale: Locale;
  dict: Dict;
}) {
  if (!featured && cards.length === 0) return null;

  return (
    <section
      id="offers"
      className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)] py-[clamp(56px,7vw,96px)]"
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          {/* The page's own eyebrow, so this section joins the numbered
              sequence instead of announcing itself in a different voice. */}
          <div className="flex items-center gap-3 text-green">
            <span aria-hidden className="h-px w-9 bg-green opacity-60" />
            <span className="text-[13px] font-semibold tracking-[0.1em]">
              {dict.offersEyebrow}
            </span>
          </div>
          <h2 className="mt-4 text-[clamp(28px,3vw,42px)] font-semibold leading-[1.4] text-ink text-balance">
            {dict.offersTitle}
          </h2>
        </div>
        <p className="max-w-[420px] text-[15.5px] leading-[1.85] text-ink-62">
          {dict.offersHint}
        </p>
      </div>

      {featured && (
        <FeaturedOffer offer={featured} serverTime={serverTime} locale={locale} dict={dict} />
      )}

      {cards.length > 0 && (
        <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {cards.map((offer) => (
            <OfferCard key={offer.id} offer={offer} serverTime={serverTime} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </section>
  );
}

function FeaturedOffer({
  offer,
  serverTime,
  locale,
  dict,
}: {
  offer: Offer;
  serverTime: string;
  locale: Locale;
  dict: Dict;
}) {
  const left = useCountdown(offer.ends_at, serverTime);

  useEffect(() => {
    reportSeen(offer.id, "featured");
  }, [offer.id]);

  if (left.finished) return null;

  return (
    <div className="overflow-hidden rounded-card bg-green-dark text-white">
      <div className="grid gap-6 p-7 sm:p-9 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {offer.tag && (
              <span className="rounded-full bg-gold-soft px-3 py-1 text-[12.5px] font-semibold text-sand-ink">
                {offer.tag}
              </span>
            )}
            {left.days <= 1 && <span className="text-xs opacity-70">{dict.endingSoon}</span>}
          </div>

          <p className="mt-5">
            {offer.big_number && (
              <span className="font-mono text-5xl font-semibold text-gold">{offer.big_number}</span>
            )}
            <span className="ms-3 text-xl font-semibold">{offer.headline}</span>
          </p>

          {offer.description && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">{offer.description}</p>
          )}

          <p className="mt-6 text-xs uppercase tracking-wider text-white/60">{dict.endsIn}</p>
          <div className="mt-2 flex gap-2">
            {(
              [
                [left.days, dict.days],
                [left.hours, dict.hours],
                [left.minutes, dict.minutes],
                [left.seconds, dict.seconds],
              ] as const
            ).map(([value, label]) => (
              <span key={label} className="rounded-lg bg-white/10 px-3 py-2 text-center">
                <span className="block font-mono text-lg font-bold">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-white/60">{label}</span>
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-dashed border-white/40 px-4 py-2 font-mono text-sm">
              {offer.code}
            </span>
            <UseOffer offer={offer} locale={locale} label={dict.useOffer} tone="light" />
          </div>
        </div>

        {/* The picture is optional and the block has to stand without one, so
            an admin who has not uploaded artwork gets a plain card rather than
            a broken half. */}
        {offer.image && (
          <div className="hidden overflow-hidden rounded-xl lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={offer.image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  serverTime,
  locale,
  dict,
}: {
  offer: Offer;
  serverTime: string;
  locale: Locale;
  dict: Dict;
}) {
  const left = useCountdown(offer.ends_at, serverTime);

  useEffect(() => {
    reportSeen(offer.id, "card");
  }, [offer.id]);

  if (left.finished) return null;

  const clock = compactCountdown(left);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition hover:shadow-hover">
      {/* Optional, like the featured block's: a card with no artwork is a card,
          a card with a broken frame is a fault. */}
      {offer.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.image}
          alt=""
          className="h-[150px] w-full object-cover"
        />
      )}

      <div className="flex flex-1 flex-col p-6">
      <div className="flex items-start justify-between gap-2">
        {offer.tag && (
          <span className="rounded-full bg-green-soft px-3 py-1 text-[12.5px] font-semibold text-green">
            {offer.tag}
          </span>
        )}
        {clock && <span className="font-mono text-[12.5px] text-danger-alt">{clock}</span>}
      </div>

      <p className="mt-4">
        {offer.big_number && (
          <span className="font-mono text-[28px] font-semibold text-green">{offer.big_number}</span>
        )}
        <span className="ms-2 text-[16px] font-semibold text-ink">{offer.headline}</span>
      </p>

      {offer.description && (
        <p className="mt-3 flex-1 text-[13.5px] leading-[1.75] text-ink-55">{offer.description}</p>
      )}

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span dir="ltr" className="rounded-[12px] border border-dashed border-line-strong px-3 py-1.5 font-mono text-[13px] text-ink">
          {offer.code}
        </span>
        <UseOffer offer={offer} locale={locale} label={dict.useOffer} tone="dark" />
      </div>
      </div>
    </div>
  );
}

/**
 * Takes the visitor to the booking with the code already in hand.
 *
 * The code travels in the URL rather than being applied here: applying it
 * needs a basket, and the visitor does not have one yet. The booking page
 * reads `?offer=` and fills the field, so the customer sees it land rather
 * than being told it happened somewhere they were not looking.
 */
function UseOffer({
  offer,
  locale,
  label,
  tone,
}: {
  offer: Offer;
  locale: Locale;
  label: string;
  tone: "light" | "dark";
}) {
  // The length the offer needs travels with it, so "Use offer" lands on a
  // visit the offer actually applies to instead of on the shortest one and a
  // refusal. It selects without locking: the customer may still change it, and
  // the offer says so when they do.
  const hours = offer.min_hours > 0 ? `&hours=${offer.min_hours}` : "";

  const href = offer.service_slug
    ? `/${locale}/service/${offer.service_slug}/book?offer=${offer.code}${hours}`
    : `/${locale}/services?offer=${offer.code}`;

  const style =
    tone === "light"
      ? "bg-white text-ink hover:bg-white/90"
      : "bg-ink text-white hover:bg-ink/90";

  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${style}`}
    >
      {label}
    </Link>
  );
}
