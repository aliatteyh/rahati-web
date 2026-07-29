import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { absoluteUrl } from "@/lib/seo";
import { getCategories, getSubcategories, getServicesBySubcategory } from "@/lib/api";

/** Dynamic sitemap: static pages + all categories/subcategories/services, per locale. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = new Set<string>(["", "/services"]);

  try {
    const categories = await getCategories("en");
    categories.forEach((c) => c.slug && paths.add(`/category/${c.slug}`));

    const subLists = await Promise.all(
      categories.map((c) => (c.slug ? getSubcategories(c.slug, "en") : Promise.resolve([])))
    );
    const subs = subLists.flat();
    subs.forEach((s) => s.slug && paths.add(`/subcategory/${s.slug}`));

    const svcLists = await Promise.all(
      subs.map((s) => (s.slug ? getServicesBySubcategory(s.slug, "en", 50) : Promise.resolve([])))
    );
    svcLists.flat().forEach((svc) => svc.slug && paths.add(`/service/${svc.slug}`));
  } catch {
    /* fall back to the static paths already added */
  }

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    const languages: Record<string, string> = {};
    for (const l of locales) languages[l] = absoluteUrl(`/${l}${path}`);
    const priority = path === "" ? 1 : path.startsWith("/service/") ? 0.8 : 0.7;
    for (const l of locales) {
      entries.push({
        url: absoluteUrl(`/${l}${path}`),
        lastModified: now,
        changeFrequency: "weekly",
        priority,
        alternates: { languages },
      });
    }
  }
  return entries;
}
