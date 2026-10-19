import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { authGet, authGetList } from "@/lib/account";
import { BookingsClient } from "@/components/account/bookings/BookingsClient";
import type { PlanSummary } from "@/components/account/bookings/types";
import { toRows, type ApiBooking } from "@/components/account/bookings/normalise";

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
    authGetList<ApiBooking>(
      "/api/v1/customer/booking?limit=30&offset=1&booking_status=all&service_type=all",
      locale
    ),
    getConfig(locale),
  ]);

  const rows = toRows(bookings);

  // The office's own cancellation window, read from settings rather than
  // written here: it is policy, it differs between servers, and the sentence
  // the customer reads must be the rule the server enforces.
  const cancelNoticeHours = Number(
    (config as unknown as Record<string, unknown>)?.booking_cancel_notice_hours ?? 24
  ) || 24;

  const rescheduleNoticeHours = Number(
    (config as unknown as Record<string, unknown>)?.visit_reschedule_notice_hours ?? 24
  ) || 24;

  // Each plan answered by the server rather than assembled from the list: the
  // days, what one visit costs, how many are left, and what may be done to
  // each of them. Fetched here so the page arrives drawn — a plan card that
  // fills in after the fact flickers through "0 of 0".
  const planIds = rows.filter((row) => row.isPlan).map((row) => row.id);
  const summaries = await Promise.all(
    planIds.map((id) =>
      authGet<PlanSummary | null>(`/api/v1/customer/booking/plan/${id}`, locale, null)
    )
  );

  const plans: Record<string, PlanSummary> = {};
  summaries.forEach((summary, index) => {
    if (summary && Array.isArray(summary.visits)) {
      plans[planIds[index]] = summary;
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.bookings}</h1>
      <BookingsClient
        locale={locale}
        dict={a}
        currency={currencyLabel(config, locale)}
        rows={rows}
        plans={plans}
        bookHref={`/${locale}/services`}
        cancelNoticeHours={cancelNoticeHours}
        rescheduleNoticeHours={rescheduleNoticeHours}
      />
    </div>
  );
}
