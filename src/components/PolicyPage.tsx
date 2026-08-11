import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPolicyPage } from "@/lib/api";

/**
 * One of the five policy pages, served under the storefront's own domain.
 *
 * The words come from Business Settings, so the legal text is edited where
 * every other piece of copy is edited and this file never needs touching. It is
 * rendered as HTML because that is what the admin's editor produces — admin
 * content, not user input.
 *
 * The customer used to be sent to admin.rahatics.com to read these, which is
 * the administration domain: a strange place to land from a footer link, and a
 * stranger one for a legal document to cite as its own address.
 */
export async function PolicyPage({
  locale,
  settingKey,
  title,
}: {
  locale: Locale;
  settingKey: string;
  title: string;
}) {
  const dict = getDictionary(locale);
  const body = await getPolicyPage(settingKey, locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/${locale}`} className="text-sm text-primary">
        ← {dict.nav.home}
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink">{title}</h1>

      <div className="policy mt-6 rounded-2xl border border-border bg-surface p-6">
        {body ? (
          <div dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <p className="text-muted">{dict.account?.loadError ?? ""}</p>
        )}
      </div>
    </div>
  );
}
