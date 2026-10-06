"use client";

import { useEffect, useState } from "react";
import { slideIndex } from "./adRotation";

/**
 * The opening headline, and the others behind it.
 *
 * Which one shows is read from the clock — `floor(now / interval) % count` —
 * rather than counted by a timer that starts when the component mounts. A
 * timer restarts whenever React re-renders, puts two visitors out of step with
 * each other, and begins again from the first line every time somebody
 * navigates back; the clock does none of that.
 *
 * The first headline is drawn on the server and until the browser's first tick,
 * so the page never renders one thing on the server and another in the
 * browser. Every headline is stacked in place and the hidden ones are only
 * transparent, which holds the block at the height of the tallest: a headline
 * that resizes the page every six seconds moves everything under it.
 */
export function HeroHeadline({
  headlines,
  rotate,
  seconds,
}: {
  headlines: { top: string; bottom?: string }[];
  rotate: boolean;
  seconds: number;
}) {
  const interval = Math.max(3, seconds) * 1000;
  const moving = rotate && headlines.length > 1;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!moving) return;

    // Somebody who asked their system for less movement gets the first
    // headline and no rotation at all.
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (still) return;

    setTick(Date.now());
    const timer = setInterval(() => setTick(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [moving, interval]);

  const index = tick ? slideIndex(headlines.length, interval, tick) : 0;

  return (
    <h1 className="relative mt-6 text-[clamp(38px,4.6vw,66px)] font-semibold leading-[1.15] tracking-[-0.01em] text-ink text-balance">
      {headlines.map((headline, i) => (
        <span
          key={`${headline.top}-${i}`}
          aria-hidden={i !== index}
          className={`block transition-opacity duration-700 ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          } ${i === 0 ? "" : "absolute inset-x-0 top-0"}`}
        >
          {headline.top}
          {headline.bottom && (
            <>
              <br />
              <span className="font-normal text-green">{headline.bottom}</span>
            </>
          )}
        </span>
      ))}
    </h1>
  );
}
