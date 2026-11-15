"use client";

import { useEffect, useState } from "react";

/**
 * "The cleaner needs another hour — shall we?"
 *
 * The office prices a change on a visit that is under way and asks. Until this
 * existed the customer was never told: the booking simply grew, or more often
 * could not grow at all, and the cleaner was left explaining at the door.
 *
 * Three states and no more, because that is all there is to say:
 *
 *   - nothing to answer, and the card draws nothing;
 *   - a question, with the figure and two buttons;
 *   - the answer, and what happened to the money.
 *
 * A card payment leaves here for the payment page and comes back through the
 * gateway. Nothing on the booking changes from a press of a button: the money
 * arriving is what changes it, which is also why the wallet button says what
 * it will take before it takes it.
 */

type Amendment = {
  id: string;
  kind: string;
  amount: number;
  fromMinutes: number | null;
  toMinutes: number | null;
  status: string;
};

type Dict = Record<string, string>;

export function AmendmentCard({
  dict,
  locale,
  bookingId,
  money,
  onSettled,
}: {
  dict: Dict;
  locale: string;
  bookingId: string;
  money: (amount: number) => string;
  /** So the sheet can re-read the booking once its length and total have moved. */
  onSettled?: () => void;
}) {
  const [amendment, setAmendment] = useState<Amendment | null>(null);
  const [wallet, setWallet] = useState(0);
  const [state, setState] = useState<"loading" | "asking" | "working" | "done" | "short">("loading");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    fetch(`/api/booking/amendment?booking_id=${encodeURIComponent(bookingId)}&locale=${locale}`)
      .then((response) => response.json())
      .then((body) => {
        if (!live) return;
        setAmendment(body.amendment ?? null);
        setWallet(Number(body.walletBalance ?? 0));
        setState(body.amendment ? "asking" : "done");
      })
      .catch(() => {
        if (live) setState("done");
      });

    // The sheet can be closed while this is in flight, and setting state on a
    // card nobody is looking at is a warning in the console and nothing else.
    return () => {
      live = false;
    };
  }, [bookingId, locale]);

  if (state === "loading" || !amendment) return null;
  if (state === "done" && !note) return null;

  async function answer(body: Record<string, unknown>) {
    setState("working");
    setNote(null);

    const response = await fetch("/api/booking/amendment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, locale, ...body }),
    })
      .then((result) => result.json())
      .catch(() => null);

    if (!response?.ok) {
      // An empty wallet is the customer's to fix, and saying so is more use
      // than refusing.
      if (response?.reason === "wallet_short") {
        setState("short");
        return;
      }

      setState("asking");
      setNote(dict.amendmentFailed);
      return;
    }

    // A card payment is not finished here: the page it hands back is where it
    // is paid, and the gateway is what applies the change.
    if (response.paymentUrl) {
      window.location.href = response.paymentUrl;
      return;
    }

    setState("done");
    setNote(response.settled ? dict.amendmentPaid : dict.amendmentDeclined);
    onSettled?.();
  }

  const hours = (minutes: number | null) =>
    minutes === null ? "" : String(Math.round((minutes / 60) * 10) / 10);

  const what =
    amendment.kind === "materials"
      ? dict.amendmentMaterials
      : `${hours(amendment.fromMinutes)} → ${hours(amendment.toMinutes)} ${dict.hoursShort}`;

  if (state === "done") {
    return (
      <div className="mt-3 rounded-2xl bg-primary-light px-4 py-3 text-sm font-semibold text-primary-dark">
        {note}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-sand px-4 py-3 text-sand-ink">
      <p className="text-sm font-semibold">{dict.amendmentAsked}</p>

      <p className="mt-1 text-sm" dir="auto">
        {what} · <span className="font-bold">{money(amendment.amount)}</span>
      </p>

      {state === "short" ? (
        <>
          <p className="mt-2 text-sm font-medium">{dict.amendmentWalletShort}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/${locale}/account/wallet`}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
            >
              {dict.amendmentTopUpWallet}
            </a>
            <button
              type="button"
              onClick={() => answer({ answer: "approve", method: "card" })}
              className="rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary"
            >
              {dict.amendmentPayByCard}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={state === "working"}
            onClick={() => answer({ answer: "approve", method: "wallet" })}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {/* What it will take, and from where. A button that spends money
                should say the figure on it. */}
            {dict.amendmentPayFromWallet} · {money(wallet)}
          </button>

          <button
            type="button"
            disabled={state === "working"}
            onClick={() => answer({ answer: "approve", method: "card" })}
            className="rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary disabled:opacity-60"
          >
            {dict.amendmentPayByCard}
          </button>

          <button
            type="button"
            disabled={state === "working"}
            onClick={() => answer({ answer: "decline" })}
            className="rounded-xl px-3 py-2 text-xs font-semibold underline disabled:opacity-60"
          >
            {dict.amendmentDecline}
          </button>
        </div>
      )}

      {note && <p className="mt-2 text-xs font-medium">{note}</p>}

      <p className="mt-2 text-xs">{dict.amendmentNote}</p>
    </div>
  );
}
