import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGet } from "@/lib/account";
import { InvoicePrintButton } from "@/components/account/InvoicePrintButton";

interface Detail {
  id?: string;
  service?: { name?: string; slug?: string };
  quantity?: number;
  service_cost?: number | string;
  total_cost?: number | string;
}

interface Booking {
  id?: string;
  readable_id?: string | number;
  created_at?: string;
  service_schedule?: string;
  payment_method?: string;
  service_address?: string | { address?: string } | null;
  grand_total?: number | string;
  total_booking_amount?: number | string;
  total_tax_amount?: number | string;
  total_discount_amount?: number | string;
  total_coupon_discount_amount?: number | string;
  total_campaign_discount_amount?: number | string;
  additional_charge?: number | string;
  detail?: Detail[];
  customer?: { first_name?: string; last_name?: string; phone?: string; email?: string };
}

function addr(a: Booking["service_address"]): string | null {
  if (!a) return null;
  if (typeof a === "string") return a;
  return a.address ?? null;
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const [b, config] = await Promise.all([
    authGet<Booking>(`/api/v1/customer/booking/${encodeURIComponent(id)}`, locale, {}),
    getConfig(locale),
  ]);
  const currency = config.currency_symbol || config.currency_code || "";

  if (!b || !b.id) {
    return (
      <div className="space-y-4">
        <Link href={`/${locale}/account/bookings`} className="text-sm text-primary">
          ← {a.bookings}
        </Link>
        <p className="text-sm text-muted">{a.loadError}</p>
      </div>
    );
  }

  const services = b.detail ?? [];
  const total = b.grand_total ?? b.total_booking_amount;
  const custName = [b.customer?.first_name, b.customer?.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link href={`/${locale}/account/bookings/${b.id}`} className="text-sm text-primary">
          ← {a.bookings}
        </Link>
        <InvoicePrintButton label={a.print} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-ink">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold text-ink">{a.invoice}</h1>
            <p className="mt-1 text-muted">
              #{b.readable_id} · {b.created_at?.slice(0, 10)}
            </p>
          </div>
          <div className="text-end">
            <p className="font-bold text-ink">
              {config.business_name || dict.brand}
            </p>
            {config.business_phone && <p className="text-xs text-muted">{config.business_phone}</p>}
            {config.business_email && <p className="text-xs text-muted">{config.business_email}</p>}
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-4 border-b border-border py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">{a.customerInfo}</p>
            <p className="mt-1">{custName || "—"}</p>
            {b.customer?.phone && <p className="text-xs text-muted">{b.customer.phone}</p>}
            {b.customer?.email && <p className="text-xs text-muted">{b.customer.email}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted">{a.serviceLocation}</p>
            <p className="mt-1 text-xs text-muted">{addr(b.service_address) ?? "—"}</p>
            {b.service_schedule && (
              <p className="mt-1 text-xs text-muted">
                {a.serviceScheduled}: {b.service_schedule.slice(0, 16).replace("T", " ")}
              </p>
            )}
          </div>
        </div>

        {/* Items */}
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-start text-xs uppercase text-muted">
              <th className="py-2 text-start font-semibold">{a.services}</th>
              <th className="py-2 text-center font-semibold">{a.qty}</th>
              <th className="py-2 text-end font-semibold">{a.total}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={s.id ?? i} className="border-b border-border">
                <td className="py-2">{s.service?.name ?? "—"}</td>
                <td className="py-2 text-center">{s.quantity ?? 1}</td>
                <td className="py-2 text-end">{formatPrice(s.total_cost, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 space-y-1.5">
          <IRow label={a.subtotal} value={formatPrice(b.total_booking_amount, currency)} />
          {Number(b.total_discount_amount ?? 0) > 0 && (
            <IRow label={a.discount} value={`- ${formatPrice(b.total_discount_amount, currency)}`} />
          )}
          {Number(b.total_campaign_discount_amount ?? 0) > 0 && (
            <IRow
              label={a.campaignDiscount}
              value={`- ${formatPrice(b.total_campaign_discount_amount, currency)}`}
            />
          )}
          {Number(b.total_coupon_discount_amount ?? 0) > 0 && (
            <IRow
              label={a.couponDiscount}
              value={`- ${formatPrice(b.total_coupon_discount_amount, currency)}`}
            />
          )}
          {Number(b.total_tax_amount ?? 0) > 0 && (
            <IRow label={a.tax} value={`+ ${formatPrice(b.total_tax_amount, currency)}`} />
          )}
          {Number(b.additional_charge ?? 0) > 0 && (
            <IRow label={a.serviceFee} value={`+ ${formatPrice(b.additional_charge, currency)}`} />
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>{a.total}</span>
            <span className="text-primary-dark">{formatPrice(total, currency)}</span>
          </div>
        </div>

        {b.payment_method && (
          <p className="mt-4 text-xs text-muted">
            {a.paymentMethod}: {b.payment_method.replace(/[_-]+/g, " ")}
          </p>
        )}
        <p className="mt-4 text-center text-xs text-muted">{a.invoiceThanks}</p>
      </div>
    </div>
  );
}

function IRow({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
