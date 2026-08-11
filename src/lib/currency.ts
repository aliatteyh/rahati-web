import type { Locale } from "@/i18n/config";
import type { BusinessConfig } from "@/lib/types";
import { intlLocale } from "./intl";

/**
 * The currency label to show, in the language the customer is reading.
 *
 * The admin stores one symbol (`د.إ`), which is correct in Arabic and looks
 * like a mistake in English — an English page reading "د.إ 150" makes the
 * customer stop and work out what they are being charged.
 *
 * The rate is still admin-driven: `currency_code` is the setting, and Intl
 * turns it into whatever that locale conventionally writes. Change the code to
 * SAR and both languages follow with no edit here.
 */
export function currencyLabel(
  config: Pick<BusinessConfig, "currency_code" | "currency_symbol">,
  locale: Locale
): string {
  const code = String(config.currency_code ?? "").trim();

  if (code) {
    try {
      const part = new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency");

      if (part?.value) {
        return part.value;
      }
    } catch {
      // An unrecognised code throws rather than returning anything usable, so
      // fall through to the admin's own symbol rather than showing nothing.
    }
  }

  return String(config.currency_symbol ?? "") || code;
}

/**
 * A price with its currency, for display.
 *
 * Lives here rather than in `api.ts` so client components can use it: `api.ts`
 * reads cookies, which cannot cross into the browser bundle.
 */

/**
 * A number, formatted the same way on the server and in the browser.
 *
 * `toLocaleString("ar")` is not one answer but two: Node renders 70 and the
 * browser renders ٧٠, so every price on an Arabic page arrived as a hydration
 * mismatch and React threw the tree away and re-rendered it. Pinning both the
 * locale and the numbering system removes the disagreement — and Latin digits
 * are what UAE storefronts price in anyway, Arabic page or not.
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return value.toLocaleString(intlLocale(locale), options);
}

export function formatPrice(
  value: number | string | undefined | null,
  currency: string
): string | null {
  if (value === undefined || value === null || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  const rounded = Number.isInteger(num) ? num : Math.round(num * 100) / 100;
  // Fixed locale for the same reason formatNumber pins one: the runtime
  // default differs between Node and the browser.
  return `${currency} ${rounded.toLocaleString("en-US")}`;
}
