import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig } from "@/lib/api";

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

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ schedule?: string; instructions?: string }>;
}) {
  const { locale: raw } = await params;
  const { schedule, instructions } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);

  const [cartResp, addresses, config, zoneId] = await Promise.all([
    authGet<CartListContent>("/api/v1/customer/cart/list?limit=50&offset=1", locale, {}),
    authGetList<Address>("/api/v1/customer/address?limit=50&offset=1", locale),
    getConfig(locale),
    getZoneId(),
  ]);

  const cart = cartResp.cart?.data ?? [];
  const serverTotal = Number(cartResp.total_cost ?? 0);
  const serviceFee = Number(cartResp.service_charge?.amount ?? config.additional_charge_fee_amount ?? 0);

  const gateways = ((config as unknown as { payment_gateways?: PaymentGateway[] })
    .payment_gateways ?? []) as PaymentGateway[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <CheckoutClient
        locale={locale}
        dict={dict.checkout as unknown as Record<string, string>}
        locationDict={dict.location as unknown as Record<string, string>}
        authDict={dict.auth as unknown as Record<string, string>}
        addressDict={dict.auth as unknown as Record<string, string>}
        currency={config.currency_symbol || config.currency_code || ""}
        cart={cart}
        addresses={addresses}
        gateways={gateways.map((g) => ({ key: g.gateway ?? "", title: g.gateway_title ?? g.gateway ?? "" }))}
        serviceFee={serviceFee}
        serverTotal={serverTotal}
        zoneId={zoneId}
        schedule={schedule ?? ""}
        instructions={instructions ?? ""}
      />
    </div>
  );
}
