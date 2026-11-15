import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { authGet, authSend } from "@/lib/account";

/**
 * A change the office has asked for on a visit that is already under way.
 *
 * The cleaner is in the house, the clean is not finished, and the customer has
 * asked for another hour or for materials. The office priced it and asked; this
 * is where the customer sees the question and answers it.
 *
 * Nothing about the booking moves until the answer arrives with the money,
 * which is why the approve call either settles from the wallet or hands back a
 * payment link — the gateway is what applies a card payment, never this route.
 */

type Amendment = {
  id?: string;
  kind?: string;
  amount?: number;
  from_minutes?: number | null;
  to_minutes?: number | null;
  status?: string;
};

/** What is being asked, and what the customer has to pay it with. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = String(url.searchParams.get("booking_id") ?? "").trim();
  // `isLocale` narrows a string, so the null a missing parameter gives has to
  // be settled before it is asked.
  const asked = url.searchParams.get("locale") ?? "en";
  const locale = isLocale(asked) ? asked : "en";

  if (!bookingId) {
    return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });
  }

  // `authGet` hands back the content itself, with the fallback when the call
  // fails - so a booking nobody is waiting on and a call that did not work
  // both read as "nothing to answer", which is the safe way round.
  const content = await authGet<Record<string, unknown>>(
    `/api/v1/customer/booking/${encodeURIComponent(bookingId)}/amendment`,
    locale,
    {}
  );

  const amendment = (content.amendment ?? null) as Amendment | null;

  return NextResponse.json(
    {
      ok: true,
      // Null is the ordinary answer: most bookings have nobody waiting on an
      // answer, and the card draws nothing at all in that case.
      amendment: amendment
        ? {
            id: String(amendment.id ?? ""),
            kind: String(amendment.kind ?? "duration"),
            amount: Number(amendment.amount ?? 0),
            fromMinutes: amendment.from_minutes ?? null,
            toMinutes: amendment.to_minutes ?? null,
            status: String(amendment.status ?? ""),
          }
        : null,
      owed: Number(content.owed ?? 0),
      walletBalance: Number(content.wallet_balance ?? 0),
    },
    { status: 200 }
  );
}

/** The answer: yes with a method, or no. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = isLocale(body.locale) ? body.locale : "en";
  const bookingId = String(body.booking_id ?? "").trim();
  const answer = body.answer === "decline" ? "decline" : "approve";
  const method = body.method === "card" ? "card" : "wallet";

  if (!bookingId) {
    return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });
  }

  const { ok, json } = await authSend(
    "POST",
    `/api/v1/customer/booking/${encodeURIComponent(bookingId)}/amendment/${answer}`,
    answer === "approve" ? { method } : {},
    locale
  );

  const content = (json as { content?: Record<string, unknown> })?.content ?? {};
  const response = (json as { response_code?: string })?.response_code ?? null;

  return NextResponse.json(
    {
      ok,
      // A wallet payment settles here; a card one answers with a link and
      // settles when the gateway confirms it.
      settled: Boolean(content.settled),
      applied: Boolean(content.applied),
      paymentUrl: typeof content.payment_url === "string" ? content.payment_url : null,
      owed: Number(content.owed ?? 0),
      // The one refusal worth telling apart: an empty wallet is the customer's
      // to fix, and the sheet can offer to top it up instead of saying no.
      reason: response === "insufficient_wallet_balance_403" ? "wallet_short" : (content.reason ?? null),
    },
    { status: ok ? 200 : 400 }
  );
}
