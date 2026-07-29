import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { authGetList } from "@/lib/account";
import type { Service } from "@/lib/types";
import { FavouritesClient } from "@/components/account/FavouritesClient";

export default async function FavouritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const services = await authGetList<Service>(
    "/api/v1/customer/favorite/service-list?limit=50&offset=1",
    locale
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.favourites}</h1>
      {services.length === 0 ? (
        <p className="text-sm text-muted">{a.noFavourites}</p>
      ) : (
        <FavouritesClient locale={locale} dict={a} services={services} />
      )}
    </div>
  );
}
