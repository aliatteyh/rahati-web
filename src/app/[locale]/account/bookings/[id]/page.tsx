import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGet } from "@/lib/account";
import { CancelBookingButton } from "@/components/account/CancelBookingButton";
import { ReviewForm } from "@/components/account/ReviewForm";

interface Detail {
  id?: string;
  service_id?: string;
  service?: { id?: string; name?: string };
  quantity?: number;
  total_cost?: number | string;
}

interface Booking {
  id?: string;
  readable_id?: string | number;
  booking_status?: string;
  service_schedule?: string;
  created_at?: string;
  service_address?: string | { address?: string } | null;
  grand_total?: number | string;
  total_booking_amount?: number | string;
  total_tax_amount?: number | string;
  total_discount_amount?: number | string;
  total_coupon_discount_amount?: number | string;
  detail?: Detail[];
}

function addressText(a: Booking["service_address"]): string | null {
  if (!a) return null;
  if (typeof a === "string") return a;
  return a.address ?? null;
}

export default async function BookingDetailPage({
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
  const addr = addressText(b.service_address);
  const total = b.grand_total ?? b.total_booking_amount;
  const discount =
    Number(b.total_discount_amount ?? 0) + Number(b.total_coupon_discount_amount ?? 0);

  const reviewDict = {
    rate: a.rate,
    submitReview: a.submitReview,
    reviewPlaceholder: a.reviewPlaceholder,
    reviewThanks: a.reviewThanks,
    reviewError: a.reviewError,
    processing: a.processing,
    cancel: a.cancel,
  };

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/account/bookings`} className="text-sm text-primary">
        ← {a.bookings}
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">#{b.readable_id ?? "—"}</h1>
        {b.booking_status && (
          <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark">
            {b.booking_status}
          </span>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
        {b.service_schedule && (
          <div className="flex justify-between gap-3">
            <span className="text-muted">{a.schedule}</span>
            <span className="text-ink">{b.service_schedule.slice(0, 16).replace("T", " ")}</span>
          </div>
        )}
        {addr && (
          <div className="flex justify-between gap-3">
            <span className="shrink-0 text-muted">{a.address}</span>
            <span className="text-end text-ink">{addr}</span>
          </div>
        )}
        {b.created_at && (
          <div className="flex justify-between gap-3">
            <span className="text-muted">{a.bookedOn}</span>
            <span className="text-ink">{b.created_at.slice(0, 10)}</span>
          </div>
        )}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">{a.services}</h2>
          <ul className="space-y-2">
            {services.map((s, i) => {
              const serviceId = s.service_id ?? s.service?.id;
              return (
                <li key={s.id ?? i} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink">
                      {s.service?.name ?? "—"}
                      {s.quantity ? ` × ${s.quantity}` : ""}
                    </span>
                    {s.total_cost != null && (
                      <span className="font-semibold text-ink">
                        {formatPrice(s.total_cost, currency)}
                      </span>
                    )}
                  </div>
                  {b.booking_status === "completed" && serviceId && b.id && (
                    <ReviewForm
                      bookingId={b.id}
                      serviceId={serviceId}
                      locale={locale}
                      dict={reviewDict}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Payment summary */}
      <section className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
        <h2 className="mb-1 text-lg font-semibold text-ink">{a.paymentSummary}</h2>
        {b.total_booking_amount != null && (
          <Row label={a.subtotal} value={formatPrice(b.total_booking_amount, currency)} />
        )}
        {discount > 0 && (
          <Row label={a.discount} value={`- ${formatPrice(discount, currency)}`} accent />
        )}
        {b.total_tax_amount != null && Number(b.total_tax_amount) > 0 && (
          <Row label={a.tax} value={`+ ${formatPrice(b.total_tax_amount, currency)}`} />
        )}
        {total != null && (
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold text-ink">
            <span>{a.total}</span>
            <span className="text-primary-dark">{formatPrice(total, currency)}</span>
          </div>
        )}
      </section>

      {b.booking_status === "pending" && b.id && (
        <div className="flex justify-end">
          <CancelBookingButton
            bookingId={b.id}
            locale={locale}
            dict={{
              cancelBooking: a.cancelBooking,
              cancelling: a.cancelling,
              confirmCancel: a.confirmCancel,
              keep: a.keep,
              cancelError: a.cancelError,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  if (value == null) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={accent ? "text-accent-dark" : "text-ink"}>{value}</span>
    </div>
  );
}
