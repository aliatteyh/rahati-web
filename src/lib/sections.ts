import type { Locale } from "@/i18n/config";
import type { HomeSection } from "@/lib/types";

/**
 * Where a home section leads.
 *
 * A section holding one service opens that service straight away — the list in
 * between would be a page with a single row on it. One holding several opens
 * its list.
 */
export function sectionHref(section: HomeSection, locale: Locale): string {
  return section.service_slug
    ? `/${locale}/service/${section.service_slug}`
    : `/${locale}/subcategory/${section.slug}`;
}
