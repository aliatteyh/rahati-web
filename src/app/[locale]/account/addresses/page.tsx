import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { authGetList } from "@/lib/account";
import { ConfirmActionButton } from "@/components/account/ConfirmActionButton";

interface Address {
  id?: string | number;
  address?: string;
  address_label?: string;
  address_type?: string;
  contact_person_name?: string;
  contact_person_number?: string;
}

export default async function AddressesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const addresses = await authGetList<Address>(
    "/api/v1/customer/address?limit=50&offset=1",
    locale
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{a.addresses}</h1>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted">{a.noAddresses}</p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((ad, i) => (
            <li
              key={ad.id ?? i}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {ad.address_label && (
                    <span className="inline-block rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                      {ad.address_label}
                    </span>
                  )}
                  <p className="mt-2 text-sm text-ink">{ad.address}</p>
                  {(ad.contact_person_name || ad.contact_person_number) && (
                    <p className="mt-1 text-xs text-muted">
                      {[ad.contact_person_name, ad.contact_person_number]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {ad.id != null && (
                  <ConfirmActionButton
                    endpoint="/api/address/delete"
                    body={{ id: ad.id, locale }}
                    tone="danger"
                    labels={{
                      action: a.remove,
                      confirm: a.confirmDelete,
                      cancel: a.keep,
                      processing: a.cancelling,
                      error: a.deleteError,
                    }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">{a.addressAddHint}</p>
    </div>
  );
}
