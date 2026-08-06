import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getBlogPost } from "@/lib/api";
import { absoluteUrl, alternatesFor } from "@/lib/seo";
import { Thumb } from "@/components/Thumb";
import { JsonLd } from "@/components/seo/JsonLd";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const data = await getBlogPost(slug, locale);

  if (!data) return { title: "Not found", robots: { index: false, follow: false } };

  const { blog } = data;
  // The admin writes meta separately from the article: the headline is for the
  // reader, the meta line is for the search result. Falling back to the title
  // where none was written beats an empty description.
  const title = blog.meta_title || blog.title;
  const description = blog.meta_description || blog.title;

  return {
    title,
    description,
    alternates: alternatesFor(locale, `/blog/${slug}`),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: blog.published_at ?? undefined,
      images: blog.thumbnail_full_path ? [blog.thumbnail_full_path] : undefined,
    },
  };
}

export default async function BlogPost({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const b = dict.blog as unknown as Record<string, string>;

  const data = await getBlogPost(slug, locale);
  if (!data) notFound();

  const { blog, related } = data;

  const dateOf = (iso?: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(iso)
        )
      : null;

  // Article markup so a search engine can show the headline, date and image
  // rather than guessing them out of the page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    datePublished: blog.published_at ?? undefined,
    image: blog.thumbnail_full_path ?? undefined,
    author: blog.author?.name ? { "@type": "Person", name: blog.author.name } : undefined,
    mainEntityOfPage: absoluteUrl(`/${locale}/blog/${slug}`),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd data={jsonLd} />

      <Link href={`/${locale}/blog`} className="text-sm font-semibold text-primary hover:underline">
        ← {b.title}
      </Link>

      <article className="mt-6">
        {blog.category?.name && (
          <span className="text-sm font-semibold text-primary">{blog.category.name}</span>
        )}
        <h1 className="mt-1 text-3xl font-bold leading-tight text-ink">{blog.title}</h1>

        <p className="mt-2 text-sm text-muted">
          {dateOf(blog.published_at)}
          {blog.author?.name ? ` · ${blog.author.name}` : ""}
        </p>

        {blog.thumbnail_full_path && (
          <div className="mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Thumb src={blog.thumbnail_full_path} alt={blog.title} rounded="rounded-none" />
          </div>
        )}

        {/* The body is HTML from the admin's rich-text editor. Tailwind's reset
            strips headings, lists and emphasis of their default styling, and the
            typography plugin is not installed — so the elements the editor emits
            are styled here rather than pulling in a dependency for one page. */}
        <div
          className="mt-8 leading-relaxed text-ink
            [&_p]:mb-4
            [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold
            [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-bold
            [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:ps-6
            [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:ps-6
            [&_li]:mb-1
            [&_a]:font-medium [&_a]:text-primary [&_a]:underline
            [&_strong]:font-bold
            [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-2xl
            [&_blockquote]:my-4 [&_blockquote]:border-s-4 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:text-muted
            [&_table]:my-4 [&_table]:w-full [&_table]:text-sm
            [&_td]:border [&_td]:border-border [&_td]:p-2
            [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:font-semibold"
          dangerouslySetInnerHTML={{ __html: blog.description }}
        />
      </article>

      {related.length > 0 && (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="text-xl font-bold text-ink">{b.readNext}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {related.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/${locale}/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden">
                    <Thumb src={post.thumbnail_full_path} alt={post.title} rounded="rounded-none" />
                  </div>
                  <p className="line-clamp-2 p-3 text-sm font-semibold text-ink group-hover:text-primary">
                    {post.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
