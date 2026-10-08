"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banner } from "@/lib/types";
import { ROTATION, slideIndex } from "./adRotation";
import { bannerHref } from "./bannerLink";
import { reportBannerClick, reportBannerSeen } from "./reportBanner";

/**
 * One of the page's mid-scroll banner slots — the panel's "Website · slot 1"
 * and "slot 2".
 *
 * A wide strip rather than a second hero: these sit between sections of a page
 * somebody is already reading, and a full-height picture there is an
 * interruption. The picture, the words, the pill and the destination all come
 * from the banner row, so the office changes what the page announces without a
 * release.
 *
 * Draws nothing at all when the office has put nothing in this slot. An empty
 * frame with a placeholder in it tells the reader we meant to sell them
 * something and failed.
 */
export function BannerSlot({
  banners,
  locale,
  slideLabel,
  alt,
}: {
  banners: Banner[];
  locale: string;
  slideLabel: string;
  alt: string;
}) {
  const slides = banners.filter((banner) => banner.banner_image_full_path);

  // Zero until the browser has run: the slide is derived from the clock, and
  // the server's clock is a different second, which is a hydration mismatch.
  const [tick, setTick] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);

  useEffect(() => {
    if (slides.length < 2) return;

    setTick(Date.now());
    const timer = setInterval(() => setTick(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const index =
    pinned ?? (tick ? slideIndex(slides.length, ROTATION.slot, tick) : 0);
  const current = slides.length ? slides[index % slides.length] : undefined;

  // One impression per banner per tab — a rotation that comes back round to the
  // same picture has not been seen a second time.
  useEffect(() => {
    reportBannerSeen(current?.id);
  }, [current?.id]);

  if (!current) return null;

  const href = bannerHref(current, locale);

  const strip = (
    <div className="relative overflow-hidden rounded-hero bg-stone">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.banner_image_full_path ?? ""}
        alt={current.banner_title || alt}
        className="h-[clamp(160px,22vw,260px)] w-full object-cover"
      />

      {current.banner_title && (
        /* The words sit on a gradient, not on the photograph: a banner is
           uploaded by the office and we cannot know whether its right-hand
           third is a white wall or a dark floor. */
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/75 via-ink/25 to-transparent p-[clamp(18px,3vw,32px)]">
          <div className="max-w-xl text-white">
            {current.button_text && (
              <span className="mb-2 inline-flex rounded-full bg-white/18 px-2.5 py-1 text-[11.5px] font-medium backdrop-blur-[6px]">
                {current.button_text}
              </span>
            )}
            <p className="text-[clamp(18px,2.2vw,26px)] font-semibold leading-snug">
              {current.banner_title}
            </p>
            {current.subtitle && (
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">
                {current.subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)] pt-[clamp(56px,7vw,96px)]">
      {href ? (
        <Link
          href={href}
          aria-label={current.banner_title || alt}
          onClick={() => reportBannerClick(current.id)}
        >
          {strip}
        </Link>
      ) : (
        strip
      )}

      {slides.length > 1 && (
        <div className="mt-4 flex items-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id ?? i}
              type="button"
              aria-label={`${slideLabel} ${i + 1}`}
              aria-current={i === index}
              onClick={() => setPinned(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-7 bg-ink" : "w-1.5 bg-ink/25 hover:bg-ink/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
