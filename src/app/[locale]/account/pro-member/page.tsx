import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGet } from "@/lib/account";
import { SubscribeButton } from "@/components/subscription/SubscribeButton";

interface Plan {
  id: string;
  plan_name?: string;
  type?: string;
  duration_days?: number;
  price?: number | string;
  is_active?: number;
  is_subscribed?: number;
}

interface Benefits {
  discount?: { status?: number; discount?: number; up_to_amount?: number };
  coupon?: { status?: number };
  service_fee?: {
    status?: number;
    type?: string;
    discount_percent?: number;
    label?: string;
  };
}

interface Faq {
  id?: string;
  question?: string;
  answer?: string;
}

interface Details {
  plans?: Plan[];
  benefits?: Benefits;
  faqs?: Faq[];
}

export default async function ProMemberPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const [details, config] = await Promise.all([
    authGet<Details>("/api/v1/customer/subscription/details", locale, {}),
    getConfig(locale),
  ]);
  const currency = config.currency_symbol || config.currency_code || "";
  const plans = (details.plans ?? []).filter((p) => p.is_active !== 0);
  const b = details.benefits ?? {};
  const faqs = details.faqs ?? [];

  const benefitLines: string[] = [];
  if (b.discount?.status) {
    const pct = b.discount.discount ?? 0;
    benefitLines.push(
      b.discount.up_to_amount
        ? `${a.benefitDiscountUpTo.replace("{pct}", String(pct)).replace("{cap}", formatPrice(b.discount.up_to_amount, currency) ?? "")}`
        : a.benefitDiscount.replace("{pct}", String(pct))
    );
  }
  if (b.coupon?.status) benefitLines.push(a.benefitCoupon);
  if (b.service_fee?.status) {
    const label = b.service_fee.label || a.benefitServiceFeeLabel;
    benefitLines.push(
      b.service_fee.type === "full_free"
        ? a.benefitServiceFeeFree.replace("{label}", label)
        : a.benefitServiceFeeOff
            .replace("{pct}", String(b.service_fee.discount_percent ?? 0))
            .replace("{label}", label)
    );
  }

  const subDict = {
    subscribe: a.subscribe,
    startTrial: a.startTrial,
    processing: a.processing,
    confirmWallet: a.confirmWallet,
    cancel: a.cancel,
    subscribeError: a.subscribeError,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">{a.proMember}</h1>
        <p className="mt-1 text-sm text-muted">{a.proMemberSub}</p>
      </div>

      {/* Benefits */}
      {benefitLines.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-primary-light/30 p-5">
          <h2 className="text-lg font-semibold text-ink">{a.proBenefits}</h2>
          <ul className="mt-3 space-y-2">
            {benefitLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-0.5 text-primary">✓</span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Plans */}
      {plans.length === 0 ? (
        <p className="text-sm text-muted">{a.noPlans}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((p) => {
            const subscribed = p.is_subscribed === 1;
            const isTrial = p.type === "free_trial";
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 ${
                  subscribed
                    ? "border-primary bg-primary-light/20"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{p.plan_name}</h3>
                  {isTrial && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-dark">
                      {a.freeTrial}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-primary-dark">
                  {isTrial ? a.free : formatPrice(p.price, currency) ?? `${p.price} ${currency}`}
                </p>
                {p.duration_days != null && (
                  <p className="mt-1 text-xs text-muted">
                    {a.duration}: {p.duration_days} {a.days}
                  </p>
                )}
                {subscribed ? (
                  <div className="mt-3 rounded-xl bg-primary/10 py-2 text-center text-sm font-semibold text-primary-dark">
                    {a.currentPlan}
                  </div>
                ) : (
                  <SubscribeButton
                    planId={p.id}
                    isFreeTrial={isTrial}
                    locale={locale}
                    dict={subDict}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">{a.faq}</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {faqs.map((f, i) => (
              <details key={f.id ?? i} className="group px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-ink">
                  {f.question}
                </summary>
                {f.answer && <p className="mt-2 text-sm text-muted">{f.answer}</p>}
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
