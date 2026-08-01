"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

/**
 * Cancelling a package is not a small action: it calls off every remaining
 * visit and, for a prepaid plan, settles money. The confirm step spells out
 * what happens rather than asking "are you sure?" about nothing in particular.
 */
export function CancelPackageButton({
  packageId,
  locale,
  label,
  confirmLabel,
  note,
}: {
  packageId: string;
  locale: Locale;
  label: string;
  confirmLabel: string;
  note: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "err">("idle");

  async function cancel() {
    setState("loading");
    try {
      const res = await fetch("/api/service-package/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, locale }),
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
        className="text-xs font-medium text-danger underline"
      >
        {label}
      </button>
    );
  }

  if (state === "confirm") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted">{note}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white"
          >
            {confirmLabel}
          </button>
          <button type="button" onClick={() => setState("idle")} className="text-xs text-muted">
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={() => setState("confirm")}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-danger transition hover:border-danger disabled:opacity-60"
    >
      {label}
    </button>
  );
}
