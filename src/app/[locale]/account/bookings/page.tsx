import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGetList } from "@/lib/account";
import { CancelBookingButton } from "@/components/account/CancelBookingButton";

interface Booking {
  id?: string;
  readable_id?: string | number;
  booking_status?: string;
  grand_total?: number | string;
  total_booking_amount?: number | string;
  total_amount?: number | string;
  created_at?: string;
  detail?: { service?: { name?: string } }[] | null;
  serviceman?: {
    user?: { first_name?: string; last_name?: string; phone?: string } | null;
  } | null;
  provider?: { phone?: string; company_name?: string } | null;
}

function fullName(p?: { first_name?: string; last_name?: string } | null): string {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
}

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;
  const cancelDict = {
    cancelBooking: a.cancelBooking,
    cancelling: a.cancelling,
    confirmCancel: a.confirmCancel,
    keep: a.keep,
    cancelError: a.cancelError,
  };

  const [bookings, config] = await Promise.all([
    authGetList<Booking>(
      "/api/v1/customer/booking?limit=20&offset=1&booking_status=all&service_type=all",
      locale
    ),
    getConfig(locale),
  ]);
  const currency = config.currency_symbol || config.currency_code || "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.bookings}</h1>

      {bookings.length === 0 ? (
        <p className="text-sm text-muted">{a.noBookings}</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b, i) => {
            const total = b.grand_total ?? b.total_booking_amount ?? b.total_amount;
            const services = (b.detail ?? [])
              .map((d) => d.service?.name)
              .filter(Boolean) as string[];
            const serviceLabel =
              services.length > 1 ? `${services[0]} +${services.length - 1}` : services[0];
            const servicemanName = fullName(b.serviceman?.user);
            const callPhone = b.serviceman?.user?.phone || b.provider?.phone;
            const canContact = ["accepted", "ongoing", "completed"].includes(
              b.booking_status ?? ""
            );
            const summary = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-ink">
                      #{b.readable_id ?? "—"}
                    </span>
                    {serviceLabel && (
                      <p className="mt-0.5 truncate text-sm text-ink">{serviceLabel}</p>
                    )}
                    {servicemanName && (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        👤 {servicemanName}
                      </p>
                    )}
                  </div>
                  {b.booking_status && (
                    <span className="shrink-0 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark">
                      {b.booking_status}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted">
                  <span>{b.created_at?.slice(0, 10)}</span>
                  {total != null && (
                    <span className="font-semibold text-ink">
                      {formatPrice(total, currency)}
                    </span>
                  )}
                </div>
              </>
            );
            return (
              <li
                key={b.id ?? i}
                className="rounded-2xl border border-border bg-surface px-4 py-4"
              >
                {b.id ? (
                  <Link
                    href={`/${locale}/account/bookings/${b.id}`}
                    className="block transition hover:opacity-80"
                  >
                    {summary}
                  </Link>
                ) : (
                  summary
                )}
                {(canContact || b.booking_status === "pending") && b.id && (
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {canContact && (
                      <Link
                        href={`/${locale}/account/bookings/${b.id}/chat`}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark"
                      >
                        {a.message}
                      </Link>
                    )}
                    {canContact && callPhone && (
                      <a
                        href={`tel:${callPhone}`}
                        className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-light"
                      >
                        {a.call}
                      </a>
                    )}
                    {b.booking_status === "pending" && (
                      <CancelBookingButton
                        bookingId={b.id}
                        locale={locale}
                        dict={cancelDict}
                      />
                    )}
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
