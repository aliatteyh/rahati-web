"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Small confirm → POST → refresh button used for account actions
 * (transfer points, cancel subscription, …).
 */
export function ConfirmActionButton({
  endpoint,
  body,
  labels,
  tone = "primary",
}: {
  endpoint: string;
  body: Record<string, unknown>;
  labels: {
    action: string;
    confirm: string;
    cancel: string;
    processing: string;
    error: string;
  };
  tone?: "primary" | "danger";
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "err">("idle");

  async function run() {
    setState("loading");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        className="text-sm font-medium text-accent-dark underline"
      >
        {labels.error}
      </button>
    );
  }

  if (state === "confirm") {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${
            tone === "danger" ? "bg-accent-dark" : "bg-primary"
          }`}
        >
          {labels.confirm}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="text-sm text-muted"
        >
          {labels.cancel}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={state === "loading"}
      onClick={() => setState("confirm")}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
        tone === "danger"
          ? "border-border text-accent-dark hover:border-accent-dark"
          : "border-primary/40 text-primary-dark hover:border-primary"
      }`}
    >
      {state === "loading" ? labels.processing : labels.action}
    </button>
  );
}
