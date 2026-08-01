import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGetList } from "@/lib/account";
import { CancelPackageButton } from "@/components/account/CancelPackageButton";

interface MyPackage {
  id: string;
  package_name: string;
  status: string;
  payment_mode: string;
  validity_months: number;
  days_per_week: number;
  total_visits: number;
  visits_consumed: number;
  visits_remaining: number;
  discount_percent: number;
  net_visit_price: number;
  total_amount: number;
  start_date: string | null;
  expire_date: string | null;
  refund_amount: number;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-primary-light text-primary-dark",
  expired: "bg-surface-soft text-muted",
  canceled: "bg-danger/10 text-danger",
};

export default async function MyPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const t = dict.booking as unknown as Record<string, string>;

  const [packages, config] = await Promise.all([
    authGetList<MyPackage>("/api/v1/customer/service-package/my", locale),
    getConfig(locale),
  ]);

  const currency = config.currency_symbol || dict.common.currency;
  const money = (n: number) => formatPrice(n, currency) ?? `${currency} 0`;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">{t.myPackages}</h1>

      {packages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-soft p-8 text-center">
          <p className="mb-4 text-muted">{t.noPackagesYet}</p>
          <Link
            href={`/${locale}/services`}
            className="inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-white"
          >
            {dict.common.backHome}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {packages.map((pkg) => {
            /* Progress is the honest headline here: a package is a balance of
               visits, and "18 of 26 left" answers the question people actually
               open this page to ask. */
            const used = pkg.total_visits > 0 ? (pkg.visits_consumed / pkg.total_visits) * 100 : 0;

            return (
              <li key={pkg.id} className="rounded-2xl border border-border bg-white p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-ink">{pkg.package_name}</h2>
                    <p className="text-sm text-muted">
                      {pkg.days_per_week} {t.daysPerWeek} · {pkg.validity_months} {t.months}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLE[pkg.status] ?? "bg-surface-soft text-muted"
                    }`}
                  >
                    {t[pkg.status] ?? pkg.status}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted">{t.visitsUsed}</span>
                    <span className="font-semibold text-ink">
                      {pkg.visits_consumed} / {pkg.total_visits}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, used)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {pkg.visits_remaining} {t.visitsRemaining}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted">{t.perVisit}</dt>
                  <dd className="text-end text-ink">{money(pkg.net_visit_price)}</dd>

                  <dt className="text-muted">{t.period}</dt>
                  <dd className="text-end text-ink">
                    {pkg.start_date} → {pkg.expire_date}
                  </dd>

                  {pkg.payment_mode === "prepaid" && (
                    <>
                      <dt className="text-muted">{t.paid}</dt>
                      <dd className="text-end text-ink">{money(pkg.total_amount)}</dd>
                    </>
                  )}

                  {pkg.status === "canceled" && pkg.refund_amount > 0 && (
                    <>
                      <dt className="text-muted">{t.refunded}</dt>
                      <dd className="text-end font-semibold text-primary-dark">
                        {money(pkg.refund_amount)}
                      </dd>
                    </>
                  )}
                </dl>

                {pkg.status === "active" && (
                  <div className="mt-4 border-t border-border pt-3">
                    <CancelPackageButton
                      packageId={pkg.id}
                      locale={locale}
                      label={t.cancelPackage}
                      confirmLabel={t.confirmCancelPackage}
                      /* Prepaid refunds are wallet credit — this platform has no
                         gateway reversal, so saying otherwise would be a promise
                         it cannot keep. */
                      note={pkg.payment_mode === "prepaid" ? t.refundGoesToWallet : t.noChargeAfterCancel}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
