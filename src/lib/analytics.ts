/**
 * Events the site pushes for Google Tag Manager to pick up.
 *
 * Nothing here talks to Google. It writes to `dataLayer`, the queue GTM reads,
 * so a conversion tag, a remarketing tag or a Meta pixel is configured in the
 * Tag Manager interface and never in this repository. Adding a second ad
 * network later is then somebody's afternoon in GTM, not a deploy.
 *
 * Names follow GA4's recommended events (`add_to_cart`, `begin_checkout`,
 * `purchase`) because Google Ads and GA4 both understand them out of the box —
 * a bespoke name would work too, but only after being mapped by hand.
 */

type DataLayerEvent = Record<string, unknown> & { event: string };

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

function push(payload: DataLayerEvent): void {
  if (typeof window === "undefined") return;
  // The array exists before GTM loads — that is how the snippet is designed, so
  // an event fired early is replayed rather than lost.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export interface PurchasePayload {
  /** The booking's own id, so a conversion counted twice can be spotted. */
  transactionId?: string | null;
  value: number;
  currency: string;
  /** "package" or "single" — the two are worth very different money. */
  bookingType?: "package" | "single";
  paymentMethod?: string | null;
  items?: { name?: string | null; quantity?: number; price?: number }[];
}

/**
 * A booking that actually completed.
 *
 * Fired where the server confirmed it, never on a confirmation page loading:
 * a customer who refreshes that page would otherwise be counted as a second
 * sale, and Google Ads would bid on the strength of revenue that never existed.
 */
export function trackPurchase(p: PurchasePayload): void {
  push({
    event: "purchase",
    transaction_id: p.transactionId ?? undefined,
    value: Number(p.value.toFixed(2)),
    currency: p.currency,
    booking_type: p.bookingType,
    payment_method: p.paymentMethod ?? undefined,
    items: p.items?.map((i) => ({
      item_name: i.name ?? undefined,
      quantity: i.quantity ?? 1,
      price: i.price,
    })),
  });
}

/** The customer reached checkout with something to pay for. */
export function trackBeginCheckout(value: number, currency: string): void {
  push({ event: "begin_checkout", value: Number(value.toFixed(2)), currency });
}

/** A service was put in the basket — the first real signal of intent. */
export function trackAddToCart(name: string | null | undefined, value: number, currency: string): void {
  push({
    event: "add_to_cart",
    value: Number(value.toFixed(2)),
    currency,
    items: [{ item_name: name ?? undefined, quantity: 1, price: Number(value.toFixed(2)) }],
  });
}
