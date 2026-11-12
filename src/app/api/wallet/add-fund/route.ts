import { openPaymentSession } from "@/lib/payment-session";
import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://admin.rahatics.com";

/**
 * Start a wallet top-up.
 *
 * Money only ever enters the wallet through a hosted gateway page, the same way
 * checkout works — this route builds the handoff and returns the URL, it never
 * touches a card itself. The gateway calls the backend's `add_fund_success`
 * hook, which credits the balance and applies any active bonus; nothing here
 * decides an amount.
 *
 * The callback returns the customer to their wallet, where the new balance and
 * the bonus line are already in the transaction list.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const amount = Number(body.amount ?? 0);
  const method = String(body.payment_method ?? "");

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, reason: "invalid_amount" }, { status: 400 });
  }
  if (!method) {
    return NextResponse.json({ ok: false, reason: "no_method" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const callback = `${origin}/${locale}/account/wallet`;
  // The payment page no longer takes the payer's identity from its own URL.
  // `access_token` was base64 of the user id and proved nothing; this spends
  // the bearer token for a session the server minted against it.
  const session = await openPaymentSession(locale);

  if (!session) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const redirect =
    `${API_BASE}/payment?is_add_fund=1` +
    `&amount=${encodeURIComponent(String(amount))}` +
    `&payment_method=${encodeURIComponent(method)}` +
    `&session=${encodeURIComponent(session)}` +
    `&payment_platform=web` +
    `&callback=${encodeURIComponent(callback)}`;

  return NextResponse.json({ ok: true, redirect }, { status: 200 });
}
