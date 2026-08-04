"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Campaign } from "@/lib/api";

/**
 * Campaigns as a row you scroll through, two at a time.
 *
 * A grid stacked them down the page, which pushed everything below out of
 * reach as soon as there were more than a couple. A promotion is a glance, not
 * a list — so they sit side by side and the row moves.
 *
 * Scrolling is done by bringing the target card into view rather than by
 * nudging scrollLeft: right-to-left pages report that value differently across
 * browsers, and this needs no special case for Arabic.
 */
export function CampaignCarousel({
  campaigns,
  locale,
  offLabel,
  intervalSeconds = 0,
}: {
  campaigns: Campaign[];
  locale: Locale;
  offLabel: string;
  /** Admin-set seconds between slides; 0 leaves the row still. */
  intervalSeconds?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = campaigns.length;
  const loops = count > 1;

  /**
   * The row is rendered twice when there is more than one campaign.
   *
   * Wrapping by resetting the index rewound the whole row in front of the
   * customer. Scrolling on into a second copy and then stepping back by exactly
   * one set — with no animation, so nothing is visible — lets the last card hand
   * over to the first without the row ever appearing to go backwards.
   */
  const slides = loops ? [...campaigns, ...campaigns] : campaigns;

  /** Bring a card to the start of the track. Visual delta, so RTL needs no case. */
  const scrollToCard = (i: number, behavior: ScrollBehavior) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    if (!track || !card) return;
    const delta = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    if (Math.abs(delta) > 1) track.scrollBy({ left: delta, behavior });
  };

  useEffect(() => {
    scrollToCard(index, "smooth");

    // Landed on the first card of the duplicate set: let the animation finish,
    // then step back a whole set instantly. Same pixels on screen, index home.
    if (loops && index === count) {
      const id = setTimeout(() => {
        scrollToCard(0, "auto");
        setIndex(0);
      }, 500);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, loops]);

  // Auto-advance. Pauses on hover and while a touch is in progress, so a card is
  // never pulled away mid-read.
  useEffect(() => {
    if (intervalSeconds <= 0 || !loops || paused) return;
    const id = setInterval(() => setIndex((i) => i + 1), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, loops, paused]);

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((campaign, i) => {
          const amount = Number(campaign.discount?.discount_amount ?? 0);
          const isPercent =
            campaign.discount?.discount_amount_type === "percent" ||
            campaign.discount?.discount_amount_type === "percentage";
          return (
            <Link
              key={`${campaign.id}-${i}`}
              href={`/${locale}/campaign/${campaign.id}`}
              className="group w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary sm:w-[calc(50%-0.5rem)]"
            >
              {campaign.cover_image_full_path ? (
                <img
                  src={campaign.cover_image_full_path}
                  alt=""
                  className="aspect-[16/5] w-full object-cover"
                />
              ) : (
                /* Without artwork the card would collapse to a name, so the
                   discount itself becomes the picture. */
                <div className="flex aspect-[16/5] w-full items-center justify-center bg-primary-light">
                  <span className="text-3xl font-bold text-primary-dark">
                    {amount > 0 && isPercent ? `${amount}%` : campaign.campaign_name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0 truncate font-semibold text-ink">
                  {campaign.campaign_name}
                </span>
                {amount > 0 && isPercent && (
                  <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                    {amount}% {offLabel}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {loops && (
        <>
          {/* Both wrap, so neither arrow is ever a dead control. */}
          <Arrow side="start" onClick={() => setIndex((i) => (i <= 0 ? count - 1 : i - 1))} />
          <Arrow side="end" onClick={() => setIndex((i) => i + 1)} />
        </>
      )}
    </div>
  );
}

/**
 * `start`/`end` rather than left/right so the arrows swap with the page
 * direction and keep pointing the way the row actually moves.
 */
function Arrow({
  side,
  onClick,
}: {
  side: "start" | "end";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "start" ? "Previous" : "Next"}
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/95 shadow-sm transition sm:grid ${
        side === "start" ? "start-2" : "end-2"
      } h-9 w-9 text-ink hover:border-primary hover:text-primary`}
    >
      <svg
        className={`h-5 w-5 ${side === "start" ? "rtl-flip" : "rtl-flip rotate-180"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
