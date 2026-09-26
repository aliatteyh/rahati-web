/**
 * Tell the server an offer was actually drawn.
 *
 * Counted here rather than when the offers API answers, because a page is
 * loaded far more often than its offers are looked at, and a view that means
 * "the response was sent" makes the conversion figure a fiction.
 *
 * Once per offer per placement per page: a bar that rotates back to the same
 * offer has not been seen twice, and a re-render is not a view at all.
 *
 * Failures are swallowed on purpose. Nothing a visitor does depends on this,
 * and an analytics call is never a reason to put an error in front of them.
 */
const reported = new Set<string>();

export function reportSeen(id: string, placement: "bar" | "featured" | "card" | "popup"): void {
  const key = `${id}:${placement}`;
  if (reported.has(key)) return;
  reported.add(key);

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
