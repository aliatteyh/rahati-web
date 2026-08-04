import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { authGet } from "@/lib/account";
import { Thumb } from "@/components/Thumb";
import { CancelBookingButton } from "@/components/account/CancelBookingButton";
import { ServiceReview, type ExistingReview } from "@/components/account/ServiceReview";
import { BookingDetailTabs } from "@/components/account/BookingDetailTabs";

interface ReviewRow {
  review_rating?: number;
  review_comment?: string;
  created_at?: string;
  review_reply?: { reply?: string; reply_by_name?: string } | null;
  reviewReply?: { reply?: string; reply_by_name?: string } | null;
  review_replies?: { reply?: string; reply_by_name?: string }[] | null;
}
interface ReviewServiceRow {
  id?: string;
  reviews?: ReviewRow[];
}

interface Person {
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image_full_path?: string | null;
}

interface Detail {
  id?: string;
  service_id?: string;
  service?: { id?: string; name?: string; slug?: string };
  sub_category?: { name?: string };
  quantity?: number;
  service_cost?: number | string;
  total_cost?: number | string;
}

interface StatusHistory {
  booking_status?: string;
  created_at?: string;
  user?: Person;
}

interface Booking {
  id?: string;
  readable_id?: string | number;
  booking_status?: string;
  service_schedule?: string;
  created_at?: string;
  service_address?: string | { address?: string } | null;
  payment_method?: string;
  is_paid?: number;
  grand_total?: number | string;
  total_booking_amount?: number | string;
  total_tax_amount?: number | string;
  total_discount_amount?: number | string;
  total_coupon_discount_amount?: number | string;
  total_campaign_discount_amount?: number | string;
  additional_charge?: number | string;
  detail?: Detail[];
  customer?: Person;
  provider?: {
    id?: string;
    company_name?: string;
    name?: string;
    phone?: string;
    logo_full_path?: string | null;
    avg_rating?: number;
  };
  serviceman?: { user?: Person; avg_rating?: number };
  status_histories?: StatusHistory[];
}

function addressText(a: Booking["service_address"]): string | null {
  if (!a) return null;
  if (typeof a === "string") return a;
  return a.address ?? null;
}

function fullName(p?: Person): string {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
}

