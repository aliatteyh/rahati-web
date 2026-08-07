"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

interface IntentResponse {
  ok?: boolean;
  payment_id?: string;
  client_secret?: string;
  publishable_key?: string;
  message?: string;
}

/**
 * Card fields for the checkout page.
 *
 * The customer stays here. Stripe serves the inputs inside its own iframes, so
 * the card number never touches our page or our server — which is what keeps
 * this out of PCI scope while still looking like our checkout rather than
 * someone else's.
 *
 * Apple Pay and Google Pay appear on their own for anyone whose device offers
 * them; nothing here has to ask.
 */
export function StripeCardForm({
  locale,
  dict,
  intentBody,
  onPaid,
  disabled,
}: {
  locale: Locale;
  dict: Dict;
  /** Everything the backend needs to price the payment and, later, the booking. */
  intentBody: Record<string, unknown>;
  onPaid: () => void;
  disabled?: boolean;
}) {
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // The intent is prepared once. Re-preparing on every render would leave a
  // trail of abandoned payments in Stripe for a customer who only changed their
  // mind about the time slot.
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    (async () => {
      try {
        const res = await fetch("/api/checkout/stripe/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, ...intentBody }),
        });
        const data: IntentResponse = await res.json();
        if (!data.ok || !data.client_secret || !data.publishable_key) {
          setError(data.message || dict.cardUnavailable);
          return;
        }
        setIntent(data);
      } catch {
        setError(dict.cardUnavailable);
      } finally {
        setLoading(false);
      }
    })();
  }, [locale, intentBody, dict.cardUnavailable]);

  // Keyed on the publishable key so the promise is created once per key rather
  // than on every render, which is what loadStripe expects.
  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (intent?.publishable_key ? loadStripe(intent.publishable_key) : null),
    [intent?.publishable_key]
  );

  if (loading) {
    return <p className="p-4 text-center text-sm text-muted">{dict.cardLoading}</p>;
  }

  if (error || !intent?.client_secret || !stripePromise) {
    return <p className="p-4 text-sm text-accent-dark">{error || dict.cardUnavailable}</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.client_secret,
        locale: locale === "ar" ? "ar" : "en",
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#0f766e",
            borderRadius: "12px",
            fontSizeBase: "15px",
          },
        },
      }}
    >
      <CardFields
        dict={dict}
        paymentId={intent.payment_id ?? ""}
        locale={locale}
        onPaid={onPaid}
        disabled={disabled}
      />
    </Elements>
  );
}

function CardFields({
  dict,
  paymentId,
  locale,
  onPaid,
  disabled,
}: {
  dict: Dict;
  paymentId: string;
  locale: Locale;
  onPaid: () => void;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const pay = useCallback(async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");

    // redirect: "if_required" keeps the customer here for an ordinary card and
    // only leaves the page when the bank insists — 3D Secure usually resolves in
    // a modal without going anywhere.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      // Stripe's own wording names the actual problem — expired card, wrong CVC,
      // insufficient funds — and is already translated. Replacing it with one
      // generic line would throw away the only thing the customer can act on.
      setError(stripeError.message || dict.cardFailed);
      setPaying(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError(dict.cardFailed);
      setPaying(false);
      return;
    }

    // Money has moved. From here the booking is owed to the customer, so a
    // failure to confirm is reported as needing support rather than as a failed
    // payment — and Stripe's webhook will settle it regardless.
    try {
      const res = await fetch("/api/checkout/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, payment_id: paymentId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(dict.paidButPending);
        setPaying(false);
        return;
      }
    } catch {
      setError(dict.paidButPending);
      setPaying(false);
      return;
    }

    onPaid();
  }, [stripe, elements, dict, locale, paymentId, onPaid]);

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && <p className="text-sm text-accent-dark">{error}</p>}

      <button
        type="button"
        onClick={pay}
        disabled={!stripe || paying || disabled}
        className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
      >
        {paying ? dict.cardProcessing : dict.cardPay}
      </button>

      <p className="text-center text-xs text-muted">{dict.cardSecure}</p>
    </div>
  );
}
