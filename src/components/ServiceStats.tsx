import { formatNumber } from "@/lib/currency";

/**
 * The rating and the booking count, printed on a card's picture.
 *
 * Two facts a customer weighs before anything else: how well it is rated, and
 * how many people have actually booked it. They sit *on* the photograph, one
 * in each bottom corner, for one reason — a card in a grid must not change
 * height because a service happens to have reviews. Everything below the
 * picture keeps the room it had, and a service with neither fact simply shows
 * a plain photograph.
 *
 * Both chips are solid rather than translucent text: they have to stay legible
 * over whatever picture the panel uploaded, dark or bright.
 */
export function ServiceStats({
  rating,
  ratingCount,
  bookings,
  locale,
  dict,
}: {
  rating?: number | null;
  ratingCount?: number | null;
  bookings?: number | null;
  locale: string;
  /** `browse` — carries the four Arabic shapes of "booking". */
  dict: Record<string, string>;
}) {
  const score = Number(rating ?? 0);
  const reviews = Number(ratingCount ?? 0);
  const booked = Number(bookings ?? 0);

  if (score <= 0 && booked <= 0) return null;

  return (
    <>
      {score > 0 && (
        <span className="pointer-events-none absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[13px] font-bold text-ink shadow-sm backdrop-blur">
          <span className="text-gold">★</span>
          {formatNumber(Math.round(score * 10) / 10, locale, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          {/* How many people that score is made of. A bare 5.0 says nothing —
              it is one review as easily as two hundred. */}
          {reviews > 0 && (
            <span className="font-medium text-ink-55">({formatNumber(reviews, locale)})</span>
          )}
        </span>
      )}

      {booked > 0 && (
        <span className="pointer-events-none absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[12.5px] font-semibold text-white shadow-sm backdrop-blur">
          {/* A tick in a circle: this many visits actually happened. */}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-3 w-3"
          >
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {bookedPhrase(booked, locale, dict)}
        </span>
      )}
    </>
  );
}

/**
 * "120 bookings", and in Arabic the shape the number actually takes: one is a
 * word of its own, two is a word of its own, three to ten take the plural, and
 * eleven upwards goes back to the singular.
 *
 * Large counts are compacted — "1.2K", "١٫٢ ألف" — because the chip has a
 * corner of a photograph to live in, and the difference between 12,480 and
 * 12,500 bookings is not what the number is there to say.
 */
function bookedPhrase(value: number, locale: string, dict: Record<string, string>): string {
  const compact =
    value >= 1000
      ? formatNumber(value, locale, { notation: "compact", maximumFractionDigits: 1 })
      : formatNumber(value, locale);

  if (locale !== "ar") {
    return `${compact} ${value === 1 ? dict.bookedFew.replace(/s$/, "") : dict.bookedFew}`;
  }

  if (value === 1) return dict.bookedOne;
  if (value === 2) return dict.bookedTwo;
  if (value >= 3 && value <= 10) return `${compact} ${dict.bookedFew}`;

  return `${compact} ${dict.bookedMany}`;
}
