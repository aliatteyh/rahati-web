import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { authGet } from "@/lib/account";
import { InvoicePrintButton } from "@/components/account/InvoicePrintButton";
import { InvoiceCard, type InvoiceBooking } from "@/components/account/InvoiceCard";

/**
 * The receipt for one booking: fetched here, drawn by InvoiceCard.
 *
 * The way back is the bookings list, not the page this one used to sit
 * under — that page is gone, and sending a reader to it was how the old
 * design kept turning up after the new one shipped.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const [booking, config] = await Promise.all([
    authGet<InvoiceBooking & { id?: string }>(
      `/api/v1/customer/booking/${encodeURIComponent(id)}`,
      locale,
      {}
    ),
    getConfig(locale),
  ]);

  const back = (
    <Link href={`/${locale}/account/bookings`} className="text-sm text-primary">
      ← {a.bookings}
    </Link>
  );

  if (!booking || !booking.id) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm text-muted">{a.loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-3">
        {back}
        <InvoicePrintButton label={a.print} />
      </div>

      <InvoiceCard
        booking={booking}
        locale={locale}
        dict={a}
        currency={currencyLabel(config, locale)}
        business={{
          name: config.business_name || dict.brand,
          phone: config.business_phone,
          email: config.business_email,
        }}
      />
    </div>
  );
}
