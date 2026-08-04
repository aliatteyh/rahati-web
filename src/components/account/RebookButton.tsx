"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

/**
 * Book the same thing again.
 *
 * The backend rebuilds the cart from the original booking, so the customer gets
 * today's price rather than the one they paid last time — which is why this
 * lands on checkout for confirmation instead of placing the order outright.
 */
export function RebookButton({
  bookingId,
  locale,
  label,
  loadingLabel,
  failedLabel,
}: {
  bookingId: string;
  locale: Locale;
  label: string;
  loadingLabel: string;
  failedLabel: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "err">("idle");
  const [error, setError] = useState("");

  async function rebook() {
    setState("loading");
    try {
      const res = await fetch("/api/booking/rebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, locale }),
      });
      const json = await res.json().catch(() => ({}));

      if (json?.ok) {
        router.push(`/${locale}/checkout`);
        return;
      }

      // The backend refuses for reasons the customer can act on — rebooking
      // switched off, a provider now suspended — so show its words, not ours.
      setError(json?.message || failedLabel);
      setState("err");
    } catch {
      setError(failedLabel);
      setState("err");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={rebook}
        disabled={state === "loading"}
        className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-60"
      >
        {state === "loading" ? loadingLabel : label}
      </button>
      {state === "err" && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
