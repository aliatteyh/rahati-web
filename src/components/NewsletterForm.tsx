"use client";

import { useState } from "react";

type Dict = Record<string, string>;

export function NewsletterForm({ dict }: { dict: Dict }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "dup" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("ok");
        setEmail("");
      } else if (res.status === 400) {
        setState("dup");
      } else {
        setState("err");
      }
    } catch {
      setState("err");
    }
  }

  const message =
    state === "ok"
      ? { text: dict.subscribed, tone: "text-primary-dark" }
      : state === "dup"
        ? { text: dict.alreadySubscribed, tone: "text-muted" }
        : state === "err"
          ? { text: dict.subscribeError, tone: "text-accent-dark" }
          : null;

  return (
    <form onSubmit={submit} className="mt-4 max-w-xs">
      <div className="flex overflow-hidden rounded-xl border border-border bg-surface focus-within:border-primary">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle" && state !== "loading") setState("idle");
          }}
          placeholder={dict.emailPlaceholder}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-ink outline-none"
          aria-label={dict.emailPlaceholder}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {state === "loading" ? dict.subscribing : dict.subscribe}
        </button>
      </div>
      {message && <p className={`mt-2 text-xs ${message.tone}`}>{message.text}</p>}
    </form>
  );
}
