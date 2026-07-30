"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

export function SubscribeButton({
  planId,
  isFreeTrial,
  locale,
  dict,
}: {
  planId: string;
  isFreeTrial: boolean;
  locale: Locale;
  dict: Dict;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "err">("idle");

  async function go() {
    setState("loading");
    try {
      const res = await fetch("/api/subscription/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          locale,
          // Free-trial plans need no payment; paid plans use the in-app wallet.
          ...(isFreeTrial ? {} : { payment_method: "wallet" }),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        if (json.redirect) {
          window.location.href = json.redirect as string;
          return;
        }
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
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setState("idle")}
          className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-accent-dark"
        >
          {dict.subscribeError}
        </button>
      </div>
    );
  }

  if (!isFreeTrial && state === "confirm") {
    return (
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={go}
          disabled={false}
          className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          {dict.confirmWallet}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="rounded-xl border border-border px-3 text-sm text-muted"
        >
          {dict.cancel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={() => (isFreeTrial ? go() : setState("confirm"))}
      className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
    >
      {state === "loading"
        ? dict.processing
        : isFreeTrial
          ? dict.startTrial
          : dict.subscribe}
    </button>
  );
}
