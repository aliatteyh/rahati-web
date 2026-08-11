import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BusinessConfig } from "@/lib/types";
import { NewsletterForm } from "./NewsletterForm";
import { SocialLinks } from "./SocialLinks";
import { uploadedImage } from "@/lib/branding";

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
  const logo = uploadedImage(config.logo_full_path);

  // The policy pages are served by the admin panel and their URLs come back
  // with the rest of the configuration, so the footer never hardcodes a path
  // that a rename would break. Anything the API leaves out simply is not
  // listed — an empty policy link is worse than a missing one.
  const policies = [
    { href: config.about_us, label: dict.footer.aboutUs },
    { href: config.terms_and_conditions, label: dict.footer.terms },
    { href: config.privacy_policy, label: dict.footer.privacy },
    { href: config.cancellation_policy, label: dict.footer.cancellation },
    { href: config.refund_policy, label: dict.footer.refund },
  ].filter((p): p is { href: string; label: string } => Boolean(p.href));

  return (
    <footer className="mt-20 border-t border-border bg-surface-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand} className="h-9 w-auto max-w-[10rem] object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-bold text-white">
                {brand.charAt(0)}
              </span>
            )}
            <span className="text-lg font-bold text-ink">{brand}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">{dict.footer.tagline}</p>
          <h3 className="mt-6 text-sm font-semibold text-ink">
            {dict.footer.newsletter}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-muted">
            {dict.footer.newsletterSub}
          </p>
          <NewsletterForm dict={dict.footer as unknown as Record<string, string>} />
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

        {policies.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">{dict.footer.policies}</h3>
            <ul className="space-y-2 text-sm text-muted">
              {policies.map((p) => (
                <li key={p.href}>
                  {/* These pages live on the admin panel's domain, so they are
                      plain anchors: Link would try to route them internally. */}
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary"
                  >
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-sm text-muted">
          {config.business_email && <p>{config.business_email}</p>}
          {config.business_phone && <p className="mt-1">{config.business_phone}</p>}
          {config.business_address && (
            <p className="mt-1">{config.business_address}</p>
          )}

          {/* Beside the address and phone, because they answer the same
              question: is this a real business I can find? */}
          <div className="mt-5">
            <SocialLinks links={config.social_media} label={dict.footer.followUs} />
          </div>
        </div>
      </div>

      <div className="border-t border-border py-5 text-center text-sm text-muted">
        {/* The line itself is written in Business Settings → Footer text, so it
            can name the legal entity, or a holding company, or say nothing at
            all. Only the year is ours to compute; the wording is the owner's,
            and the built-in sentence is what shows if they have written none. */}
        © {year} {config.footer_text?.trim() || `${brand}. ${dict.footer.rights}`}
      </div>
    </footer>
  );
}
