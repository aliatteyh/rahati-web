import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { NearbyProvider } from "@/lib/api";
import { Thumb } from "@/components/Thumb";

/**
 * The providers who serve this customer, nearest first.
 *
 * A marketplace sells the people as much as the service — the same clean is a
 * different purchase depending on who turns up — and until now the site never
 * named any of them on the way in. Every one of these is in the customer's zone
 * and able to take another booking, so nothing here leads to a dead end.
 *
 * `distance` is only rendered when the customer's own position is known; the
 * order still improves on rating alone, and an absent figure is quieter than a
 * guessed one.
 */
export function ProviderRail({
  providers,
  locale,
  labels,
}: {
  providers: NearbyProvider[];
  locale: Locale;
  labels: { served: string; km: string; away: string };
}) {
  if (providers.length === 0) return null;

  return (
    <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {providers.map((provider) => {
        const rating = Number(provider.avg_rating ?? 0);
        const served = Number(provider.total_service_served ?? 0);
        const km = provider.distance_km;

        return (
          <Link
            key={provider.id}
            href={`/${locale}/provider/${provider.id}`}
            className="group flex w-44 shrink-0 snap-start flex-col items-center rounded-2xl border border-border bg-surface p-4 text-center transition hover:border-primary hover:shadow-md sm:w-52"
          >
            <div className="h-16 w-16 overflow-hidden rounded-full border border-border">
              <Thumb
                src={provider.logo_full_path}
                alt={provider.company_name ?? ""}
                rounded="rounded-none"
              />
            </div>

            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-ink group-hover:text-primary">
              {provider.company_name}
            </p>

            {rating > 0 && (
              <p className="mt-1 text-sm font-semibold text-ink">
                <span className="text-accent">★</span> {rating.toFixed(1)}
                {Number(provider.rating_count ?? 0) > 0 && (
                  <span className="font-normal text-muted"> ({provider.rating_count})</span>
                )}
              </p>
            )}

            {km != null && (
              <p className="mt-1 text-xs font-medium text-primary-dark">
                {/* Under a kilometre reads as "0.0 km"; round up so the nearest
                    provider is never shown as no distance at all. */}
                {km < 1 ? "< 1" : km.toFixed(km < 10 ? 1 : 0)} {labels.km} {labels.away}
              </p>
            )}

            {served > 0 && (
              <p className="mt-1 text-xs text-muted">
                {labels.served.replace("{count}", String(served))}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
