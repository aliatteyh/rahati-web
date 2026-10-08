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
 * browser. All of them share one grid cell and the hidden ones are only
 * transparent, which holds the block at the height of the tallest: a headline
 * that resizes the page every six seconds moves everything under it, and one
 * that is taller than the first would otherwise spill over the paragraph.
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
    /* Every headline sits in the same grid cell, so the block is as tall as
       the tallest of them and none of them is taken out of the flow. Stacking
       the later ones absolutely held the height of the *first* instead: a
       longer headline — the English one usually — ran past the bottom and over
       the paragraph underneath. */
    <h1 className="mt-6 grid text-[clamp(30px,3.4vw,48px)] font-semibold leading-[1.15] tracking-[-0.01em] text-ink text-balance">
      {headlines.map((headline, i) => (
        <span
          key={`${headline.top}-${i}`}
          aria-hidden={i !== index}
          className={`col-start-1 row-start-1 block transition-opacity duration-700 ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
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
