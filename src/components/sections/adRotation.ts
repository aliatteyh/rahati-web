/**
 * Which ad a slot is showing, and the counting that goes with it.
 *
 * The index is derived from the clock, not from a timer:
 *
 *     Math.floor(Date.now() / interval) % count
 *
 * A `setInterval` restarts from zero on every mount, so a visitor who scrolls
 * back up sees the first slide again, two slots drift apart over a long visit,
 * and nobody sees the same thing at the same time. A clock-derived index has
 * none of those: it is a pure function of the time, so every slot and every
 * visitor is in step, and a re-render changes nothing.
 */
export function slideIndex(count: number, intervalMs: number, now: number): number {
  if (count <= 0) return 0;

  return Math.floor(now / intervalMs) % count;
}

/**
 * The ad a slot should draw, skipping whatever is already on the page.
 *
 * The same banner in the hero and again two sections down reads as a site with
 * one thing to say. Each slot is handed what the slots above it are showing and
 * takes the first ad that is not among them — and falls back to its own natural
 * choice when everything is taken, because an empty slot is worse than a repeat.
 */
export function pickForSlot<T extends { id?: string }>(
  items: T[],
  intervalMs: number,
  now: number,
  taken: (string | undefined)[]
): T | null {
  if (items.length === 0) return null;

  const start = slideIndex(items.length, intervalMs, now);

  for (let step = 0; step < items.length; step++) {
    const candidate = items[(start + step) % items.length];

    if (!taken.includes(candidate.id)) return candidate;
  }

  return items[start];
}

/** How long each surface holds a slide, from the handoff (§4). */
export const ROTATION = {
  hero: 6000,
  slot: 8000,
} as const;
