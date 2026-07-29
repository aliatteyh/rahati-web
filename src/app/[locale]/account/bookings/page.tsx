import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { authGetList } from "@/lib/account";

interface Booking {
  id?: string;
  readable_id?: string | number;
  booking_status?: string;
  grand_total?: number | string;
  total_booking_amount?: number | string;
  total_amount?: number | string;
  created_at?: string;
  service_name?: string;
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
            return (
              <li
                key={b.id ?? i}
                className="rounded-2xl border border-border bg-surface px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">
                    #{b.readable_id ?? "—"}
                  </span>
                  {b.booking_status && (
                    <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
