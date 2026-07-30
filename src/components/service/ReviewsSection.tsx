"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { ServiceRating, ServiceReview } from "@/lib/types";

type Dict = Record<string, string>;

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className={i <= Math.round(value) ? "text-accent" : "text-border"}
          fill="currentColor"
        >
          <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17l-6.9 3.6 1.6-6.9L1.4 9.1l7-.6L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export function ReviewsSection({
  locale,
  dict,
  rating,
  reviews,
}: {
  locale: Locale;
  dict: Dict;
  rating: ServiceRating;
  reviews: ServiceReview[];
}) {
  const [detailed, setDetailed] = useState(false);

  const total = rating.review_count ?? rating.rating_count ?? reviews.length;
  const avg = rating.average_rating ?? 0;

  const breakdown = useMemo(() => {
    const map = new Map<number, number>();
    (rating.rating_group_count ?? []).forEach((g) => {
      const star = g.rating ?? 0;
      const count = g.total ?? g.count ?? 0;
      if (star >= 1 && star <= 5) map.set(star, count);
    });
    return [5, 4, 3, 2, 1].map((star) => ({ star, count: map.get(star) ?? 0 }));
  }, [rating.rating_group_count]);

  const sorted = useMemo(() => {
    if (!detailed) return reviews;
    return [...reviews].sort(
      (a, b) => (b.review || b.comment || "").length - (a.review || a.comment || "").length
    );
  }, [reviews, detailed]);

  const nf = new Intl.NumberFormat(locale === "ar" ? "ar" : "en");
  const df = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short" });

  return (
    <div className="mt-12">
      <h2 className="mb-5 text-2xl font-bold text-ink">{dict.reviewsTitle}</h2>

      {total > 0 ? (
        <>
          <div className="grid gap-8 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-[auto_1fr]">
            {/* Average */}
            <div className="text-center">
              <div className="text-5xl font-bold text-ink">{avg.toFixed(2)}</div>
              <div className="mt-2 flex justify-center">
                <Stars value={avg} size={18} />
              </div>
              <div className="mt-1 text-sm text-muted">
                {nf.format(total)} {dict.reviews}
              </div>
            </div>
            {/* Breakdown */}
            <div className="space-y-2 self-center">
              {breakdown.map(({ star, count }) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-3 text-muted">{star}</span>
                    <svg width={12} height={12} viewBox="0 0 24 24" className="text-accent" fill="currentColor">
                      <path d="M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17l-6.9 3.6 1.6-6.9L1.4 9.1l7-.6L12 2z" />
                    </svg>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-12 text-end text-muted">{nf.format(count)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sort + list */}
          {reviews.length > 0 && (
            <>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailed((v) => !v)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    detailed
                      ? "border-primary bg-primary-light text-primary-dark"
                      : "border-border text-muted hover:border-primary"
                  }`}
                >
                  {dict.mostDetailed}
                </button>
              </div>

              <ul className="mt-5 space-y-5">
                {sorted.map((r, i) => {
                  const name =
                    [r.customer?.first_name, r.customer?.last_name]
                      .filter(Boolean)
                      .join(" ") || "—";
                  const stars = r.review_rating ?? r.rating ?? 0;
                  const text = r.review || r.comment || "";
                  const replyRows =
                    r.review_replies && r.review_replies.length > 0
                      ? r.review_replies
                      : [r.review_reply ?? r.reviewReply].filter(Boolean);
                  return (
                    <li key={r.id ?? i} className="border-b border-border pb-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light font-semibold text-primary-dark">
                          {name.charAt(0)}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{name}</p>
                          <div className="flex items-center gap-2">
                            <Stars value={stars} />
                            {r.created_at && (
                              <span className="text-xs text-muted">
                                {df.format(new Date(r.created_at))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {text && <p className="mt-3 text-muted">{text}</p>}
                      {replyRows
                        .filter((rr) => rr?.reply)
                        .map((rr, ri) => (
                          <div
                            key={ri}
                            className="mt-3 rounded-lg border-s-2 border-primary bg-surface-soft p-3 sm:ms-13"
                          >
                            {rr!.reply_by_name && (
                              <p className="text-xs font-semibold text-primary-dark">
                                {rr!.reply_by_name}
                              </p>
                            )}
                            <p className="mt-0.5 text-sm text-muted">{rr!.reply}</p>
                          </div>
                        ))}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-soft p-8 text-center text-muted">
          {dict.noReviews}
        </div>
      )}
    </div>
  );
}
