import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";
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
    dates?: string;
  }>;
}) {
  const { locale: raw } = await params;
  const { schedule, instructions, service_type, dates } = await searchParams;
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
  const serverTotal = Number(cartResp.total_cost ?? 0);
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
        gateways={gateways.map((g) => ({ key: g.gateway ?? "", title: g.gateway_title ?? g.gateway ?? "" }))}
        cashAllowed={settings.cash_after_service !== 0}
        offlineMethods={offline.map((m) => ({
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
