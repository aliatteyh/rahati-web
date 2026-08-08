import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fetchCartQuote, getConfig } from "@/lib/api";
import { currencyLabel } from "@/lib/currency";

// Transactional page — not indexable.
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { authGet, authGetList } from "@/lib/account";
import { getZoneId } from "@/lib/zone";
import { CheckoutClient, type CartItem, type Address } from "@/components/checkout/CheckoutClient";

interface CartListContent {
  cart?: { data?: CartItem[] };
  total_cost?: number;
  service_charge?: { amount?: number };
}

interface PaymentGateway {
  gateway?: string;
  gateway_title?: string;
}

/** An admin-defined way to pay outside the system — a bank transfer, a sent link. */
interface OfflineMethod {
  id?: string;
  method_name?: string;
  payment_information?: { title?: string; data?: string }[];
  customer_information?: { field_name?: string; is_required?: boolean }[];
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    schedule?: string;
    instructions?: string;
    service_type?: string;
    /** "prepaid" when the customer chose to pay the whole package upfront. */
    pay?: string;
    dates?: string;
  }>;
}) {
  const { locale: raw } = await params;
  const { schedule, instructions, service_type, dates, pay } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const [cartResp, addresses, config, zoneId, offlineMethods] = await Promise.all([
    authGet<CartListContent>("/api/v1/customer/cart/list?limit=50&offset=1", locale, {}),
    authGetList<Address>("/api/v1/customer/address?limit=50&offset=1", locale),
    getConfig(locale),
    getZoneId(),
    authGetList<OfflineMethod>("/api/v1/customer/offline-payment/methods?limit=50&offset=1", locale),
  ]);

  const cart = cartResp.cart?.data ?? [];

  // The cart knows one visit; a subscription is twenty.
  //
  // `cart.total_cost` is the sum of the lines, and a line is priced per visit —
  // it has no idea the booking repeats. Checkout was showing that single-visit
  // figure while the wizard showed the package total and the server charged the
  // package total, so the last screen before paying was the one screen with the
  // wrong number on it. Ask the same calculator the server bills from.
  let serverTotal = Number(cartResp.total_cost ?? 0);

  const visitDates: string[] = (() => {
    if (service_type !== "repeat" || !dates) return [];
    try {
      const parsed = JSON.parse(dates) as { date?: string }[] | string[];
      return parsed
        .map((d) => (typeof d === "string" ? d : d?.date ?? ""))
        .filter(Boolean);
    } catch {
      return [];
    }
  })();

  if (visitDates.length > 0) {
    const quote = await fetchCartQuote(visitDates, locale);
    if (quote && quote.grand_total > 0) serverTotal = quote.grand_total;
  }
  const serviceFee = Number(cartResp.service_charge?.amount ?? config.additional_charge_fee_amount ?? 0);

  const settings = config as unknown as {
    payment_gateways?: PaymentGateway[];
    digital_payment?: number;
    cash_after_service?: number;
    offline_payment?: number;
  };

  // Each of the three families is admin-switched independently, so a gateway
  // that is configured but whose family is off must not be offered.
  const gateways = settings.digital_payment ? settings.payment_gateways ?? [] : [];
  const offline = settings.offline_payment ? offlineMethods : [];

  // A prepaid package is paid before any work starts, so "cash after service"
  // is not a slower way to pay it — it is a contradiction. The server already
  // refuses that combination and quietly downgrades the purchase to
  // pay-per-visit; offering the option here would let someone choose upfront
  // payment and receive something else.
  const prepaid = pay === "prepaid";

  // The mirror of the rule above. "Pay per visit" means the money is collected
  // as each visit happens — but the payment intent is built from the booking
  // total and knows nothing about packages, so paying by card took the entire
  // package on the spot: AED 585 charged where AED 142 was agreed. Until each
  // visit can be charged on completion, the only method that honours the
  // promise is cash after service.
  const perVisitPackage = pay === "per_visit";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <CheckoutClient
        locale={locale}
        dict={dict.checkout as unknown as Record<string, string>}
        locationDict={dict.location as unknown as Record<string, string>}
        authDict={dict.auth as unknown as Record<string, string>}
        addressDict={dict.auth as unknown as Record<string, string>}
        currency={currencyLabel(config, locale)}
        cart={cart}
        addresses={addresses}
        gateways={perVisitPackage ? [] : gateways.map((g) => ({ key: g.gateway ?? "", title: g.gateway_title ?? g.gateway ?? "" }))}
        cashAllowed={!prepaid && settings.cash_after_service !== 0}
        offlineMethods={(perVisitPackage ? [] : offline).map((m) => ({
          id: String(m.id ?? ""),
          name: m.method_name ?? "",
          info: (m.payment_information ?? []).map((i) => ({
            title: i.title ?? "",
            data: i.data ?? "",
          })),
          fields: (m.customer_information ?? []).map((f) => ({
            name: f.field_name ?? "",
            required: Boolean(f.is_required),
          })),
        }))}
        serviceFee={serviceFee}
        vatPercent={Number(config.vat_percentage ?? 0)}
        serverTotal={serverTotal}
        zoneId={zoneId}
        schedule={schedule ?? ""}
        instructions={instructions ?? ""}
        serviceType={service_type === "repeat" ? "repeat" : "regular"}
        dates={dates ?? ""}
      />
    </div>
  );
}
