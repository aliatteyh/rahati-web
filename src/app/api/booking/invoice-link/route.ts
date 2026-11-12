import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authGet } from "@/lib/account";

/**
 * A link to one of the customer's own invoices.
 *
 * The invoice opens in a new tab, and a new tab sends no bearer token — so for
 * a long time the booking id was the whole of the proof, and anybody holding
 * it could read the customer's name, phone number, address and what they paid.
 * The token is spent here instead: the server checks the invoice belongs to
 * whoever is signed in and answers with a signed link that expires.
 *
 * Asked for at the moment of the click rather than when the page is built. A
 * link minted with the list would be stale by the time somebody scrolled to
 * it, and would sit in the HTML of a page that may be open for an hour.
 */
const KINDS = [
  "customer-invoice",
  "customer-fullbooking-invoice",
  "customer-fullbooking-single-invoice",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const kind = String(body.kind ?? "").trim();
  const id = String(body.id ?? "").trim();

  if (!id || !KINDS.includes(kind)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // `authGet` answers with the envelope's `content` and falls back on any
  // failure, so an empty object here means "no link" — which covers a booking
  // that is not this customer's just as it covers one that does not exist.
  const content = await authGet<{ url?: string }>(
    `/api/v1/customer/booking/invoice-link?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}&lang=${locale}`,
    locale,
    {}
  );

  if (typeof content?.url !== "string" || content.url === "") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: true, url: content.url });
}
