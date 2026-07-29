import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BusinessConfig } from "@/lib/types";

export function SiteFooter({
  locale,
  dict,
  config,
}: {
  locale: Locale;
  dict: Dictionary;
  config: BusinessConfig;
}) {
  const base = `/${locale}`;
  const brand = config.business_name || dict.brand;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border bg-surface-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
              {brand.charAt(0)}
            </span>
            <span className="text-lg font-bold text-ink">{brand}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">{dict.footer.tagline}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">
            {dict.footer.quickLinks}
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href={base} className="hover:text-primary">
                {dict.nav.home}
              </Link>
            </li>
            <li>
              <Link href={`${base}/services`} className="hover:text-primary">
                {dict.nav.services}
              </Link>
            </li>
            <li>
              <Link href={`${base}#how-it-works`} className="hover:text-primary">
                {dict.nav.howItWorks}
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm text-muted">
          {config.business_email && <p>{config.business_email}</p>}
          {config.business_phone && <p className="mt-1">{config.business_phone}</p>}
          {config.business_address && (
            <p className="mt-1">{config.business_address}</p>
          )}
        </div>
      </div>

      <div className="border-t border-border py-5 text-center text-sm text-muted">
        © {year} {brand}. {dict.footer.rights}
      </div>
    </footer>
  );
}
