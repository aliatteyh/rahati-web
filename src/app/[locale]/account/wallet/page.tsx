import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getConfig, formatPrice } from "@/lib/api";
import { currencyLabel } from "@/lib/currency";
import { authGet } from "@/lib/account";
import { ConfirmActionButton } from "@/components/account/ConfirmActionButton";

interface Trx {
  id?: string;
  credit?: number | string;
  debit?: number | string;
  balance?: number | string;
  trx_type?: string;
  transaction_type?: string;
  reference?: string;
  created_at?: string;
}

interface WalletData {
  wallet_balance?: number | string;
  transactions?: { data?: Trx[] } | Trx[];
}

interface LoyaltyData {
  loyalty_point?: number | string;
  loyalty_point_value_per_currency_unit?: number | string;
  min_loyalty_point_to_transfer?: number | string;
  transactions?: { data?: Trx[] } | Trx[];
}

function rows(t?: { data?: Trx[] } | Trx[]): Trx[] {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  return t.data ?? [];
}

function prettyType(t?: string): string {
  if (!t) return "";
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TrxList({
  items,
  currency,
  unit,
  empty,
}: {
  items: Trx[];
  currency: string;
  /** "money" renders currency, "point" renders a bare number */
  unit: "money" | "point";
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((t, i) => {
        const credit = Number(t.credit ?? 0);
        const debit = Number(t.debit ?? 0);
        const isCredit = credit >= debit;
        const value = isCredit ? credit : debit;
        const shown =
          unit === "money" ? formatPrice(value, currency) ?? String(value) : String(value);
        return (
          <li key={t.id ?? i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {prettyType(t.trx_type ?? t.transaction_type) || t.reference || "—"}
              </p>
              {t.created_at && (
                <p className="mt-0.5 text-xs text-muted">{t.created_at.slice(0, 10)}</p>
              )}
            </div>
            <div
              className={`shrink-0 text-sm font-semibold ${
                isCredit ? "text-primary-dark" : "text-accent-dark"
              }`}
            >
              {isCredit ? "+" : "−"}
              {shown}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function WalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = getDictionary(locale);
  const a = dict.account as unknown as Record<string, string>;

  const config = await getConfig(locale);
  const currency = currencyLabel(config, locale);
  const walletOn = Number(config.wallet_status) === 1;
  const loyaltyOn = Number(config.loyalty_point_status) === 1;

  const [wallet, loyalty] = await Promise.all([
    walletOn
      ? authGet<WalletData>(
          "/api/v1/customer/wallet-transaction?limit=50&offset=1",
          locale,
          {}
        )
      : Promise.resolve({} as WalletData),
    loyaltyOn
      ? authGet<LoyaltyData>(
          "/api/v1/customer/loyalty-point-transaction?limit=50&offset=1",
          locale,
          {}
        )
      : Promise.resolve({} as LoyaltyData),
  ]);

  const points = Number(loyalty.loyalty_point ?? 0);
  const unitValue = Number(loyalty.loyalty_point_value_per_currency_unit ?? 0);
  const pointsWorth = unitValue > 0 ? points * unitValue : null;
  const minTransfer = Number(loyalty.min_loyalty_point_to_transfer ?? 0);
  const canTransfer = points > 0 && points >= minTransfer;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink">{a.walletTitle}</h1>

      {!walletOn && !loyaltyOn && (
        <p className="text-sm text-muted">{a.walletUnavailable}</p>
      )}

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {walletOn && (
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-light/50 to-surface p-5">
            <p className="text-sm text-muted">{a.walletBalance}</p>
            <p className="mt-1 text-3xl font-bold text-primary-dark">
              {formatPrice(wallet.wallet_balance ?? 0, currency) ??
                `${wallet.wallet_balance ?? 0} ${currency}`}
            </p>
          </div>
        )}
        {loyaltyOn && (
          <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/15 to-surface p-5">
            <p className="text-sm text-muted">{a.loyaltyPoints}</p>
            <p className="mt-1 text-3xl font-bold text-accent-dark">
              {points}{" "}
              <span className="text-base font-medium text-muted">{a.points}</span>
            </p>
            {pointsWorth != null && pointsWorth > 0 && (
              <p className="mt-1 text-xs text-muted">
                ≈ {formatPrice(pointsWorth, currency)}
              </p>
            )}
            {canTransfer && (
              <div className="mt-3">
                <ConfirmActionButton
                  endpoint="/api/wallet/transfer"
                  body={{ point: points, locale }}
                  labels={{
                    action: a.transferToWallet,
                    confirm: a.confirmTransfer,
                    cancel: a.cancel,
                    processing: a.processing,
                    error: a.transferError,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wallet history */}
      {walletOn && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            {a.walletBalance} — {a.transactionHistory}
          </h2>
          <TrxList
            items={rows(wallet.transactions)}
            currency={currency}
            unit="money"
            empty={a.noTransactions}
          />
        </section>
      )}

      {/* Loyalty history */}
      {loyaltyOn && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            {a.loyaltyPoints} — {a.transactionHistory}
          </h2>
          <TrxList
            items={rows(loyalty.transactions)}
            currency={currency}
            unit="point"
            empty={a.noTransactions}
          />
        </section>
      )}
    </div>
  );
}
