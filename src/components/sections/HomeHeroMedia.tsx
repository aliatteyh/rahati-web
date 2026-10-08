"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banner } from "@/lib/types";
import { ROTATION, slideIndex } from "./adRotation";
import { bannerHref } from "./bannerLink";
import { reportBannerClick, reportBannerSeen } from "./reportBanner";

/**
 * The picture beside the headline, and the card that sits on it.
 *
 * Both are the panel's banners: the image, the title, the line under it, the
 * pill and where a tap goes. Nothing on this card is written into the page, so
 * the office changes what the homepage announces without a release.
 *
 * It rotates only when there is more than one banner — a carousel of one is a
 * picture with a timer attached. The dots are buttons, not decoration: someone
 * who wants the second offer should not have to wait seven seconds for it.
 */
export function HomeHeroMedia({
  banners,
  locale,
  fallbackImage,
  alt,
  slideLabel,
}: {
  banners: Banner[];
  locale: string;
  fallbackImage?: string | null;
  alt: string;
  slideLabel: string;
}) {
  const slides = banners.filter((banner) => banner.banner_image_full_path);

  // Null until the browser has run, because the slide is derived from the clock
  // and the server's clock is a different second — rendering one on the server
  // is a hydration mismatch, which throws the whole subtree away.
  const [pinned, setPinned] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;

    setTick(Date.now());

    // The clock advances; the index is read from it. A timer that counts from
    // zero on mount would put two slots out of step and restart whenever the
    // component re-rendered.
    const timer = setInterval(() => setTick(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const index =
    pinned ?? (tick ? slideIndex(slides.length, ROTATION.hero, tick) : 0);

  const current = slides.length ? slides[index % slides.length] : undefined;

  // One impression per banner per tab. A rotation that comes back round to the
  // same picture has not been seen a second time.
  useEffect(() => {
    reportBannerSeen(current?.id);
  }, [current?.id]);
  const image = current?.banner_image_full_path ?? fallbackImage ?? null;
  const href = bannerHref(current, locale);

  const card = current?.banner_title ? (
    <div
      className="absolute inset-x-5 bottom-5 rounded-[18px] p-5 text-white backdrop-blur-[10px]"
      style={{ background: current.background_color ?? "rgba(22,33,29,0.82)" }}
    >
      {current.button_text && (
        <span className="mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium">
          {current.button_text}
        </span>
      )}
      <p className="text-[17px] font-semibold leading-snug">
        {current.banner_title}
      </p>
      {current.subtitle && (
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/75">
          {current.subtitle}
        </p>
      )}
    </div>
  ) : null;

  const media = (
    <div className="relative h-[clamp(320px,38vw,540px)] overflow-hidden rounded-hero bg-stone">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-green-band" />
      )}
      {card}
    </div>
  );

  return (
    <div>
      {href ? (
        <Link
          href={href}
          aria-label={current?.banner_title ?? alt}
          onClick={() => reportBannerClick(current?.id)}
        >
          {media}
        </Link>
      ) : (
        media
      )}

      {slides.length > 1 && (
        <div className="mt-4 flex items-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id ?? i}
              type="button"
              aria-label={`${slideLabel} ${i + 1}`}
              aria-current={i === index}
              // Pinned, not nudged: somebody who picks a slide means to look
              // at it, and letting the clock move on two seconds later takes
              // it away from them.
              onClick={() => setPinned(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-7 bg-ink" : "w-1.5 bg-ink/25 hover:bg-ink/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
