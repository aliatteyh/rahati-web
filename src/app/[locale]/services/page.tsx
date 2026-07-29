import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo";
import { getCategories } from "@/lib/api";
import { CategoryCard } from "@/components/CategoryCard";
import { SectionHeader } from "@/components/SectionHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  return {
    title: dict.sections.categories,
    description: dict.sections.categoriesSub,
    alternates: alternatesFor(loc, "/services"),
    openGraph: {
      title: dict.sections.categories,
      description: dict.sections.categoriesSub,
    },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const categories = await getCategories(locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <SectionHeader
        title={dict.sections.categories}
        subtitle={dict.sections.categoriesSub}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            locale={locale}
            label={dict.category.book}
          />
        ))}
      </div>
    </div>
  );
}
