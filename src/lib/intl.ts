/**
 * The locale tag to hand to `Intl`, for every number and date on the site.
 *
 * Plain `"ar"` renders digits as ٠١٢٣٤٥٦٧٨٩. Two things go wrong with that.
 * The first is a rule: prices and dates here are read in Latin digits, on the
 * Arabic pages as much as the English ones — that is how UAE storefronts print
 * them. The second is a defect: Node and the browser disagree about what `"ar"`
 * means, so the server sent "70" and the browser rendered "٧٠", and React threw
 * away every tree containing a price and rebuilt it.
 *
 * Pinning the numbering system fixes both at once, and it belongs in one place
 * so a new `Intl` call cannot quietly reintroduce either problem.
 */
export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-AE-u-nu-latn" : "en-US";
}
