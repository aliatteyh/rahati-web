import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { authGet, authGetList } from "@/lib/account";
import { ProfileClient } from "@/components/account/ProfileClient";

interface CustomerInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}
interface Address {
  id?: number;
  address?: string;
  address_label?: string;
  city?: string;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const [info, addresses] = await Promise.all([
    authGet<CustomerInfo>("/api/v1/customer/info", locale, {}),
    authGetList<Address>("/api/v1/customer/address?limit=50&offset=1", locale),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink">{a.profile}</h1>

      <ProfileClient
        locale={locale}
        dict={a}
        authDict={dict.auth as unknown as Record<string, string>}
        initial={{
          first_name: info.first_name ?? "",
          last_name: info.last_name ?? "",
          email: info.email ?? "",
          phone: info.phone ?? "",
        }}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">{a.addresses}</h2>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted">{a.noAddresses}</p>
        ) : (
          <ul className="space-y-3">
            {addresses.map((addr, i) => (
              <li
                key={addr.id ?? i}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
              >
                {addr.address_label && (
                  <span className="me-2 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
                    {addr.address_label}
                  </span>
                )}
                <span className="text-ink">{addr.address}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
