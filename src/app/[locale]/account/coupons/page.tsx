import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGetList } from "@/lib/account";

interface Coupon {
  id?: string;
  coupon_code?: string;
  title?: string;
  discount?: {
    discount_amount?: number | string;
    discount_amount_type?: string;
    min_purchase?: number | string;
  };
  discount_amount?: number | string;
  discount_amount_type?: string;
  min_purchase?: number | string;
  expire_date?: string;
  end_date?: string;
}

export default async function CouponsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const [coupons, config] = await Promise.all([
    authGetList<Coupon>("/api/v1/customer/coupon?limit=100&offset=1", locale),
    getConfig(locale),
  ]);
  const currency = config.currency_symbol || config.currency_code || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.coupons}</h1>

      {coupons.length === 0 ? (
        <p className="text-sm text-muted">{a.noCoupons}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {coupons.map((c, i) => {
            const amount = c.discount?.discount_amount ?? c.discount_amount;
            const type = c.discount?.discount_amount_type ?? c.discount_amount_type;
            const minP = c.discount?.min_purchase ?? c.min_purchase;
            const label =
              type === "percent"
                ? `${amount}% ${a.off}`
                : `${formatPrice(amount, currency)} ${a.off}`;
            const expiry = c.expire_date ?? c.end_date;
            return (
              <li
                key={c.id ?? i}
                className="rounded-2xl border border-dashed border-primary/50 bg-primary-light/30 p-4"
              >
                <div className="text-lg font-bold text-primary-dark">{label}</div>
                {c.title && <p className="mt-1 text-sm text-ink">{c.title}</p>}
                {c.coupon_code && (
                  <div className="mt-3 inline-block rounded-lg border border-primary/40 bg-surface px-3 py-1 font-mono text-sm font-semibold tracking-wider text-primary-dark">
                    {c.coupon_code}
                  </div>
                )}
                <div className="mt-2 space-y-0.5 text-xs text-muted">
                  {minP != null && Number(minP) > 0 && (
                    <p>
                      {a.minSpend}: {formatPrice(minP, currency)}
                    </p>
                  )}
                  {expiry && (
                    <p>
                      {a.expires}: {expiry.slice(0, 10)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
