import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/currency";

/**
 * The receipt itself, with nothing fetched inside it.
 *
 * Split out so it can be rendered against a known booking while it is being
 * designed — the page around it needs a signed-in session, which a screenshot
 * does not have.
 */
export interface InvoiceBooking {
  readable_id?: string | number;
  created_at?: string;
  service_schedule?: string;
  duration_minutes?: number | null;
  payment_method?: string;
  is_paid?: number;
  service_address_location?: string | null;
  total_booking_amount?: number | string;
  total_tax_amount?: number | string;
  total_discount_amount?: number | string;
  total_coupon_discount_amount?: number | string;
  total_campaign_discount_amount?: number | string;
  total_addon_amount?: number | string;
  total_material_charge?: number | string;
  extra_fee?: number | string;
  additional_charge?: number | string;
  tip_amount?: number | string;
  detail?: {
    service?: { name?: string } | null;
    service_name?: string;
    professional_count?: number;
    material_charge?: number | string;
    add_on_total?: number | string;
  }[];
  customer?: { first_name?: string; last_name?: string };
}

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function InvoiceCard({
  booking,
  locale,
  dict: a,
  currency,
  business,
}: {
  booking: InvoiceBooking;
  locale: Locale;
  dict: Record<string, string>;
  currency: string;
  business: { name: string; phone?: string; email?: string };
}) {
  const money = (value: number) =>
    `${currency} ${formatNumber(value, locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const line = booking.detail?.[0];
  const total = num(booking.total_booking_amount);
  const fee = num(booking.extra_fee) || num(booking.additional_charge);
  const tax = num(booking.total_tax_amount);
  const tip = num(booking.tip_amount);
  const discount =
    num(booking.total_discount_amount) +
    num(booking.total_campaign_discount_amount) +
    num(booking.total_coupon_discount_amount);
  const materials = num(booking.total_material_charge) || num(line?.material_charge);
  const addOns = num(booking.total_addon_amount) || num(line?.add_on_total);
  // What the work itself came to: the total less everything added on top of
  // it. Taken this way round because the stored line cost is before the
  // professionals' discount, and a receipt whose rows do not add up to its
  // own total is worse than one with fewer rows.
  const work = Math.max(0, total - fee - tax - tip);

  const customer = [booking.customer?.first_name, booking.customer?.last_name]
    .filter(Boolean)
    .join(" ");
  const address = parseAddress(booking.service_address_location);

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-ink">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{a.invoice}</h1>
          <p className="mt-1 font-mono text-xs text-muted">#{booking.readable_id}</p>
        </div>
        <div className="text-end">
          <p className="font-bold">{business.name}</p>
          {business.phone && <p className="text-xs text-muted">{business.phone}</p>}
          {business.email && <p className="text-xs text-muted">{business.email}</p>}
        </div>
      </div>

      {/* Paid or not, said once and plainly: it is the question a receipt is
          usually fetched to answer. */}
      <p
        className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          Number(booking.is_paid) === 1
            ? "bg-primary-light text-primary-dark"
            : "bg-sand text-sand-ink"
        }`}
      >
        {Number(booking.is_paid) === 1 ? a.paid : a.unpaid}
      </p>

      <dl className="mt-5 rounded-2xl bg-surface-soft p-4">
        <Row label={a.services} value={line?.service?.name ?? line?.service_name ?? ""} />
        <Row label={a.when} value={stamp(booking.service_schedule, locale)} />
        {num(booking.duration_minutes) > 0 && (
          <Row label={a.duration} value={hours(num(booking.duration_minutes), a)} />
        )}
        <Row
          label={a.cleanersLabel}
          value={(Number(line?.professional_count ?? 1) === 1
            ? a.cleanerOne
            : a.cleanersMany
          ).replace("{n}", String(line?.professional_count ?? 1))}
        />
        <Row label={a.materials} value={materials > 0 ? a.withMaterials : a.withoutMaterials} />
        <Row label={a.address} value={address} />
        <Row label={a.customerInfo} value={customer} />
        <Row label={a.bookedOn} value={stamp(booking.created_at, locale)} />
      </dl>

      <dl className="mt-4 px-1">
        <Row label={a.subtotal} value={money(work)} />
        {addOns > 0 && <Row label={a.addOns} value={money(addOns)} />}
        {fee > 0 && <Row label={a.serviceFee} value={money(fee)} />}
        {tip > 0 && <Row label={a.tip} value={money(tip)} />}
        {tax > 0 && <Row label={a.tax} value={money(tax)} />}
        {discount > 0 && <Row label={a.discount} value={`- ${money(discount)}`} />}
        <Row
          label={a.paymentMethod}
          value={
            a[`pay_${booking.payment_method ?? ""}`] ??
            (booking.payment_method ?? "").replace(/[_-]+/g, " ")
          }
        />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-base font-bold">
          <span>{a.total}</span>
          <span dir="auto" className="text-primary-dark">
            {money(total)}
          </span>
        </div>
      </dl>

      <p className="mt-5 text-center text-xs text-muted">{a.invoiceThanks}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd dir="auto" className="text-end font-medium">
        {value}
      </dd>
    </div>
  );
}

/** "Mon, 19 Oct 2026 · 10:00 AM", in the reader's own calendar wording. */
function stamp(value: string | undefined | null, locale: Locale): string {
  if (!value) return "";

  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";

  const tag = locale === "ar" ? "ar-AE-u-nu-latn" : "en-US";
  const day = new Intl.DateTimeFormat(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" }).format(date);

  return `${day} · ${time}`;
}

/** The length in hours, with the Arabic forms the rest of the site uses. */
function hours(minutes: number, a: Record<string, string>): string {
  const count = minutes / 60;
  if (count <= 0) return "";

  const figure = Number.isInteger(count) ? String(count) : String(Math.round(count * 10) / 10);
  const word =
    count === 1 ? a.hourWord : count === 2 ? a.hoursTwo : count <= 10 ? a.hoursFew : a.hoursMany;

  return `${figure} ${word ?? ""}`.trim();
}

/** The address snapshot the booking carries, as one readable line. */
function parseAddress(stored?: string | null): string {
  if (!stored) return "";

  try {
    const raw = JSON.parse(stored) as Record<string, string | null>;
    const parts = [raw.building_name, raw.house, raw.floor, raw.city]
      .map((part) => (part ?? "").trim())
      .filter(Boolean);

    return parts.length > 0 ? parts.join(" · ") : (raw.address ?? "");
  } catch {
    return "";
  }
}
