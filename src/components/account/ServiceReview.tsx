"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Dict = Record<string, string>;

export interface ExistingReview {
  rating: number;
  comment: string;
  reply: string;
}

function Stars({ value, onPick, hover, onHover }: {
  value: number;
  onPick?: (n: number) => void;
  hover?: number;
  onHover?: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= (hover || value);
        return onPick ? (
          <button
            key={n}
            type="button"
            onMouseEnter={() => onHover?.(n)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onPick(n)}
            aria-label={String(n)}
            className={`text-2xl leading-none ${active ? "text-accent" : "text-border"}`}
          >
            ★
          </button>
        ) : (
          <span key={n} className={`text-lg leading-none ${active ? "text-accent" : "text-border"}`}>
            ★
          </span>
        );
      })}
    </div>
  );
}

export function ServiceReview({
  bookingId,
  serviceId,
  locale,
  dict,
  existing,
  canEdit,
}: {
  bookingId: string;
  serviceId: string;
  locale: Locale;
  dict: Dict;
  existing: ExistingReview | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "form">(existing ? "view" : "form");
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [state, setState] = useState<"idle" | "loading" | "err">("idle");

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
        router.refresh();
        setMode("view");
        setState("idle");
        return;
      }
      setState("err");
    } catch {
      setState("err");
    }
  }

  /* View an existing review + provider reply */
  if (mode === "view" && existing) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface-soft p-3">
        <div className="flex items-center gap-2">
          <Stars value={existing.rating} />
          {canEdit && (
            <button
              type="button"
              onClick={() => setMode("form")}
              className="ms-auto text-xs font-medium text-primary hover:underline"
            >
              {dict.editReview}
            </button>
          )}
        </div>
        {existing.comment && <p className="mt-1 text-sm text-ink">{existing.comment}</p>}
        {existing.reply && (
          <div className="mt-2 rounded-lg border-s-2 border-primary bg-surface p-2">
            <p className="text-xs font-semibold text-primary-dark">{dict.providerReply}</p>
            <p className="text-sm text-muted">{existing.reply}</p>
          </div>
        )}
      </div>
    );
  }

  /* New review or editing */
  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-soft p-3">
      <Stars value={rating} hover={hover} onPick={setRating} onHover={setHover} />
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
        {existing && (
          <button
            type="button"
            onClick={() => {
              setRating(existing.rating);
              setComment(existing.comment);
              setMode("view");
              setState("idle");
            }}
            className="text-xs text-muted"
          >
            {dict.cancel}
          </button>
        )}
        {state === "err" && <span className="text-xs text-accent-dark">{dict.reviewError}</span>}
      </div>
    </div>
  );
}
