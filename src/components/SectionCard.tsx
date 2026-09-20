import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { HomeSection } from "@/lib/types";
import { sectionHref } from "@/lib/sections";
import { Thumb } from "./Thumb";

/**
 * One of the panel's sections, as a card.
 *
 * The same destination rule as the home strip: a section holding one service
 * opens it, one holding several opens its list.
 */
export function SectionCard({
  section,
  locale,
  label,
}: {
  section: HomeSection;
  locale: Locale;
  label: string;
}) {
  return (
    <Link
      href={sectionHref(section, locale)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        <Thumb src={section.image_full_path} alt={section.name} rounded="rounded-none" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold text-ink group-hover:text-primary">
          {section.name}
        </h3>
        {section.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {section.description}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {label}
          <svg
            className="rtl-flip h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
