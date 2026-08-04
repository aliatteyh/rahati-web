"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Advertisement } from "@/lib/api";

/**
 * Provider advertisements on the home page.
 *
 * These are not banners. A banner is the platform speaking; an advertisement is
 * a named provider speaking, so each card carries their identity and leads to
 * their profile rather than to a service. The backend only returns ads that are
 * approved, inside their run dates, and whose provider serves the customer's
 * zone — so a promotion never reaches a city its provider cannot work in.
 *
 * Every card is marked as sponsored. The customer is being shown paid placement
 * next to editorial content, and that has to be visible without being read for.
 *
 * A rail rather than a grid: ads are a glance on the way past, and stacking them
 * would push the real catalogue off the screen as soon as a few providers buy in.
 *
 * It turns on its own, on the same admin-set interval as the campaign row. Two
 * neighbouring rows moving at different speeds would read as a fault rather than
 * a choice, so they share one setting.
 */
export function AdvertisementRail({
  ads,
  locale,
  sponsoredLabel,
  ctaLabel,
  intervalSeconds = 0,
}: {
  ads: Advertisement[];
  locale: Locale;
  sponsoredLabel: string;
  ctaLabel: string;
  /** Admin-set seconds between slides; 0 leaves the row still. */
  intervalSeconds?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = ads.length;
  const loops = count > 1;

  /**
   * The row is rendered twice when there is more than one advertisement.
   *
   * Rewinding to the start in front of the customer looks like a fault. Running
   * on into a second copy and then stepping back by exactly one set — instantly,
   * so nothing is visible — lets the last card hand over to the first without the
   * row ever appearing to go backwards.
   */
  const slides = loops ? [...ads, ...ads] : ads;

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
    if (loops && index === count) {
      const id = setTimeout(() => {
        scrollToCard(0, "auto");
        setIndex(0);
      }, 500);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, loops]);

  // Pauses on hover and while a touch is in progress, so a card is never pulled
  // away mid-read.
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
        {slides.map((ad, i) => (
          <AdCard
            key={`${ad.id}-${i}`}
            ad={ad}
            locale={locale}
            sponsoredLabel={sponsoredLabel}
            ctaLabel={ctaLabel}
          />
        ))}
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

function AdCard({
  ad,
  locale,
  sponsoredLabel,
  ctaLabel,
}: {
  ad: Advertisement;
  locale: Locale;
  sponsoredLabel: string;
  ctaLabel: string;
}) {
  // `title`/`description` carry the translated copy when one exists; the
  // `default_*` pair is what the provider originally wrote.
  const title = ad.title || ad.default_title || ad.provider?.company_name || "";
  const description = ad.description || ad.default_description || "";
  // Flattened onto the advertisement by the controller, which unsets the
  // `attachments` relation before responding — reading it there finds nothing.
  const cover = ad.provider_cover_image_full_path;
  const logo = ad.provider_profile_image_full_path;
  const video = ad.promotional_video_full_path;
  const rating = Number(ad.provider_rating ?? ad.provider?.avg_rating ?? 0);

  const href = ad.provider_id ? `/${locale}/provider/${ad.provider_id}` : `/${locale}/services`;

  return (
    <Link
      href={href}
      className="group w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary sm:w-[calc(50%-0.5rem)]"
    >
      <div className="relative">
        {video ? (
          /* A video promotion carries its file on the advertisement itself, not
             in `attachments` — the relation there excludes it. Muted, looping
             and inline so it behaves like artwork rather than seizing the page;
             `playsInline` is what stops iOS opening it fullscreen on its own. */
          <video
            src={video}
            className="aspect-[16/6] w-full bg-ink object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={cover ?? undefined}
          />
        ) : cover ? (
          <img src={cover} alt="" className="aspect-[16/6] w-full object-cover" />
        ) : (
          /* No artwork uploaded — the provider's name becomes the picture rather
             than the card collapsing to a strip of text. */
          <div className="flex aspect-[16/6] w-full items-center justify-center bg-primary-light px-4">
            <span className="text-center text-xl font-bold text-primary-dark">
              {ad.provider?.company_name || title}
            </span>
          </div>
        )}
        <span className="absolute top-2 start-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {sponsoredLabel}
        </span>
      </div>

      <div className="flex gap-3 p-4">
        {logo && (
          <img
            src={logo}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{title}</p>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">{description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-sm">
            {rating > 0 && (
              <span className="flex items-center gap-1 font-semibold text-ink">
                <span className="text-accent">★</span>
                {rating.toFixed(1)}
              </span>
            )}
            <span className="font-semibold text-primary group-hover:underline">{ctaLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** `start`/`end` so the arrows follow the page direction. */
function Arrow({ side, onClick }: { side: "start" | "end"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "start" ? "Previous" : "Next"}
      className={`absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/95 text-ink shadow-sm transition hover:border-primary hover:text-primary sm:grid ${
        side === "start" ? "start-2" : "end-2"
      }`}
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
