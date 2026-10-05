"use client";

import { useEffect, useState } from "react";

export type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the offer is over, so a caller can stop drawing it. */
  finished: boolean;
  /**
   * True until the browser has run this once.
   *
   * A countdown cannot be rendered on the server: whatever second it writes
   * into the HTML has passed by the time the browser reads it, and React calls
   * that a hydration mismatch and throws the whole subtree away. So the first
   * render says "not yet" and the real figures arrive a frame later.
   */
  pending: boolean;
};

const OVER: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, finished: true, pending: false };

const PENDING: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, finished: false, pending: true };

/**
 * Time left until an offer ends, measured against the server's clock.
 *
 * The device's clock is not trustworthy for this. A laptop an hour fast shows
 * a live offer as finished; one a day slow keeps advertising an offer the
 * checkout will refuse, which is worse — the customer taps, gets an error, and
 * concludes the site is broken rather than the offer expired.
 *
 * So the server sends its own time with the offers, and everything here is
 * computed against the offset between that and the browser's. The offset is
 * measured once: re-measuring every tick would make the countdown jitter by
 * however long each request happened to take.
 *
 * @param endsAt     the offer's end, absolute
 * @param serverTime the server's clock when it sent the offers
 */
export function useCountdown(endsAt: string | null, serverTime: string): TimeLeft {
  // Deliberately not computed here. The initial state is what the server
  // renders, and a clock is the one thing the two sides cannot agree on.
  const [left, setLeft] = useState<TimeLeft>(PENDING);

  useEffect(() => {
    if (!endsAt) return;

    const offset = offsetOf(serverTime);
    setLeft(remaining(endsAt, offset));

    const tick = setInterval(() => setLeft(remaining(endsAt, offset)), 1000);
    return () => clearInterval(tick);
  }, [endsAt, serverTime]);

  return left;
}

/** How far the browser's clock sits from the server's, in milliseconds. */
function offsetOf(serverTime: string): number {
  const server = Date.parse(serverTime);
  return Number.isFinite(server) ? server - Date.now() : 0;
}

function remaining(endsAt: string | null, offset: number): TimeLeft {
  if (!endsAt) return OVER;

  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return OVER;

  const ms = end - (Date.now() + offset);
  if (ms <= 0) return OVER;

  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    finished: false,
    pending: false,
  };
}

/** "6d 01:32:11" — the compact form the bar and the cards use. */
export function compactCountdown(left: TimeLeft): string {
  if (left.finished || left.pending) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`;

  return left.days > 0 ? `${left.days}d ${clock}` : clock;
}
