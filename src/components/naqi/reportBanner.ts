"use client";

/**
 * Tells the server a banner was seen or tapped.
 *
 * Counted here rather than when the list is served: a home page is fetched far
 * more often than any one banner is scrolled to, and an impression that means
 * "the response was sent" makes the click rate a fiction.
 *
 * Once per banner per tab for impressions — a rotation that comes back round to
 * the same banner has not been seen twice. Clicks are counted every time,
 * because they are.
 */
const seen = new Set<string>();

export function reportBannerSeen(id?: string | null): void {
  if (!id || seen.has(id)) return;

  seen.add(id);
  send(id, "impression");
}

export function reportBannerClick(id?: string | null): void {
  if (!id) return;

  send(id, "click");
}

function send(id: string, type: "impression" | "click"): void {
  // keepalive, so a click that navigates away still arrives: the browser is
  // allowed to abandon an ordinary fetch the moment the page starts unloading,
  // which is exactly when every click is counted.
  fetch(`/api/banner/${encodeURIComponent(id)}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, surface: "web" }),
    keepalive: true,
  }).catch(() => {
    // A tally that can break the page it measures is worse than no tally.
  });
}
