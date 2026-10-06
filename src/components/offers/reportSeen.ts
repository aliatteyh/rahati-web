"use client";

import { useEffect, useRef } from "react";

/**
 * Tell the server an offer was actually drawn.
 *
 * Counted here rather than when the offers API answers, because a page is
 * loaded far more often than its offers are looked at, and a view that means
 * "the response was sent" makes the conversion figure a fiction.
 *
 * Once per offer per placement per session, not per page load: somebody who
 * opens three pages in one visit has seen the bar once. A bar that rotates back
 * to the same offer has not been seen twice either, and a re-render is not a
 * view at all.
 *
 * Failures are swallowed on purpose. Nothing a visitor does depends on this,
 * and an analytics call is never a reason to put an error in front of them.
 */
const reported = new Set<string>();

export function reportSeen(id: string, placement: "bar" | "featured" | "card" | "popup"): void {
  const key = `${id}:${placement}`;
  if (reported.has(key)) return;
  reported.add(key);

  // Survives a page change inside the same visit. sessionStorage can throw or
  // come back empty — a private window, blocked site data — and the in-memory
  // set above still holds for this page, which is the common case.
  try {
    const stored = `seen:${key}`;
    if (sessionStorage.getItem(stored)) return;
    sessionStorage.setItem(stored, "1");
  } catch {
    /* no memory of earlier pages, so this one counts it */
  }

  try {
    fetch("/api/offers/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, placement }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* counting a view is never worth an error in the page */
  }
}

/**
 * Counts the view when the block actually reaches the screen.
 *
 * A view used to be reported the moment the component mounted, which counted
 * a section three screens down that nobody scrolled to — and made the
 * conversion rate read lower than the truth. The observer disconnects after
 * the first sighting: being scrolled past twice is not two views.
 */
export function useReportSeen(
  id: string,
  placement: "bar" | "featured" | "card" | "popup"
) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      // No observer to lean on: counting it on mount is less wrong than not
      // counting it at all.
      reportSeen(id, placement);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reportSeen(id, placement);
          observer.disconnect();
        }
      },
      // A third of the block on screen is somebody looking at it, not a corner
      // passing by on a fast scroll.
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [id, placement]);

  return ref;
}
