import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo";
import { getConfig } from "@/lib/api";

/**
 * How to close a Rahati account, and what closing one actually does.
 *
 * Google Play requires a page like this — reachable on the web, without
 * installing the app — for any app that lets a person create an account, and
 * its URL is part of the Data safety declaration. It is also simply the honest
 * place to answer the question.
 *
 * Every claim below is what `CustomerController::removeAccount` does: the two
 * conditions that refuse a deletion, the fields that are overwritten, and the
 * row that survives because invoices point at it. If that method changes, this
 * page changes with it.
 */

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const d = getDictionary(loc).deleteAccount as unknown as Record<string, string>;
  return {
    title: d.title,
    description: d.intro,
    alternates: alternatesFor(loc, "/delete-account"),
  };
}

export default async function Page({ params }: { params: Params }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  const d = dict.deleteAccount as unknown as Record<string, string | string[]>;
  const config = await getConfig(loc);

  const text = (key: string) => d[key] as string;
  const list = (key: string) => (d[key] as string[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/${loc}`} className="text-sm text-primary">
        ← {dict.nav.home}
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink">{text("title")}</h1>
      <p className="mt-3 text-muted">{text("intro")}</p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">{text("inAppTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{text("inAppText")}</p>
        <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-ink">
          {list("inAppSteps").map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">{text("byEmailTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{text("byEmailText")}</p>
        <div className="mt-4 space-y-3 text-sm">
          {config.business_email && (
            <a
              href={`mailto:${config.business_email}?subject=${encodeURIComponent(text("emailSubject"))}`}
              className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition hover:border-primary"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light text-lg">✉️</span>
              <span>
                <span className="block text-xs text-muted">{text("emailUs")}</span>
                <span dir="ltr" className="font-semibold text-ink">{config.business_email}</span>
              </span>
            </a>
          )}
          {config.business_phone && (
            <a
              href={`tel:${config.business_phone}`}
              className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition hover:border-primary"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light text-lg">📞</span>
              <span>
                <span className="block text-xs text-muted">{text("callUs")}</span>
                <span dir="ltr" className="font-semibold text-ink">{config.business_phone}</span>
              </span>
            </a>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-ink">{text("beforeTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{text("beforeText")}</p>
        <ul className="mt-4 list-disc space-y-2 ps-5 text-sm text-ink">
          {list("beforeItems").map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-ink">{text("removedTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-ink">
            {list("removedItems").map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-ink">{text("keptTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-ink">
            {list("keptItems").map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{text("keptNote")}</p>
        </section>
      </div>

      <p className="mt-8 text-sm text-muted">
        {text("privacyNote")}{" "}
        <Link href={`/${loc}/privacy-policy`} className="text-primary underline">
          {dict.footer.privacy}
        </Link>
      </p>
    </div>
  );
}
