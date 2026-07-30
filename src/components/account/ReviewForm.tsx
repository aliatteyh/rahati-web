"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

export function ReviewForm({
  bookingId,
  serviceId,
  locale,
  dict,
}: {
  bookingId: string;
  serviceId: string;
  locale: Locale;
  dict: Dict;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit() {
    if (rating < 1) return;
    setState("loading");
    try {
      const res = await fetch("/api/review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          service_id: serviceId,
          review_rating: rating,
          review_comment: comment,
          locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setState("ok");
        router.refresh();
        return;
      }
      setState("err");
    } catch {
      setState("err");
    }
  }

  if (state === "ok") {
    return <p className="mt-3 text-xs font-medium text-primary-dark">{dict.reviewThanks}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-lg border border-primary/40 px-3 py-1 text-xs font-medium text-primary-dark transition hover:border-primary"
      >
        {dict.rate}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-soft p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`${n}`}
            className={`text-2xl leading-none ${
              n <= (hover || rating) ? "text-accent" : "text-border"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={dict.reviewPlaceholder}
        rows={2}
        className="mt-2 w-full rounded-lg border border-border bg-surface p-2 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={rating < 1 || state === "loading"}
          onClick={submit}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {state === "loading" ? dict.processing : dict.submitReview}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted"
        >
          {dict.cancel}
        </button>
        {state === "err" && (
          <span className="text-xs text-accent-dark">{dict.reviewError}</span>
        )}
      </div>
    </div>
  );
}
