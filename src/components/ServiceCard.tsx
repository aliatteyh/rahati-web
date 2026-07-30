import Link from "next/link";
import type { Service } from "@/lib/types";
import { Thumb } from "./Thumb";

export function ServiceCard({
  service,
  priceLabel,
  fromLabel,
  href,
}: {
  service: Service;
  priceLabel: string | null;
  fromLabel: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="aspect-[4/3] w-full overflow-hidden">
        <Thumb
          src={service.thumbnail_full_path || service.image_full_path || service.cover_image_full_path}
          alt={service.name}
          rounded="rounded-none"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-ink">
          {service.name}
        </h3>
        {service.avg_rating != null && Number(service.avg_rating) > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <span className="text-accent">★</span>
            <span className="font-semibold text-ink">
              {Number(service.avg_rating).toFixed(1)}
            </span>
            {service.rating_count != null && Number(service.rating_count) > 0 && (
              <span>({service.rating_count})</span>
            )}
          </p>
        )}
        {priceLabel && (
          <p className="mt-2 text-sm text-muted">
            {fromLabel} <span className="font-bold text-primary">{priceLabel}</span>
          </p>
        )}
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
