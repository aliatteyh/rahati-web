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

  useEffect(() => {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;

    // Scroll by the visual gap between the card and the track rather than to an
    // absolute offset: right-to-left pages report scrollLeft differently across
    // browsers, and a relative delta needs no special case for Arabic.
    const delta = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    if (Math.abs(delta) > 1) track.scrollBy({ left: delta, behavior: "smooth" });
  }, [index]);

  // Auto-advance, wrapping back to the first card. Pauses on hover and while a
  // touch is in progress, so it never yanks a card away mid-read.
  useEffect(() => {
    if (intervalSeconds <= 0 || campaigns.length < 2 || paused) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % campaigns.length),
      intervalSeconds * 1000
    );
    return () => clearInterval(id);
  }, [intervalSeconds, campaigns.length, paused]);

  if (campaigns.length === 0) return null;

  const canGoBack = index > 0;
  const canGoOn = index < campaigns.length - 1;

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
        {campaigns.map((campaign) => {
          const amount = Number(campaign.discount?.discount_amount ?? 0);
          const isPercent =
            campaign.discount?.discount_amount_type === "percent" ||
            campaign.discount?.discount_amount_type === "percentage";
          return (
            <Link
              key={campaign.id}
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

      {campaigns.length > 1 && (
        <>
          <Arrow
            side="start"
            disabled={!canGoBack}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          />
          <Arrow
            side="end"
            disabled={!canGoOn}
            onClick={() => setIndex((i) => Math.min(campaigns.length - 1, i + 1))}
          />
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
  disabled,
  onClick,
}: {
  side: "start" | "end";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "start" ? "Previous" : "Next"}
      className={`absolute top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/95 shadow-sm transition disabled:opacity-0 sm:grid ${
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
