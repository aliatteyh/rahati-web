import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getBlogCategories, getBlogPosts } from "@/lib/api";
import { alternatesFor } from "@/lib/seo";
import { Thumb } from "@/components/Thumb";

type Params = Promise<{ locale: string }>;
type Search = Promise<{ category?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const b = dict.blog as unknown as Record<string, string>;

  return {
    title: b.title,
    description: b.subtitle,
    alternates: alternatesFor(locale, "/blog"),
    openGraph: { title: b.title, description: b.subtitle, type: "website" },
  };
}

/** Articles exist to be found, so this page is indexed and renders on the server. */
export default async function BlogIndex({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale: raw } = await params;
  const { category } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const b = dict.blog as unknown as Record<string, string>;

  const [posts, categories] = await Promise.all([
    getBlogPosts(locale, { limit: 24, categorySlug: category }),
    getBlogCategories(locale),
  ]);

  const dateOf = (iso?: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(iso)
        )
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink">{b.title}</h1>
      <p className="mt-2 text-muted">{b.subtitle}</p>

      {/* Only categories with something published behind them are returned, so
          none of these chips leads to an empty page. */}
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/${locale}/blog`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              !category
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-border text-muted hover:border-primary"
            }`}
          >
            {b.all}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/${locale}/blog?category=${encodeURIComponent(c.slug)}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                category === c.slug
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-border text-muted hover:border-primary"
              }`}
            >
              {c.name}
              {c.blogs_count ? ` (${c.blogs_count})` : ""}
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-border bg-surface-soft p-8 text-center text-muted">
          {b.empty}
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/${locale}/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
              >
                <div className="aspect-[16/10] w-full overflow-hidden">
                  <Thumb src={post.thumbnail_full_path} alt={post.title} rounded="rounded-none" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {post.category?.name && (
                    <span className="text-xs font-semibold text-primary">{post.category.name}</span>
                  )}
                  <h2 className="mt-1 line-clamp-2 font-bold text-ink group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.meta_description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{post.meta_description}</p>
                  )}
                  <span className="mt-auto pt-3 text-xs text-muted">{dateOf(post.published_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
