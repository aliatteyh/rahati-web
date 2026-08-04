import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatPrice, getConfig, searchServices, serviceFromPrice } from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { SearchBox } from "@/components/search/SearchBox";

type Params = Promise<{ locale: string }>;
type Search = Promise<{ q?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "en");
  return {
    title: dict.search.title,
    // Results pages are query-driven and endless; indexing them would flood the
    // site's footprint with near-empty duplicates of the category pages.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { locale: raw } = await params;
  const { q = "" } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.search as unknown as Record<string, string>;

  const query = q.trim();
  const [results, config] = await Promise.all([
    searchServices(query, locale),
    getConfig(locale),
  ]);
  const currency = currencyLabel(config, locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{t.title}</h1>

      <SearchBox locale={locale} initial={query} placeholder={t.placeholder} label={t.submit} />

      {query === "" ? (
        <p className="mt-8 text-muted">{t.prompt}</p>
      ) : results.length === 0 ? (
        <div className="mt-8">
          <p className="text-muted">{t.noResults.replace("{q}", query)}</p>
          <Link
            href={`/${locale}/services`}
            className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {t.browseAll}
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {t.resultCount.replace("{count}", String(results.length)).replace("{q}", query)}
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((service) => {
              const from = serviceFromPrice(service);
              return (
                <li key={service.id}>
                  <Link
                    href={`/${locale}/service/${service.slug}`}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary"
                  >
                    {service.thumbnail_full_path && (
                      <img
                        src={service.thumbnail_full_path}
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col justify-between gap-2 p-4">
                      <span className="font-semibold text-ink">{service.name}</span>
                      {from > 0 && (
                        <span className="text-sm text-muted">
                          {dict.service.from}{" "}
                          <span className="font-bold text-primary-dark">
                            {formatPrice(from, currency)}
                          </span>
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
