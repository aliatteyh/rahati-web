import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo";
import { getCategoryBySlug, getSubcategories } from "@/lib/api";
import { CategoryCard } from "@/components/CategoryCard";
import { Thumb } from "@/components/Thumb";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const category = await getCategoryBySlug(slug, loc);
  if (!category) return { title: "Not found" };
  return {
    title: category.name,
    description: category.description || category.name,
    alternates: alternatesFor(loc, `/category/${slug}`),
    openGraph: {
      title: category.name,
      description: category.description || category.name,
      images: category.image_full_path ? [category.image_full_path] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const [category, subcategories] = await Promise.all([
    getCategoryBySlug(slug, locale),
    getSubcategories(slug, locale),
  ]);
  if (!category) notFound();

  return (
    <div>
      <section className="bg-gradient-to-b from-primary-light to-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl">
            <Thumb src={category.image_full_path} alt={category.name} />
          </div>
          <div>
            <nav className="mb-2 text-sm text-muted">
              <Link href={`/${locale}`} className="hover:text-primary">
                {dict.nav.home}
              </Link>
              <span className="mx-2">/</span>
              <Link href={`/${locale}/services`} className="hover:text-primary">
                {dict.nav.services}
              </Link>
            </nav>
            <h1 className="text-3xl font-bold text-ink sm:text-4xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-2 max-w-2xl text-muted">{category.description}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {subcategories.length > 0 ? (
          <>
            <h2 className="mb-6 text-2xl font-bold text-ink">
              {dict.category.subcategories}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {subcategories.map((sub) => (
                <CategoryCard
                  key={sub.id}
                  category={sub}
                  locale={locale}
                  label={dict.category.book}
                  basePath="subcategory"
                />
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-border bg-surface-soft p-8 text-center text-muted">
            {dict.category.noServices}
          </p>
        )}
      </div>
    </div>
  );
}
