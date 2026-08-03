import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCampaignItems,
  getCampaigns,
  getConfig,
  formatPrice,
  serviceFromPrice,
} from "@/lib/api";
import { currencyLabel } from "@/lib/currency";

type Params = Promise<{ locale: string; id: string }>;

/** "20% off" or "AED 50 off", whichever the discount actually is. */
function discountLabel(
  amount: number,
  type: string | undefined,
  currency: string
): string {
  return type === "percent" || type === "percentage"
    ? `${amount}%`
    : `${formatPrice(amount, currency) ?? ""}`;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const campaign = (await getCampaigns(loc, 50)).find((c) => c.id === id);
  return { title: campaign?.campaign_name ?? "Campaign" };
}

export default async function CampaignPage({ params }: { params: Params }) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.campaign as unknown as Record<string, string>;

  const [campaigns, config] = await Promise.all([
    getCampaigns(locale, 50),
    getConfig(locale),
  ]);

  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) notFound();

  const currency = currencyLabel(config, locale);
  const items = await getCampaignItems(id, locale);

  // Rows carry either a service or a category; only the service ones are
  // bookable, so the rest would be a dead card.
  const services = items.map((i) => i.service).filter((s) => s != null);

  const amount = Number(campaign.discount?.discount_amount ?? 0);
  const off = discountLabel(amount, campaign.discount?.discount_amount_type, currency);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/${locale}`} className="hover:text-primary">
          {dict.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{campaign.campaign_name}</span>
      </nav>

      <header className="mb-8 overflow-hidden rounded-2xl border border-border bg-surface">
        {campaign.cover_image_full_path && (
          <img
            src={campaign.cover_image_full_path}
            alt=""
            className="max-h-64 w-full object-cover"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink">{campaign.campaign_name}</h1>
            {campaign.discount?.end_date && (
              <p className="mt-1 text-sm text-muted">
                {t.endsOn} <span dir="ltr">{campaign.discount.end_date.slice(0, 10)}</span>
              </p>
            )}
          </div>
          {amount > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">
              {off} {t.off}
            </span>
          )}
        </div>
      </header>

      {services.length === 0 ? (
        <p className="text-muted">{t.noServices}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
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
      )}
    </div>
  );
}