function pretty(s?: string): string {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

  const [b, config, reviewServices] = await Promise.all([
    authGet<Booking>(`/api/v1/customer/booking/${encodeURIComponent(id)}`, locale, {}),
    getConfig(locale),
    authGet<ReviewServiceRow[]>(
      `/api/v1/customer/review?booking_id=${encodeURIComponent(id)}`,
      locale,
      []
    ),
  ]);
  const currency = currencyLabel(config, locale);

  // Map serviceId -> the customer's existing review (rating, comment, reply, when).
  const reviewMap = new Map<string, { review: ExistingReview; createdAt?: string }>();
  for (const s of Array.isArray(reviewServices) ? reviewServices : []) {
    const r = s.reviews?.[0];
    if (s.id && r && r.review_rating) {
      const replyRows =
        r.review_replies && r.review_replies.length > 0
          ? r.review_replies
          : ([r.review_reply ?? r.reviewReply].filter(Boolean) as {
              reply?: string;
              reply_by_name?: string;
            }[]);
      const replies = replyRows
        .filter((x) => x && x.reply)
        .map((x) => ({ reply: x.reply ?? "", replyBy: x.reply_by_name ?? "" }));
      reviewMap.set(String(s.id), {
        review: {
          rating: Number(r.review_rating),
          comment: r.review_comment ?? "",
          replies,
        },
        createdAt: r.created_at,
      });
    }
  }
  const editStatus = Number(config.review_edit_time_status) === 1;
  const editHours = Number(config.review_edit_time ?? 0);
  const canEditReview = (createdAt?: string) => {
    if (!editStatus || editHours <= 0 || !createdAt) return false;
    const deadline = new Date(createdAt).getTime() + editHours * 3600 * 1000;
    return Date.now() < deadline;
  };

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
  const discount = Number(b.total_discount_amount ?? 0);
  const coupon = Number(b.total_coupon_discount_amount ?? 0);
  const campaign = Number(b.total_campaign_discount_amount ?? 0);
  const providerName = b.provider?.company_name || b.provider?.name || "";
  const serviceman = b.serviceman?.user;
  const statusLabel = (s?: string) => a[`status_${s}`] ?? pretty(s);

  const reviewDict = {
    submitReview: a.submitReview,
    reviewPlaceholder: a.reviewPlaceholder,
    reviewError: a.reviewError,
    processing: a.processing,
    cancel: a.cancel,
    editReview: a.editReview,
    providerReply: a.providerReply,
  };

  /* ---------------- Booking Details tab ---------------- */
  const detailsTab = (
    <div className="space-y-5">
      {/* Booking summary */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">{a.bookingSummary}</h2>
        <ul className="space-y-3">
          {services.map((s, i) => {
            const serviceId = s.service_id ?? s.service?.id;
            return (
              <li key={s.id ?? i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{s.service?.name ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {s.sub_category?.name ? `${s.sub_category.name} · ` : ""}
                      {a.qty}: {s.quantity ?? 1}
                      {s.service_cost != null
                        ? ` · ${a.unitPrice}: ${formatPrice(s.service_cost, currency)}`
                        : ""}
                    </p>
                  </div>
                  {s.total_cost != null && (
                    <span className="shrink-0 font-semibold text-ink">
                      {formatPrice(s.total_cost, currency)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {s.service?.slug && (
                    <Link
                      href={`/${locale}/service/${s.service.slug}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {a.rebook} →
                    </Link>
                  )}
                </div>
                {b.booking_status === "completed" && serviceId && b.id && (
                  <ServiceReview
                    bookingId={b.id}
                    serviceId={serviceId}
                    locale={locale}
                    dict={reviewDict}
                    existing={reviewMap.get(String(serviceId))?.review ?? null}
                    canEdit={canEditReview(reviewMap.get(String(serviceId))?.createdAt)}
                  />
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          <Row label={a.subtotal} value={formatPrice(b.total_booking_amount, currency)} />
          {discount > 0 && (
            <Row label={a.discount} value={`- ${formatPrice(discount, currency)}`} accent />
          )}
          {coupon > 0 && (
            <Row label={a.couponDiscount} value={`- ${formatPrice(coupon, currency)}`} accent />
          )}
          {campaign > 0 && (
            <Row label={a.campaignDiscount} value={`- ${formatPrice(campaign, currency)}`} accent />
          )}
          {b.total_tax_amount != null && Number(b.total_tax_amount) > 0 && (
            <Row label={a.tax} value={`+ ${formatPrice(b.total_tax_amount, currency)}`} />
          )}
          {b.additional_charge != null && Number(b.additional_charge) > 0 && (
            <Row label={a.serviceFee} value={`+ ${formatPrice(b.additional_charge, currency)}`} />
          )}
          {total != null && (
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold text-ink">
              <span>{a.total}</span>
              <span className="text-primary-dark">{formatPrice(total, currency)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Payment */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{a.paymentMethod}</h2>
          <span
            className={`text-sm font-semibold ${
              b.is_paid ? "text-primary-dark" : "text-accent-dark"
            }`}
          >
            {b.is_paid ? a.paid : a.unpaid}
          </span>
        </div>
        {b.payment_method && (
          <p className="mt-1 text-sm text-muted">{pretty(b.payment_method)}</p>
        )}
      </section>

      {/* Customer + location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">{a.customerInfo}</h2>
          <p className="mt-2 text-sm text-ink">{fullName(b.customer) || "—"}</p>
          {b.customer?.phone && <p className="text-xs text-muted">{b.customer.phone}</p>}
        </section>
        {addr && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">{a.serviceLocation}</h2>
            <p className="mt-2 text-sm text-muted">{addr}</p>
          </section>
        )}
      </div>

      {/* Provider + serviceman */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(providerName || b.provider?.phone) && (
          <section className="rounded-2xl border border-border bg-surface p-4 text-center">
            <h2 className="text-sm font-semibold text-ink">{a.providerInfo}</h2>
            <div className="mx-auto mt-3 h-16 w-16 overflow-hidden rounded-full">
              <Thumb src={b.provider?.logo_full_path} alt={providerName || "P"} rounded="rounded-full" />
            </div>
            {/* The one place the customer already meets their provider, so it
                is where a link to who they are belongs. */}
            {b.provider?.id ? (
              <Link
                href={`/${locale}/provider/${b.provider.id}`}
                className="mt-2 block text-sm font-medium text-primary hover:underline"
              >
                {providerName || "—"}
              </Link>
            ) : (
              <p className="mt-2 text-sm font-medium text-ink">{providerName || "—"}</p>
            )}
            {b.provider?.phone && <p className="text-xs text-muted">{b.provider.phone}</p>}
            {b.provider?.avg_rating != null && Number(b.provider.avg_rating) > 0 && (
              <p className="mt-1 text-xs font-medium text-accent-dark">
                ★ {Number(b.provider.avg_rating).toFixed(1)}
              </p>
            )}
          </section>
        )}
        {(fullName(serviceman) || serviceman?.phone) && (
          <section className="rounded-2xl border border-border bg-surface p-4 text-center">
            <h2 className="text-sm font-semibold text-ink">{a.serviceManInfo}</h2>
            <div className="mx-auto mt-3 h-16 w-16 overflow-hidden rounded-full">
              <Thumb
                src={serviceman?.profile_image_full_path}
                alt={fullName(serviceman) || "S"}
                rounded="rounded-full"
              />
            </div>
            <p className="mt-2 text-sm font-medium text-ink">{fullName(serviceman) || "—"}</p>
            {serviceman?.phone && <p className="text-xs text-muted">{serviceman.phone}</p>}
            {b.serviceman?.avg_rating != null && Number(b.serviceman.avg_rating) > 0 && (
              <p className="mt-1 text-xs font-medium text-accent-dark">
                ★ {Number(b.serviceman.avg_rating).toFixed(1)}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );

  /* ---------------- Status tab ---------------- */
  const histories = b.status_histories ?? [];
  const statusTab =
    histories.length === 0 ? (
      <p className="text-sm text-muted">—</p>
    ) : (
      <ol className="relative space-y-6 ps-6">
        {histories.map((h, i) => (
          <li key={i} className="relative">
            <span className="absolute -start-6 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-white">
              ✓
            </span>
            {i < histories.length - 1 && (
              <span className="absolute -start-[18px] top-6 h-full w-px bg-border" />
            )}
            <p className="text-sm font-medium text-ink">{statusLabel(h.booking_status)}</p>
            {fullName(h.user) && (
              <p className="text-xs text-muted">{fullName(h.user)}</p>
            )}
            {h.created_at && (
              <p className="text-xs text-muted">
                {h.created_at.slice(0, 16).replace("T", " ")}
              </p>
            )}
          </li>
        ))}
      </ol>
    );

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/account/bookings`} className="text-sm text-primary">
        ← {a.bookings}
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-surface-soft p-5 text-center">
        <h1 className="text-xl font-bold text-ink">#{b.readable_id ?? "—"}</h1>
        {b.created_at && (
          <p className="mt-1 text-sm text-muted">
            {a.bookingPlace}: {b.created_at.slice(0, 16).replace("T", " ")}
          </p>
        )}
        {b.service_schedule && (
          <p className="text-sm text-muted">
            {a.serviceScheduled}: {b.service_schedule.slice(0, 16).replace("T", " ")}
          </p>
        )}
        <p className="mt-1 text-sm">
          <span className="text-muted">{a.bookingStatus}: </span>
          <span className="font-semibold text-primary">{statusLabel(b.booking_status)}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {["accepted", "ongoing", "completed"].includes(b.booking_status ?? "") && b.id && (
          <Link
            href={`/${locale}/account/bookings/${b.id}/chat`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            {a.message}
          </Link>
        )}
        {["accepted", "ongoing", "completed"].includes(b.booking_status ?? "") &&
          (serviceman?.phone || b.provider?.phone) && (
            <a
              href={`tel:${serviceman?.phone || b.provider?.phone}`}
              className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light"
            >
              {a.call}
            </a>
          )}
        <Link
          href={`/${locale}/account/bookings/${b.id}/invoice`}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-primary"
        >
          {a.invoice}
        </Link>
        {b.booking_status === "pending" && b.id && (
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
        )}
      </div>

      <BookingDetailTabs
        detailsLabel={a.detailsTab}
        statusLabel={a.statusTab}
        details={detailsTab}
        status={statusTab}
      />
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
