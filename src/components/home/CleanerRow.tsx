/**
 * The team, by name and by face.
 *
 * What this company sells is not "cleaning" but these particular women, which
 * is the whole reason the app has carried this row since it was built. Someone
 * booking from a desktop saw none of them — the same service, bought from an
 * anonymous supplier.
 *
 * A cleaner with no reviews says she is new rather than "0.0 (0)", which to
 * anybody who has seen a star rating means nought out of five: the worst score
 * there is, printed under the face of somebody who has simply not been rated
 * yet. Her finished visits stand in, and are the truer number anyway.
 */
export interface Cleaner {
  id?: string;
  name?: string;
  team?: string;
  zone?: string;
  image_full_path?: string | null;
  avg_rating?: string | number;
  rating_count?: number;
  bookings_count?: number;
}

export function CleanerRow({
  cleaners,
  title,
  subtitle,
  newLabel,
  bookingsLabel,
}: {
  cleaners: Cleaner[];
  title: string;
  subtitle?: string;
  newLabel: string;
  /** "{n} bookings" — the count is substituted for {n}. */
  bookingsLabel: string;
}) {
  if (!cleaners.length) return null;

  return (
    <section className="py-16">
      <div className="mx-auto w-full max-w-page px-[clamp(20px,4vw,48px)]">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cleaners.map((cleaner) => {
            const rated = Number(cleaner.rating_count ?? 0) > 0;
            const done = Number(cleaner.bookings_count ?? 0);
            const tail = done > 0 ? bookingsLabel.replace("{n}", String(done)) : "";

            return (
              <article
                key={cleaner.id ?? cleaner.name}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-light/40">
                  {cleaner.image_full_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cleaner.image_full_path}
                      alt=""
                      className="h-16 w-16 object-cover"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8 text-ink/40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="3.4" />
                      <path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
                    </svg>
                  )}
                </span>

                {/* Left to right whatever the reader's language: these names
                    are Latin script, and a full Filipino name carries the
                    mother's surname in the middle, so it needs its room. */}
                <p className="font-semibold leading-snug text-ink" dir="ltr">
                  {cleaner.name}
                </p>

                {(cleaner.team || cleaner.zone) && (
                  <p className="-mt-2 text-sm text-muted">
                    {[cleaner.team, cleaner.zone].filter(Boolean).join(" · ")}
                  </p>
                )}

                <p className="text-sm text-ink/70">
                  {rated
                    ? `★ ${Number(cleaner.avg_rating ?? 0).toFixed(1)} (${cleaner.rating_count})${
                        tail ? ` · ${tail}` : ""
                      }`
                    : tail
                      ? `${newLabel} · ${tail}`
                      : newLabel}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
