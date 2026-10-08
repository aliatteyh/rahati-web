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
    { href: `${base}/about-us`, label: dict.footer.aboutUs },
    { href: `${base}/terms-and-conditions`, label: dict.footer.terms },
    { href: `${base}/privacy-policy`, label: dict.footer.privacy },
    { href: `${base}/cancellation-policy`, label: dict.footer.cancellation },
    { href: `${base}/refund-policy`, label: dict.footer.refund },
  ];

  // The design closes on ink, not on a pale band: the page's last block is the one
  // that should feel like the end of it. Everything inside flips to the
  // light-on-dark pairing the design uses for its dark sections.
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto grid w-full max-w-page gap-10 px-[clamp(20px,4vw,48px)] py-[clamp(48px,6vw,80px)] sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand} className="h-9 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-green text-base font-bold text-white">
                {brand.charAt(0)}
              </span>
            )}
            {(config.show_business_name === true || !logo) && (
              <span className="text-[19px] font-semibold text-white">{brand}</span>
            )}
          </div>
          <p className="mt-3 max-w-xs text-[14px] leading-[1.8] text-white/60">{dict.footer.tagline}</p>
          <h3 className="mt-6 text-[13px] font-semibold tracking-[0.06em] text-white">
            {dict.footer.newsletter}
          </h3>
          <p className="mt-1 max-w-xs text-[14px] leading-[1.8] text-white/60">
            {dict.footer.newsletterSub}
          </p>
          <NewsletterForm dict={dict.footer as unknown as Record<string, string>} />
        </div>

        <div>
          <h3 className="mb-3 text-[13px] font-semibold tracking-[0.06em] text-white">
            {dict.footer.quickLinks}
          </h3>
          <ul className="space-y-2 text-[14px] leading-[1.8] text-white/60">
            <li>
              <Link href={base} className="transition hover:text-mint">
                {dict.nav.home}
              </Link>
            </li>
            <li>
              <Link href={`${base}/services`} className="transition hover:text-mint">
                {dict.nav.services}
              </Link>
            </li>
            <li>
              <Link href={`${base}#how-it-works`} className="transition hover:text-mint">
                {dict.nav.howItWorks}
              </Link>
            </li>
          </ul>
        </div>

        {policies.length > 0 && (
          <div>
            <h3 className="mb-3 text-[13px] font-semibold tracking-[0.06em] text-white">{dict.footer.policies}</h3>
            <ul className="space-y-2 text-[14px] leading-[1.8] text-white/60">
              {policies.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="transition hover:text-mint">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-[14px] leading-[1.8] text-white/60">
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

      <div className="border-t border-white/10 py-5 text-center text-[13px] text-white/50">
        {/* The line itself is written in Business Settings → Footer text, so it
            can name the legal entity, or a holding company, or say nothing at
            all. Only the year is ours to compute; the wording is the owner's,
            and the built-in sentence is what shows if they have written none. */}
        © {year} {config.footer_text?.trim() || `${brand}. ${dict.footer.rights}`}
      </div>
    </footer>
  );
}
