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
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {dict.offersEyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink">{dict.offersTitle}</h2>
        </div>
        <p className="max-w-sm text-sm text-muted">{dict.offersHint}</p>
      </div>

      {featured && (
        <FeaturedOffer offer={featured} serverTime={serverTime} locale={locale} dict={dict} />
      )}

      {cards.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="overflow-hidden rounded-2xl bg-ink text-white">
      <div className="grid gap-6 p-7 sm:p-9 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {offer.tag && (
              <span className="rounded-full bg-[#e8d9ae] px-3 py-1 text-xs font-semibold text-[#6b5a24]">
                {offer.tag}
              </span>
            )}
            {left.days <= 1 && <span className="text-xs opacity-70">{dict.endingSoon}</span>}
          </div>

          <p className="mt-5">
            {offer.big_number && (
              <span className="text-5xl font-extrabold text-[#e8d9ae]">{offer.big_number}</span>
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
    <div className="flex h-full flex-col rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        {offer.tag && (
          <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark">
            {offer.tag}
          </span>
        )}
        {clock && <span className="font-mono text-xs text-danger">{clock}</span>}
      </div>

      <p className="mt-4">
        {offer.big_number && (
          <span className="text-2xl font-extrabold text-primary">{offer.big_number}</span>
        )}
        <span className="ms-2 font-semibold text-ink">{offer.headline}</span>
      </p>

      {offer.description && (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{offer.description}</p>
      )}

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span className="rounded-lg border border-dashed border-line px-3 py-1 font-mono text-xs text-ink">
          {offer.code}
        </span>
        <UseOffer offer={offer} locale={locale} label={dict.useOffer} tone="dark" />
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
  const href = offer.service_slug
    ? `/${locale}/service/${offer.service_slug}/book?offer=${offer.code}`
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
