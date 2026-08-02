import type { Locale } from "@/i18n/config";
import type { BusinessConfig } from "@/lib/types";

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
      const part = new Intl.NumberFormat(locale, { style: "currency", currency: code })
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
