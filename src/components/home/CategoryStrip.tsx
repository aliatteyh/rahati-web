import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { HomeSection } from "@/lib/types";
import { sectionHref } from "@/lib/sections";
import { Thumb } from "@/components/Thumb";

/**
 * The categories, on one line.
 *
 * A two-row grid of large cards pushed the actual services below the fold, and
 * the categories are a route to somewhere rather than the destination — they
 * should be taken in at a glance, not read. So: one row, image above a name,
 * each tile a seventh of the row — wide enough to read at arm's length.
 *
 * "One row" has to hold at 375px too, where an eighth of the screen is not a
 * usable target. Rather than wrap — which is the one thing this must not do —
 * the row scrolls sideways on small screens with tiles at a fixed legible width,
 * and locks into seven equal columns once there is room. Same single line
 * either way.
 *
 * The tiles are the panel's sections, in the panel's order, and all of them are
 * shown: there are a handful, not a catalogue, and hiding one behind a "see
 * all" tile would hide a quarter of what the business sells.
 */
export function CategoryStrip({
  sections,
  locale,
}: {
  sections: HomeSection[];
  locale: Locale;
}) {
  if (sections.length === 0) return null;

  return (
    <div
      className="
        flex snap-x gap-3 overflow-x-auto pb-2
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:pb-0
      "
    >
      {sections.map((section) => (
        <Link
          key={section.id}
          href={sectionHref(section, locale)}
          className="group w-[6.5rem] shrink-0 snap-start text-center sm:w-[7.75rem] md:w-auto"
        >
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface transition group-hover:border-primary group-hover:shadow-md">
            <Thumb
              src={section.image_full_path}
              alt={section.name}
              rounded="rounded-none"
            />
          </div>
          {/* Two lines maximum, so one long name cannot make the row taller than
              the rest of it. */}
          <span className="mt-2.5 line-clamp-2 block text-sm font-semibold leading-tight text-ink group-hover:text-primary sm:text-base">
            {section.name}
          </span>
        </Link>
      ))}

    </div>
  );
}
