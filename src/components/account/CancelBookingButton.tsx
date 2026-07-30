"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

export function CancelBookingButton({
  bookingId,
  locale,
  dict,
}: {
  bookingId: string;
  locale: Locale;
  dict: Dict;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "err">("idle");

  async function cancel() {
    setState("loading");
    try {
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.refresh();
        return;
      }
      setState("err");
    } catch {
      setState("err");
    }
  }

  if (state === "err") {
    return (
      <button
        type="button"
        onClick={() => setState("idle")}
        className="text-xs font-medium text-accent-dark underline"
      >
        {dict.cancelError}
      </button>
    );
  }

  if (state === "confirm") {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg bg-accent-dark px-3 py-1 text-xs font-semibold text-white"
        >
          {dict.confirmCancel}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="text-xs text-muted"
        >
          {dict.keep}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={() => setState("confirm")}
      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-accent-dark transition hover:border-accent-dark disabled:opacity-60"
    >
      {state === "loading" ? dict.cancelling : dict.cancelBooking}
    </button>
  );
}
