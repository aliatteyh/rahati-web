import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Category } from "@/lib/types";
import { Thumb } from "@/components/Thumb";

/**
 * The eight categories, on one line.
 *
 * A two-row grid of large cards pushed the actual services below the fold, and
 * the categories are a route to somewhere rather than the destination — they
 * should be taken in at a glance, not read. So: one row, image above a name,
 * each tile as wide as an eighth of the row.
 *
 * "One row" has to hold at 375px too, where an eighth of the screen is not a
 * usable target. Rather than wrap — which is the one thing this must not do —
 * the row scrolls sideways on small screens with tiles at a fixed legible width,
 * and locks into eight equal columns once there is room. Same single line
 * either way.
 *
 * The ninth tile is "see all". It sits inside the row instead of in the heading
 * because that is where someone is looking when the eight on offer are not what
 * they wanted.
 */
export function CategoryStrip({
  categories,
  locale,
  seeAllLabel,
}: {
  categories: Category[];
  locale: Locale;
  seeAllLabel: string;
}) {
  const shown = categories.slice(0, 8);
  if (shown.length === 0) return null;

  return (
    <div
      className="
        flex snap-x gap-3 overflow-x-auto pb-2
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        md:grid md:grid-cols-9 md:gap-4 md:overflow-visible md:pb-0
      "
    >
      {shown.map((category) => (
        <Link
          key={category.id}
          href={`/${locale}/category/${category.slug}`}
          className="group w-20 shrink-0 snap-start text-center sm:w-24 md:w-auto"
        >
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface transition group-hover:border-primary group-hover:shadow-md">
            <Thumb
              src={category.image_full_path}
              alt={category.name}
              rounded="rounded-none"
            />
          </div>
          {/* Two lines maximum, so one long name cannot make the row taller than
              the rest of it. */}
          <span className="mt-2 line-clamp-2 block text-xs font-medium leading-tight text-ink group-hover:text-primary sm:text-sm">
            {category.name}
          </span>
        </Link>
      ))}

      <Link
        href={`/${locale}/services`}
        className="group w-20 shrink-0 snap-start text-center sm:w-24 md:w-auto"
        aria-label={seeAllLabel}
      >
        <div className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-border bg-surface-soft text-muted transition group-hover:border-primary group-hover:text-primary">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {/* A grid of dots — "more of these", rather than an arrow, which
                would read as "next" inside a row that does not advance. */}
            <circle cx="6" cy="6" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="6" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="18" cy="6" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="18" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="18" cy="18" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <span className="mt-2 line-clamp-2 block text-xs font-medium leading-tight text-muted group-hover:text-primary sm:text-sm">
          {seeAllLabel}
        </span>
      </Link>
    </div>
  );
}
