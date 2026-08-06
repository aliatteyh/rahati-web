import Link from "next/link";
import type { Service } from "@/lib/types";
import { Thumb } from "./Thumb";
import { FavouriteButton } from "./FavouriteButton";

/**
 * A service, as it appears in a list.
 *
 * Built to a supplied design: artwork carrying its own rating and featured
 * badges, then the name, a two-line description, and the price paired with how
 * long that price buys.
 *
 * The two overlays sit on the picture rather than under it because they qualify
 * it — this service, this well rated — and because the space below is spent on
 * the two things a customer decides with: what it costs and how long it takes.
 *
 * Duration comes from the same variation that set the "from" price. A price from
 * one option beside a duration from another describes a booking nobody can make.
 */
export function ServiceCard({
  service,
  priceLabel,
  fromLabel,
  href,
  durationMinutes = null,
  minutesLabel,
  featuredLabel,
  favouriteLabel,
  locale,
}: {
  service: Service;
  priceLabel: string | null;
  fromLabel: string;
  href?: string;
  /** Minutes for the cheapest option; omitted hides the pill. */
  durationMinutes?: number | null;
  minutesLabel?: string;
  /** Shown only when the caller says this service is featured. */
  featuredLabel?: string;
  /** Both required to show the heart; omitted leaves the card as it was. */
  favouriteLabel?: string;
  locale?: string;
}) {
  const rating = Number(service.avg_rating ?? 0);

  const inner = (
    <>
      <div className="relative">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <Thumb
            src={
              service.cover_image_full_path ||
              service.thumbnail_full_path ||
              service.image_full_path
            }
            alt={service.name}
            rounded="rounded-none"
          />
        </div>

        {featuredLabel && (
          <span className="absolute top-3 end-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-sm">
            {featuredLabel}
          </span>
        )}

        {/* Opposite corner to the badge, so the two never collide on a card
            that carries both. */}
        {favouriteLabel && locale && (
          <span className="absolute top-3 start-3">
            <FavouriteButton
              serviceId={service.id}
              locale={locale as never}
              initial={Boolean(service.is_favorite)}
              label={favouriteLabel}
            />
          </span>
        )}

        {rating > 0 && (
          // A solid chip rather than text on the image: it has to stay legible
          // over whatever photograph the admin uploaded.
          <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-sm font-bold text-ink shadow-sm backdrop-blur">
            {rating.toFixed(1)}
            <span className="text-accent">★</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold text-ink group-hover:text-primary">
          {service.name}
        </h3>

        {service.short_description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
            {service.short_description}
          </p>
        )}

        {/* Pushed to the bottom so cards in a row line their prices up even when
            names and descriptions run to different lengths. */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {priceLabel && (
              <>
                <p className="text-xs text-muted">{fromLabel}</p>
                <p className="text-lg font-bold text-ink">{priceLabel}</p>
              </>
            )}
          </div>

          {durationMinutes && durationMinutes > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {durationMinutes} {minutesLabel}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const cls =
    "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-1 hover:shadow-lg";

  if (href) {
    return (
      <Link href={href} className={`group ${cls} hover:border-primary`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
