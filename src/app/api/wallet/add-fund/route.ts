import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authGet } from "@/lib/account";

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

  const info = await authGet<{ id?: string }>("/api/v1/customer/info", locale, {});
  const userId = info?.id ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const callback = `${origin}/${locale}/account/wallet`;
  const accessToken = Buffer.from(userId).toString("base64url");

  const redirect =
    `${API_BASE}/payment?is_add_fund=1` +
    `&amount=${encodeURIComponent(String(amount))}` +
    `&payment_method=${encodeURIComponent(method)}` +
    `&access_token=${encodeURIComponent(accessToken)}` +
    `&payment_platform=web` +
    `&callback=${encodeURIComponent(callback)}`;

  return NextResponse.json({ ok: true, redirect }, { status: 200 });
}
