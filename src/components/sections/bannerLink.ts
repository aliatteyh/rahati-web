import type { Banner } from "@/lib/types";

/**
 * Where a banner points.
 *
 * A banner whose target has been deleted gets no link at all, rather than one
 * that lands on an error page. Shared by every surface that draws a banner, so
 * the hero and the mid-page slots cannot come to different conclusions about
 * the same row.
 */
export function bannerHref(
  banner: Banner | undefined | null,
  locale: string
): string | null {
  if (!banner) return null;

  if (banner.resource_type === "service" && banner.service?.slug) {
    return `/${locale}/service/${banner.service.slug}`;
  }

  if (banner.resource_type === "category" && banner.category?.slug) {
    return `/${locale}/category/${banner.category.slug}`;
  }

  return banner.redirect_link || null;
}
